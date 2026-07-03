const { pool } = require('../config/database');
const { getStudentHandles } = require('../db/codingHandles');
const { normalizePlatform } = require('../utils/platformUtils');
const { createSyncLog, finishSyncLog } = require('../db/syncLogs');
const leetcodeService = require('./leetcodeService');
const leetcodeGraphqlService = require('./leetcodeGraphql.service');
const leetcodeScraper = require('../playwright/leetcodeScraper');
const codechefService = require('./codechefService');
const githubService = require('./githubService');
const hackerrankService = require('./hackerrankService');

const PLATFORM_SERVICES = {
  leetcode: leetcodeService.fetchProfile,
  codechef: codechefService.fetchProfile,
  github: githubService.fetchProfile,
  hackerrank: hackerrankService.fetchProfile,
};

const safeString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text || null;
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
};

const safeInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const safeObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return null;
};

const resolvePersistedUsername = ({ platform, inputUsername, fallbackUsername }) => {
  const normalizedInput = safeString(inputUsername);
  if (normalizedInput) return normalizedInput;

  const normalizedFallback = safeString(fallbackUsername);
  if (platform === 'hackerrank' && normalizedFallback) return normalizedFallback;
  return normalizedFallback;
};

const toJsonbParam = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    return null;
  }
};

const saveCodingHandle = async (client, { studentId, platform, handle, profileUrl = null, metadata = {} }) => {
  if (!studentId || !platform || !handle) return null;
  const query = `
    INSERT INTO coding_handles (student_id, platform, handle, profile_url, metadata, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (student_id, platform) DO UPDATE SET
      handle = EXCLUDED.handle,
      profile_url = COALESCE(EXCLUDED.profile_url, coding_handles.profile_url),
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *`;
  const params = [studentId, platform, handle, profileUrl, metadata];
  const result = await client.query(query, params);
  return result.rows?.[0] || null;
};

const savePlatformProfile = async (client, { studentId, codingHandleId = null, platform, username, profileUrl = null, rawData = {}, stats = {}, tags = [], lastFetchedAt = null }) => {
  if (!studentId || !platform || !username) return null;
  const query = `
    INSERT INTO platform_profiles (
      student_id, coding_handle_id, platform, username, profile_url, raw_data, stats, tags, last_fetched_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (student_id, platform, username) DO UPDATE SET
      coding_handle_id = COALESCE(EXCLUDED.coding_handle_id, platform_profiles.coding_handle_id),
      profile_url = COALESCE(EXCLUDED.profile_url, platform_profiles.profile_url),
      raw_data = EXCLUDED.raw_data,
      stats = EXCLUDED.stats,
      tags = EXCLUDED.tags,
      last_fetched_at = EXCLUDED.last_fetched_at,
      updated_at = NOW()
    RETURNING *`;
  const params = [studentId, codingHandleId, platform, username, profileUrl, toJsonbParam(rawData), toJsonbParam(stats), Array.isArray(tags) && tags.length ? tags : null, lastFetchedAt];
  const result = await client.query(query, params);
  return result.rows?.[0] || null;
};

const saveRatingHistory = async (client, { studentId, platform, rating, recordedAt = null, context = {} }) => {
  if (!studentId || !platform || rating === null || rating === undefined) {
    console.warn('[codingSyncService] saveRatingHistory skipped missing input', { studentId, platform, rating });
    return null;
  }
  const timestamp = recordedAt ? new Date(recordedAt) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    console.warn('[codingSyncService] saveRatingHistory skipped invalid recordedAt', { studentId, platform, recordedAt });
    return null;
  }
  const checkQuery = `
    SELECT 1 FROM rating_history
    WHERE student_id = $1 AND platform = $2 AND recorded_at = $3
    LIMIT 1`;
  const checkParams = [studentId, platform, timestamp];

  console.log('[codingSyncService] saveRatingHistory check existing', { studentId, platform, recordedAt: timestamp });
  const existing = await client.query(checkQuery, checkParams);
  if (existing.rows?.length) {
    console.log('[codingSyncService] saveRatingHistory already exists', { studentId, platform, recordedAt: timestamp });
    return existing.rows[0];
  }

  const insertQuery = `
    INSERT INTO rating_history (student_id, platform, rating, recorded_at, context, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *`;
  const params = [studentId, platform, rating, timestamp, context];
  console.log('[codingSyncService] saveRatingHistory insert', { studentId, platform, rating, recordedAt: timestamp, context });
  const result = await client.query(insertQuery, params);
  if (!result.rows?.length) {
    console.warn('[codingSyncService] saveRatingHistory no rows inserted', { studentId, platform, rating, recordedAt: timestamp });
  } else {
    console.log('[codingSyncService] saveRatingHistory inserted', { studentId, platform, rating, recordedAt: timestamp, rowId: result.rows[0].id });
  }
  return result.rows?.[0] || null;
};

const saveProblemHistory = async (client, { studentId, platform, problemId, problemName = null, difficulty = null, solvedAt = null, attemptData = {}, source = null, details = {} }) => {
  if (!studentId || !platform || !problemId) {
    console.warn('[codingSyncService] saveProblemHistory skipped missing input', { studentId, platform, problemId });
    return null;
  }
  const solvedTimestamp = solvedAt ? new Date(solvedAt) : null;
  const solvedValue = solvedTimestamp && !Number.isNaN(solvedTimestamp.getTime()) ? solvedTimestamp : null;
  const query = `
    INSERT INTO problem_history (
      student_id, platform, problem_id, problem_name, difficulty, solved_at, attempt_data, source, details, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (student_id, platform, problem_id) DO UPDATE SET
      problem_name = EXCLUDED.problem_name,
      difficulty = EXCLUDED.difficulty,
      solved_at = EXCLUDED.solved_at,
      attempt_data = EXCLUDED.attempt_data,
      source = EXCLUDED.source,
      details = EXCLUDED.details,
      updated_at = NOW()
    RETURNING *`;
  const params = [studentId, platform, problemId, problemName, difficulty, solvedValue, attemptData, source, details];
  console.log('[codingSyncService] saveProblemHistory query', { studentId, platform, problemId, problemName, difficulty, solvedAt: solvedValue, source, details });
  const result = await client.query(query, params);
  if (!result.rows?.length) {
    console.warn('[codingSyncService] saveProblemHistory no rows inserted', { studentId, platform, problemId });
  } else {
    console.log('[codingSyncService] saveProblemHistory inserted', { studentId, platform, problemId, rowId: result.rows[0].id });
  }
  return result.rows?.[0] || null;
};

const createHandleMetadata = (platform, data) => ({
  lastSyncedAt: new Date().toISOString(),
  platform,
  profileStatus: safeString(data?.profileStatus),
  rating: safeInteger(data?.rating),
  rank: safeInteger(data?.rank),
  problemsSolved: safeInteger(data?.problemsSolved),
  contestCount: safeInteger(data?.contestCount),
  source: 'sync',
});

const buildPlatformProfileStats = (platform, data, graphqlData) => {
  const baseStats = {
    username: safeString(data?.username),
    profileUrl: safeString(data?.profileUrl),
    rating: safeInteger(data?.rating),
    maxRating: safeInteger(data?.max_rating),
    currentRating: safeInteger(data?.currentRating || data?.rating),
    problemsSolved: safeInteger(data?.problemsSolved),
    globalRank: safeInteger(data?.rank),
    countryRank: safeInteger(data?.countryRank),
    contestCount: safeInteger(data?.contestCount),
    reputation: safeInteger(data?.reputation),
    profileStatus: safeString(data?.profileStatus),
    lastSyncedAt: new Date().toISOString(),
  };

  if (platform === 'leetcode' && graphqlData) {
    baseStats.topics = graphqlData?.topics || [];
    baseStats.solved = graphqlData?.solved || {};
    baseStats.currentStreak = safeInteger(graphqlData?.profile?.currentStreak);
    baseStats.maxStreak = safeInteger(graphqlData?.profile?.maxStreak);
    baseStats.reputation = baseStats.reputation || safeInteger(graphqlData?.profile?.reputation);
    baseStats.globalRank = baseStats.globalRank || safeInteger(graphqlData?.profile?.ranking);
  }

  return baseStats;
};

const buildPlatformProfileTags = (platform, data, graphqlData) => {
  const tags = [];
  if (platform === 'leetcode') {
    tags.push(...safeArray(graphqlData?.topics).map((topic) => topic?.name).filter(Boolean));
    tags.push(...safeArray(data?.badges).map((badge) => badge?.name || badge).filter(Boolean));
  } else {
    tags.push(...safeArray(data?.badges).map((badge) => badge?.name || badge).filter(Boolean));
  }
  return tags.filter(Boolean);
};

const createSyncLogEntry = async ({ studentId, platform, operation = 'profile_sync', status = 'started', message = null, response = {} }) => {
  try {
    return await createSyncLog({
      student_id: studentId,
      platform,
      operation,
      status,
      message,
      response,
    });
  } catch (error) {
    console.warn('[codingSyncService] Failed to create sync log:', error?.message || error);
    return null;
  }
};

const updateSyncLogEntry = async (id, { status = 'success', message = null, response = {} } = {}) => {
  if (!id) return null;
  try {
    return await finishSyncLog(id, { status, message, response });
  } catch (error) {
    console.warn('[codingSyncService] Failed to finish sync log:', error?.message || error);
    return null;
  }
};

const getCodingProfilesAsHandles = async (studentId) => {
  if (!studentId) return [];
  const result = await pool.query(
    'SELECT platform, username FROM coding_profiles WHERE student_id = $1 AND username IS NOT NULL',
    [studentId]
  );
  return (result.rows || [])
    .map((row) => ({ platform: row.platform, handle: safeString(row.username) }))
    .filter((entry) => entry.platform && entry.handle);
};

const mergeHandles = (existingHandles, profileHandles) => {
  const seen = new Set();
  const merged = [];
  for (const handle of existingHandles) {
    const normalizedPlatform = normalizePlatform(handle?.platform);
    const resolvedHandle = safeString(handle?.handle);
    if (!normalizedPlatform || !resolvedHandle) continue;
    const key = `${normalizedPlatform}:${resolvedHandle}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ platform: normalizedPlatform, handle: resolvedHandle, original: handle });
    }
  }
  for (const handle of profileHandles) {
    const normalizedPlatform = normalizePlatform(handle?.platform);
    const resolvedHandle = safeString(handle?.handle);
    if (!normalizedPlatform || !resolvedHandle) continue;
    const key = `${normalizedPlatform}:${resolvedHandle}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ platform: normalizedPlatform, handle: resolvedHandle, original: handle });
    }
  }
  return merged;
};

const ensureCodingTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS coding_profiles (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100) NOT NULL,
      username VARCHAR(255),
      display_name TEXT,
      profile_url TEXT,
      avatar_url TEXT,
      country VARCHAR(100),
      reputation INTEGER,
      rating INTEGER,
      current_rating INTEGER,
      max_rating INTEGER,
      problems_solved INTEGER DEFAULT 0,
      easy_solved INTEGER,
      medium_solved INTEGER,
      hard_solved INTEGER,
      total_problems INTEGER DEFAULT 0,
      total_solved INTEGER,
      contest_count INTEGER,
      contests_attended INTEGER,
      contest_rating INTEGER,
      top_percentage NUMERIC,
      badges_count INTEGER,
      stars_count INTEGER,
      global_rank INTEGER,
      country_rank INTEGER,
      stars_badges VARCHAR(255),
      coding_score INTEGER,
      last_activity_date DATE,
      activity_calendar JSONB,
      recent_submissions JSONB,
      last_sync_date DATE,
      inactive_days INTEGER,
      active_days INTEGER,
      activity_status VARCHAR(50),
      current_streak INTEGER,
      max_streak INTEGER,
      topic_statistics JSONB,
      profile_status VARCHAR(50),
      last_sync TIMESTAMP,
      estimated_score INTEGER,
      last_updated_date DATE,
      data_verification_status VARCHAR(50) DEFAULT 'unverified',
      estimated_skill_level VARCHAR(50),
      estimated_progress_score INTEGER,
      badges_analysis TEXT,
      achievements_analysis TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (student_id, platform)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS coding_statistics (
      id SERIAL PRIMARY KEY,
      coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100),
      rating INTEGER,
      max_rating INTEGER,
      problems_solved INTEGER,
      contest_count INTEGER,
      global_rank INTEGER,
      country_rank INTEGER,
      reputation INTEGER,
      stars_badges VARCHAR(255),
      recorded_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS coding_profile_history (
      id SERIAL PRIMARY KEY,
      coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100),
      rating INTEGER,
      max_rating INTEGER,
      problems_solved INTEGER,
      global_rank INTEGER,
      country_rank INTEGER,
      stars_badges VARCHAR(255),
      recorded_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contest_history (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100),
      contest_name TEXT,
      contest_date DATE,
      rank INTEGER,
      rating_before INTEGER,
      rating_after INTEGER,
      rating_change INTEGER,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS rating_history (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100),
      rating INTEGER,
      recorded_at TIMESTAMP NOT NULL,
      context JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS problem_history (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100),
      problem_id TEXT,
      problem_name TEXT,
      difficulty VARCHAR(50),
      solved_at TIMESTAMP,
      attempt_data JSONB DEFAULT '{}'::jsonb,
      source VARCHAR(100),
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS recent_questions (
      id SERIAL PRIMARY KEY,
      coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      platform VARCHAR(100),
      question_name VARCHAR(255),
      difficulty VARCHAR(50),
      question_url TEXT,
      date_solved DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_questions_profile_question
    ON recent_questions (coding_profile_id, student_id, platform, question_name, question_url)
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_profiles_student_platform
    ON coding_profiles (student_id, platform)
  `);

  await client.query(`
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100);
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS total_solved INTEGER;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS contests_attended INTEGER;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS top_percentage NUMERIC;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS activity_calendar JSONB;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS recent_submissions JSONB;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS topic_statistics JSONB;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS total_active_days INTEGER;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER;
    ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS max_streak INTEGER;
  `);

  await client.query(`
    DO $$
    BEGIN
      DELETE FROM coding_profiles
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY student_id, LOWER(platform) ORDER BY COALESCE(last_sync, updated_at, created_at) DESC, id DESC) AS rn
          FROM coding_profiles
          WHERE platform IS NOT NULL
        ) AS ranked
        WHERE rn > 1
      );
      UPDATE coding_profiles SET platform = LOWER(platform) WHERE platform IS NOT NULL;
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_coding_profiles_student_platform_lower'
      ) THEN
        CREATE UNIQUE INDEX idx_coding_profiles_student_platform_lower ON coding_profiles (student_id, LOWER(platform));
      END IF;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END $$;
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_history_student_platform_contest
    ON contest_history (student_id, platform, contest_name, contest_date)
  `);
};

const withTransaction = async (callback, advisoryLockId = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (advisoryLockId !== null && advisoryLockId !== undefined) {
      await client.query('SELECT pg_advisory_xact_lock($1)', [advisoryLockId]);
    }
    await ensureCodingTables(client);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const persistRecentQuestions = async (client, { profileId, studentId, platform, recentQuestions }) => {
  if (!profileId || !studentId || !platform || !Array.isArray(recentQuestions)) {
    return;
  }

  await client.query(
    'DELETE FROM recent_questions WHERE student_id = $1 AND platform = $2 AND coding_profile_id = $3',
    [studentId, platform, profileId]
  );

  if (recentQuestions.length === 0) {
    return;
  }

  for (const question of recentQuestions) {
    const questionName = safeString(question.title || question.question_name);
    const questionUrl = safeString(question.question_url || question.url)
      || (safeString(question.slug) ? `https://leetcode.com/problems/${encodeURIComponent(question.slug)}/` : null);
    const difficulty = safeString(question.difficulty || question.level) || null;
    const solvedAt = question.timestamp ? new Date(question.timestamp) : question.date_solved ? new Date(question.date_solved) : null;
    const dateSolved = solvedAt && !Number.isNaN(solvedAt.getTime()) ? solvedAt.toISOString().slice(0, 10) : null;

    if (!questionName && !questionUrl) {
      console.warn('[codingSyncService] persistRecentQuestions skipped question because missing name/url', {
        profileId,
        studentId,
        platform,
        question,
      });
      continue;
    }

    await client.query(
      `INSERT INTO recent_questions (
         coding_profile_id, student_id, platform, question_name, difficulty, question_url, date_solved, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (coding_profile_id, student_id, platform, question_name, question_url) DO NOTHING`,
      [profileId, studentId, platform, questionName, difficulty, questionUrl, dateSolved]
    );
  }
};

const persistProfileAndContests = async (client, { studentId, platform, data, inputUsername = null }) => {
  const username = resolvePersistedUsername({
    platform,
    inputUsername,
    fallbackUsername: safeString(data?.username) || safeString(data?.handle),
  });
  const profileStatus = safeString(data?.profileStatus) || 'failed';

  console.log('[codingSyncService] persistProfileAndContests start', {
    studentId,
    platform,
    username,
    profileStatus,
    success: data?.success !== false,
  });

  if (data?.success === false) {
    console.warn('[codingSyncService] Skipping persistence because scraper did not return a successful profile', {
      studentId,
      platform,
      username,
      error: data?.error,
    });
    return 0;
  }

  let leetCodeGraphqlData = data?._graphql || null;
  if (platform === 'leetcode' && username) {
    if (leetCodeGraphqlData) {
      console.log('[codingSyncService] using cached LeetCode GraphQL profile from fetched data', { username, hasGraphqlData: true });
    } else {
      try {
        console.log('[codingSyncService] fetching LeetCode GraphQL profile', { username });
        leetCodeGraphqlData = await leetcodeGraphqlService.fetchLeetCodeProfile(username);
        console.log('[codingSyncService] LeetCode GraphQL profile fetched', {
          username,
          hasGraphqlData: !!leetCodeGraphqlData,
          recentQuestionsLength: safeArray(leetCodeGraphqlData?.recentQuestions).length,
          currentRating: safeInteger(leetCodeGraphqlData?.profile?.currentRating),
        });
      } catch (error) {
        console.warn(`[codingSyncService] LeetCode GraphQL enrichment failed for ${username}:`, error?.message || error);
      }
    }
  } else {
    if (platform === 'leetcode') {
      console.warn('[codingSyncService] LeetCode GraphQL skipped because username is missing', { studentId, platform, username });
    }
  }

  const rawBadges = safeArray(data?.badges);
  const rawContests = safeArray(data?.contests);
  const rawRecentProblems = safeArray(data?.recentProblems);
  // prefer GraphQL topics, but fall back to Playwright scraper if missing
  let graphqlTopics = safeArray(leetCodeGraphqlData?.topics);
  try {
    if (platform === 'leetcode' && username && (!graphqlTopics.length || !leetCodeGraphqlData?.topicStatistics)) {
      console.log('[codingSyncService] attempting Playwright fallback for topics', { username });
      const scraperProfile = await leetcodeScraper.fetchLeetCodeProfile(username);
      if (scraperProfile) {
        if (!graphqlTopics.length && Array.isArray(scraperProfile?.topics) && scraperProfile.topics.length) {
          graphqlTopics = safeArray(scraperProfile.topics);
        }
        if (!leetCodeGraphqlData?.topicStatistics && scraperProfile?.topicStatistics) {
          leetCodeGraphqlData = { ...(leetCodeGraphqlData || {}), topicStatistics: scraperProfile.topicStatistics };
        }
      }
    }
  } catch (err) {
    console.warn('[codingSyncService] Playwright fallback for topics failed', { username, message: err?.message });
  }
  const graphqlRecentQuestions = safeArray(leetCodeGraphqlData?.recentQuestions);
  const graphqlRatingHistory = safeArray(leetCodeGraphqlData?.ratingHistory);

  const profileUrl = safeString(data?.profileUrl)
    || (platform === 'leetcode' && username ? `https://leetcode.com/${encodeURIComponent(username)}/` : null)
    || (platform === 'hackerrank' && username ? `https://www.hackerrank.com/profile/${encodeURIComponent(username)}` : null);
  const avatarUrl = safeString(data?.avatarUrl) || safeString(leetCodeGraphqlData?.profile?.avatar);
  const displayName = safeString(data?.displayName ?? data?.display_name ?? data?.fullName ?? data?.name ?? data?.hacker_name ?? data?.full_name);
  const country = safeString(data?.country);
  const reputation = safeInteger(data?.reputation ?? leetCodeGraphqlData?.profile?.reputation);
  const rating = safeInteger(data?.rating ?? leetCodeGraphqlData?.profile?.currentRating);
  const currentRating = rating || safeInteger(leetCodeGraphqlData?.profile?.currentRating);
  const maxRating = safeInteger(data?.maxRating ?? data?.max_rating ?? data?.rating) || safeInteger(leetCodeGraphqlData?.profile?.currentRating);
  const easySolved = safeInteger(data?.easySolved ?? data?.solved?.easy ?? data?.easy_solved ?? leetCodeGraphqlData?.solved?.easy);
  const mediumSolved = safeInteger(data?.mediumSolved ?? data?.solved?.medium ?? data?.medium_solved ?? leetCodeGraphqlData?.solved?.medium);
  const hardSolved = safeInteger(data?.hardSolved ?? data?.solved?.hard ?? data?.hard_solved ?? leetCodeGraphqlData?.solved?.hard);
  const summedSolved = [easySolved, mediumSolved, hardSolved].every((value) => value !== null)
    ? easySolved + mediumSolved + hardSolved
    : null;
  const problemsSolved = safeInteger(
    data?.problemsSolved ?? data?.totalSolved ?? data?.total_solved ?? leetCodeGraphqlData?.solved?.total ?? summedSolved
  );
  const totalSolved = safeInteger(summedSolved ?? data?.totalSolved ?? data?.total_solved ?? problemsSolved);
  const globalRank = safeInteger(data?.rank ?? data?.globalRank ?? data?.global_rank ?? leetCodeGraphqlData?.profile?.ranking);
  const contestRating = safeInteger(data?.contestRating ?? data?.contest_rating ?? leetCodeGraphqlData?.profile?.contestRating ?? rating);
  const contestsAttended = safeInteger(data?.contestsAttended ?? data?.contests_attended ?? data?.contestCount);
  const topPercentage = safeNumber(data?.topPercentage ?? data?.top_percentage ?? leetCodeGraphqlData?.profile?.topPercentage);
  const topicStatistics = safeObject(data?.topicStatistics ?? data?.topic_statistics ?? data?.profile?.topicStatistics ?? data?.profile?.topic_statistics ?? leetCodeGraphqlData?.topicStatistics) || (graphqlTopics.length ? graphqlTopics : null);
  const currentStreak = safeInteger(data?.currentStreak ?? data?.current_streak ?? data?.profile?.currentStreak ?? leetCodeGraphqlData?.profile?.currentStreak);
  const maxStreak = safeInteger(data?.maxStreak ?? data?.max_streak ?? data?.profile?.maxStreak ?? leetCodeGraphqlData?.profile?.maxStreak ?? leetCodeGraphqlData?.profile?.max_streak);
  const activeDays = safeInteger(data?.activeDays ?? data?.active_days ?? data?.totalActiveDays ?? data?.total_active_days ?? data?.profile?.activeDays ?? leetCodeGraphqlData?.profile?.activeDays ?? leetCodeGraphqlData?.profile?.totalActiveDays);
  const lastActivityDate = safeString(data?.lastActiveDate ?? data?.last_activity_date);
  const activityCalendar = safeArray(data?.activityCalendar ?? data?.activity_calendar) || null;
  const recentSubmissions = safeArray(data?.recentSubmissions ?? data?.recent_submissions) || null;
  const badgesCount = rawBadges.length || graphqlTopics.length || null;
  const starsBadges = safeString(
    [
      ...rawBadges.map((item) => safeString(item?.name || item)).filter(Boolean),
      ...graphqlTopics.map((topic) => safeString(topic?.name || topic)).filter(Boolean),
    ].join(',')
  );

  if (rawRecentProblems.length === 0 && graphqlRecentQuestions.length === 0) {
    console.warn('[codingSyncService] no recent problems available from platform or GraphQL', {
      studentId,
      platform,
      username,
      rawRecentProblemsLength: rawRecentProblems.length,
      graphqlRecentQuestionsLength: graphqlRecentQuestions.length,
    });
  }
  if (graphqlRatingHistory.length === 0) {
    console.warn('[codingSyncService] no GraphQL rating history available', {
      studentId,
      platform,
      username,
      graphqlRatingHistoryLength: graphqlRatingHistory.length,
    });
  }

  console.log('[codingSyncService] graphql enrichment summary', {
    studentId,
    platform,
    username,
    rawRecentProblemsLength: rawRecentProblems.length,
    graphqlRecentQuestionsLength: graphqlRecentQuestions.length,
    graphqlTopicsLength: graphqlTopics.length,
    graphqlRatingHistoryLength: graphqlRatingHistory.length,
    currentRating: rating,
  });

  const recentProblemsToPersist = rawRecentProblems.length ? rawRecentProblems : graphqlRecentQuestions;
  const hackerrankExtras = platform === 'hackerrank' ? {
    skills: safeArray(data?.skills),
    certifications: safeArray(data?.certifications),
    languageBadges: safeArray(data?.languageBadges),
    challengeTracks: safeArray(data?.challengeTracks),
    recentProblems: safeArray(data?.recentProblems),
    fullName: safeString(data?.fullName || data?.name),
    country: safeString(data?.country),
    profileUrl: safeString(data?.profileUrl),
    avatarUrl: safeString(data?.avatarUrl),
    badges: safeArray(data?.badges),
  } : null;

  const handleMetadata = createHandleMetadata(platform, data);
  const handleRecord = await saveCodingHandle(client, {
    studentId,
    platform,
    handle: username,
    profileUrl,
    metadata: handleMetadata,
  });
  const codingHandleId = handleRecord?.id || null;

  await savePlatformProfile(client, {
    studentId,
    codingHandleId,
    platform,
    username,
    profileUrl,
    rawData: {
      source: platform,
      service: data,
      graphql: platform === 'leetcode' ? leetCodeGraphqlData : null,
    },
    stats: buildPlatformProfileStats(platform, data, leetCodeGraphqlData),
    tags: buildPlatformProfileTags(platform, data, leetCodeGraphqlData),
    lastFetchedAt: new Date(),
  });

  const previousProfileResult = await client.query(
    `SELECT current_streak FROM coding_profiles WHERE student_id = $1 AND platform = $2 LIMIT 1`,
    [studentId, platform]
  );
  const previousCurrentStreak = safeInteger(previousProfileResult.rows?.[0]?.current_streak);

  console.log('[codingSyncService] Daily Streak from LeetCode', {
    studentId,
    platform,
    dailyStreak: currentStreak,
  });
  console.log('[codingSyncService] Stored Current Streak', {
    studentId,
    platform,
    currentStreak,
  });
  console.log('[codingSyncService] Previous Current Streak', {
    studentId,
    platform,
    previousCurrentStreak,
  });
  console.log('[codingSyncService] Latest Sync Time', {
    studentId,
    platform,
    latestSyncTime: new Date().toISOString(),
  });

  const profileValues = {
    profileStatus,
    username,
    platform,
    display_name: displayName,
    profile_url: profileUrl,
    avatar_url: avatarUrl,
    country,
    reputation,
    rating,
    current_rating: currentRating,
    max_rating: maxRating,
    problems_solved: problemsSolved || totalSolved,
    easy_solved: easySolved,
    medium_solved: mediumSolved,
    hard_solved: hardSolved,
    total_problems: problemsSolved || totalSolved,
    total_solved: totalSolved,
    contest_count: safeInteger(data?.contestCount ?? data?.contest_count ?? contestsAttended),
    contests_attended: contestsAttended,
    contest_rating: contestRating,
    top_percentage: topPercentage,
    badges_count: badgesCount,
    stars_count: badgesCount,
    global_rank: globalRank,
    country_rank: safeInteger(data?.countryRank),
    stars_badges: starsBadges,
    coding_score: problemsSolved,
    last_activity_date: lastActivityDate,
    activity_calendar: activityCalendar,
    recent_submissions: recentSubmissions,
    last_sync_date: new Date(),
    inactive_days: null,
    active_days: activeDays,
    total_active_days: activeDays,
    activity_status: null,
    current_streak: currentStreak,
    max_streak: maxStreak,
    topic_statistics: safeObject(data?.topicStatistics ?? data?.topic_statistics) || (graphqlTopics.length ? graphqlTopics : null),
    last_sync: new Date(),
    last_updated_date: new Date(),
    data_verification_status: profileStatus === 'active' ? 'verified' : 'estimated',
    estimated_score: null,
    estimated_skill_level: null,
    estimated_progress_score: null,
    badges_analysis: JSON.stringify({
      badges: rawBadges,
      contests: rawContests,
      latestTopics: graphqlTopics,
      recentProblems: rawRecentProblems,
      ...(platform === 'hackerrank' ? hackerrankExtras : {}),
    }),
    achievements_analysis: JSON.stringify({
      recentProblems: recentProblemsToPersist,
      ...(platform === 'hackerrank' ? hackerrankExtras : {}),
    }),
  };

  // Logging extracted sources and final payload before database persistence
  try {
    if (platform === 'leetcode') {
      const graphqlExtracted = data?._graphql || leetCodeGraphqlData || null;
      const playwrightExtracted = data?._playwright || null;

      const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
          }
          if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
          return value;
        };
      };

      const safeStringify = (obj, maxLen = 200000) => {
        try {
          const json = JSON.stringify(obj, getCircularReplacer(), 2);
          if (json && json.length > maxLen) return json.slice(0, maxLen) + '\n...TRUNCATED...';
          return json;
        } catch (err) {
          try {
            // fallback to util.inspect
            const util = require('util');
            return util.inspect(obj, { depth: 3, maxArrayLength: 50 });
          } catch (e) {
            return String(obj);
          }
        }
      };

      console.log('[codingSyncService] GraphQL response:', safeStringify(graphqlExtracted));
      console.log('[codingSyncService] Playwright response:', safeStringify(playwrightExtracted));
      console.log('[codingSyncService] Merged profile:', safeStringify(data));
      console.log('[codingSyncService] Topic statistics:', safeStringify(profileValues.topic_statistics));
      console.log('[codingSyncService] Current streak:', currentStreak);
      console.log('[codingSyncService] Max streak:', maxStreak);
      console.log('[codingSyncService] Active days:', activeDays);
      console.log('[codingSyncService] Database payload:', safeStringify(profileValues));

      // Also print the required clear labels for upstream verification
      console.log('GraphQL profile', safeStringify(graphqlExtracted));
      console.log('Playwright profile', safeStringify(playwrightExtracted));
      console.log('Merged profile', safeStringify(data));
      console.log('Database payload', safeStringify(profileValues));
    }
  } catch (logErr) {
    console.warn('[codingSyncService] Failed to log extraction payloads', { message: logErr?.message });
  }

  const profileInsert = await client.query(
    `INSERT INTO coding_profiles (
      student_id, platform, username, profile_url, avatar_url, reputation, rating,
      current_rating, max_rating, problems_solved, easy_solved, medium_solved, hard_solved,
      total_problems, contest_count, contest_rating, badges_count, stars_count, global_rank,
      country_rank, stars_badges, coding_score, last_activity_date, last_sync_date,
      inactive_days, active_days, total_active_days, activity_status, current_streak, max_streak,
      topic_statistics, profile_status, last_sync, estimated_score, last_updated_date,
      data_verification_status, estimated_skill_level, estimated_progress_score,
      badges_analysis, achievements_analysis, display_name, country, total_solved,
      contests_attended, top_percentage, activity_calendar, recent_submissions
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24,
      $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35,
      $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45,
      $46, $47
    )
    ON CONFLICT (student_id, platform) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, coding_profiles.username),
      profile_url = COALESCE(EXCLUDED.profile_url, coding_profiles.profile_url),
      avatar_url = COALESCE(EXCLUDED.avatar_url, coding_profiles.avatar_url),
      reputation = COALESCE(EXCLUDED.reputation, coding_profiles.reputation),
      rating = COALESCE(EXCLUDED.rating, coding_profiles.rating),
      current_rating = COALESCE(EXCLUDED.current_rating, coding_profiles.current_rating),
      max_rating = COALESCE(EXCLUDED.max_rating, coding_profiles.max_rating),
      problems_solved = COALESCE(EXCLUDED.problems_solved, coding_profiles.problems_solved),
      easy_solved = COALESCE(EXCLUDED.easy_solved, coding_profiles.easy_solved),
      medium_solved = COALESCE(EXCLUDED.medium_solved, coding_profiles.medium_solved),
      hard_solved = COALESCE(EXCLUDED.hard_solved, coding_profiles.hard_solved),
      total_problems = COALESCE(EXCLUDED.total_problems, coding_profiles.total_problems),
      contest_count = COALESCE(EXCLUDED.contest_count, coding_profiles.contest_count),
      contest_rating = COALESCE(EXCLUDED.contest_rating, coding_profiles.contest_rating),
      badges_count = COALESCE(EXCLUDED.badges_count, coding_profiles.badges_count),
      stars_count = COALESCE(EXCLUDED.stars_count, coding_profiles.stars_count),
      stars_badges = COALESCE(EXCLUDED.stars_badges, coding_profiles.stars_badges),
      global_rank = COALESCE(EXCLUDED.global_rank, coding_profiles.global_rank),
      country_rank = COALESCE(EXCLUDED.country_rank, coding_profiles.country_rank),
      coding_score = COALESCE(EXCLUDED.coding_score, coding_profiles.coding_score),
      last_activity_date = COALESCE(EXCLUDED.last_activity_date, coding_profiles.last_activity_date),
      last_sync_date = COALESCE(EXCLUDED.last_sync_date, coding_profiles.last_sync_date),
      inactive_days = COALESCE(EXCLUDED.inactive_days, coding_profiles.inactive_days),
      active_days = COALESCE(EXCLUDED.active_days, coding_profiles.active_days),
      total_active_days = COALESCE(EXCLUDED.total_active_days, coding_profiles.total_active_days),
      activity_status = COALESCE(EXCLUDED.activity_status, coding_profiles.activity_status),
      current_streak = COALESCE(EXCLUDED.current_streak, coding_profiles.current_streak),
      max_streak = COALESCE(EXCLUDED.max_streak, coding_profiles.max_streak),
      topic_statistics = COALESCE(EXCLUDED.topic_statistics, coding_profiles.topic_statistics),
      profile_status = COALESCE(EXCLUDED.profile_status, coding_profiles.profile_status),
      last_sync = COALESCE(EXCLUDED.last_sync, coding_profiles.last_sync),
      estimated_score = COALESCE(EXCLUDED.estimated_score, coding_profiles.estimated_score),
      last_updated_date = COALESCE(EXCLUDED.last_updated_date, coding_profiles.last_updated_date),
      data_verification_status = COALESCE(EXCLUDED.data_verification_status, coding_profiles.data_verification_status),
      estimated_skill_level = COALESCE(EXCLUDED.estimated_skill_level, coding_profiles.estimated_skill_level),
      estimated_progress_score = COALESCE(EXCLUDED.estimated_progress_score, coding_profiles.estimated_progress_score),
      badges_analysis = COALESCE(EXCLUDED.badges_analysis, coding_profiles.badges_analysis),
      achievements_analysis = COALESCE(EXCLUDED.achievements_analysis, coding_profiles.achievements_analysis),
      display_name = COALESCE(EXCLUDED.display_name, coding_profiles.display_name),
      country = COALESCE(EXCLUDED.country, coding_profiles.country),
      total_solved = COALESCE(EXCLUDED.total_solved, coding_profiles.total_solved),
      contests_attended = COALESCE(EXCLUDED.contests_attended, coding_profiles.contests_attended),
      top_percentage = COALESCE(EXCLUDED.top_percentage, coding_profiles.top_percentage),
      activity_calendar = COALESCE(EXCLUDED.activity_calendar, coding_profiles.activity_calendar),
      recent_submissions = COALESCE(EXCLUDED.recent_submissions, coding_profiles.recent_submissions),
      updated_at = NOW()
    RETURNING id`,
    [
      studentId,
      platform,
      profileValues.username,
      profileValues.profile_url,
      profileValues.avatar_url,
      profileValues.reputation,
      profileValues.rating,
      profileValues.current_rating,
      profileValues.max_rating,
      profileValues.problems_solved,
      profileValues.easy_solved,
      profileValues.medium_solved,
      profileValues.hard_solved,
      profileValues.total_problems,
      profileValues.contest_count,
      profileValues.contest_rating,
      profileValues.badges_count,
      profileValues.stars_count,
      profileValues.global_rank,
      profileValues.country_rank,
      profileValues.stars_badges,
      profileValues.coding_score,
      profileValues.last_activity_date,
      profileValues.last_sync_date,
      profileValues.inactive_days,
      profileValues.active_days,
      profileValues.total_active_days,
      profileValues.activity_status,
      profileValues.current_streak,
      profileValues.max_streak,
      toJsonbParam(profileValues.topic_statistics),
      profileValues.profileStatus,
      profileValues.last_sync,
      profileValues.estimated_score,
      profileValues.last_updated_date,
      profileValues.data_verification_status,
      profileValues.estimated_skill_level,
      profileValues.estimated_progress_score,
      profileValues.badges_analysis,
      profileValues.achievements_analysis,
      profileValues.display_name,
      profileValues.country,
      profileValues.total_solved,
      profileValues.contests_attended,
      profileValues.top_percentage,
      toJsonbParam(profileValues.activity_calendar),
      toJsonbParam(profileValues.recent_submissions),
    ]
  );

  const profileId = profileInsert.rows?.[0]?.id;

  if (profileId) {
    console.log('Persisted successfully.', { studentId, platform, profileId });
  } else {
    console.warn('[codingSyncService] Persist may have failed, no profileId returned', { studentId, platform });
  }

  if (profileId && profileValues.rating !== null) {
    console.log('[codingSyncService] before saveRatingHistory', {
      studentId,
      platform,
      rating: profileValues.rating,
      recordedAt: profileValues.last_sync || new Date(),
    });
    await saveRatingHistory(client, {
      studentId,
      platform,
      rating: profileValues.rating,
      recordedAt: profileValues.last_sync || new Date(),
      context: {
        profileStatus,
        source: platform === 'leetcode' ? 'leetcode_graphql' : 'profile_sync',
      },
    });
  } else {
    console.warn('[codingSyncService] skipping saveRatingHistory because rating is null', {
      studentId,
      platform,
      rating: profileValues.rating,
    });
  }

  if (profileId) {
    console.log('[codingSyncService] before saveRecentQuestions', {
      studentId,
      platform,
      profileId,
      recentQuestionsLength: recentProblemsToPersist.length,
      source: rawRecentProblems.length ? 'platform_data' : 'graphql_data',
      recentProblemsToPersist,
    });
    await persistRecentQuestions(client, {
      profileId,
      studentId,
      platform,
      recentQuestions: recentProblemsToPersist,
    });

    const problemHistoryItems = safeArray(recentProblemsToPersist);
    console.log('[codingSyncService] problemHistoryItems length', {
      studentId,
      platform,
      profileId,
      problemHistoryLength: problemHistoryItems.length,
    });
    for (const item of problemHistoryItems) {
      const problemId = safeString(item.slug || item.question_id || item.problemId || item.title || item.titleSlug || item.questionName);
      const problemName = safeString(item.title || item.question_name || item.name || item.questionName || item.titleSlug);
      const difficulty = safeString(item.difficulty || item.level || item.problemDifficulty);
      const solvedAt = item.timestamp ? new Date(item.timestamp) : item.solvedDate ? new Date(item.solvedDate) : item.date_solved ? new Date(item.date_solved) : null;
      if (!problemId) continue;

      await saveProblemHistory(client, {
        studentId,
        platform,
        problemId,
        problemName,
        difficulty,
        solvedAt,
        attemptData: item,
        source: 'recent_activity',
        details: {
          source: platform === 'leetcode' ? 'leetcode_graphql' : 'profile_sync',
          raw: item,
        },
      });
    }
  }

  await client.query(
    `INSERT INTO coding_statistics (
      coding_profile_id, student_id, platform, rating, max_rating, problems_solved, contest_count, global_rank, country_rank, reputation, stars_badges, recorded_date, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE, NOW())`,
    [
      profileId,
      studentId,
      platform,
      profileValues.rating,
      profileValues.max_rating,
      profileValues.problems_solved,
      profileValues.contest_count,
      profileValues.global_rank,
      profileValues.country_rank,
      profileValues.reputation,
      profileValues.stars_badges,
    ]
  );

  await client.query(
    `INSERT INTO coding_profile_history (
      coding_profile_id, student_id, platform, rating, max_rating, problems_solved, global_rank, country_rank, stars_badges, recorded_date, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, NOW())`,
    [
      profileId,
      studentId,
      platform,
      profileValues.rating,
      profileValues.max_rating,
      profileValues.problems_solved,
      profileValues.global_rank,
      profileValues.country_rank,
      profileValues.stars_badges,
    ]
  );

  let contestsAdded = 0;
  const contests = safeArray(data?.contests || []).filter((entry) => safeString(entry?.contestName));

  console.log('========== INSERTING CONTESTS ==========');
  console.log(JSON.stringify(contests, null, 2));

  for (const contest of contests) {
    const contestName = safeString(contest?.contestName);
    const contestUrl = safeString(contest?.contestUrl);
    const contestId = safeString(contest?.contestId || contestUrl || contestName || `${platform}-${contestName || 'unknown'}-${contest?.contestDate || ''}`);
    const contestDate = contest?.contestDate ? new Date(contest.contestDate) : null;
    const contestDateValue = contestDate && !Number.isNaN(contestDate.getTime()) ? contestDate.toISOString().slice(0, 10) : null;
    const contestDetails = JSON.stringify({
      problemsSolved: contest?.problemsSolved ?? null,
      ratingBefore: contest?.ratingBefore ?? null,
      ratingAfter: contest?.ratingAfter ?? null,
      ratingChange: contest?.ratingChange ?? null,
      trendDirection: contest?.trendDirection ?? null,
      totalProblems: contest?.totalProblems ?? null,
      finishTimeInSeconds: contest?.finishTimeInSeconds ?? null,
    });

    const res = await client.query(
      `INSERT INTO contest_history (
         student_id, platform, contest_id, contest_name, contest_url, contest_date, rank, rating_before, rating_after, rating_change, details, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       ON CONFLICT (student_id, platform, contest_id) DO NOTHING`,
      [
        studentId,
        platform,
        contestId,
        contestName,
        contestUrl,
        contestDateValue,
        safeInteger(contest?.rank),
        safeInteger(contest?.ratingBefore),
        safeInteger(contest?.ratingAfter),
        safeInteger(contest?.ratingChange),
        contestDetails,
      ]
    );

    if (res.rowCount > 0) {
      contestsAdded += 1;
    }
  }

  return contestsAdded;
};

const isSuccessfulSync = (data) => {
  if (!data) return false;
  if (data.success === false) return false;
  if (data.success === true) return true;
  const profileStatus = safeString(data?.profileStatus);
  return profileStatus ? profileStatus.toLowerCase() !== 'failed' : false;
};

const syncUserCodingProfiles = async (userId) => {
  if (!userId) {
    return { success: true, syncedPlatforms: [], failedPlatforms: [], contestsAdded: 0 };
  }

  const existingHandles = await getStudentHandles(userId);
  const profileHandles = await getCodingProfilesAsHandles(userId);
  const handles = mergeHandles(existingHandles, profileHandles);

  const syncedPlatforms = [];
  const failedPlatforms = [];
  let contestsAdded = 0;

  for (const handle of handles) {
    const normalizedPlatform = normalizePlatform(handle?.platform);
    const platformService = normalizedPlatform ? PLATFORM_SERVICES[normalizedPlatform] : null;
    const username = safeString(handle?.handle);
    if (!normalizedPlatform || !platformService || !username) {
      continue;
    }

    console.log('[codingSyncService] syncUserCodingProfiles start', {
      studentId: userId,
      platform: normalizedPlatform,
      username,
      handleSource: handle?.original ? 'merged_handle' : 'profile_handle',
    });

    const syncLog = await createSyncLogEntry({
      studentId: userId,
      platform: normalizedPlatform,
      operation: 'profile_sync',
      status: 'started',
      message: `Sync started for ${normalizedPlatform}`,
      response: { username },
    });

    try {
      const data = await platformService(username);
      console.log('[codingSyncService] platformService response', {
        studentId: userId,
        platform: normalizedPlatform,
        username,
        profileStatus: data?.profileStatus,
        success: data?.success,
        rating: data?.rating,
        recentProblemsLength: safeArray(data?.recentProblems).length,
        contestsLength: safeArray(data?.contests).length,
      });
      console.log('========== FETCHED PROFILE ==========', JSON.stringify(data, null, 2));

      if (!isSuccessfulSync(data)) {
        console.warn('[codingSyncService] scraper returned unsuccessful profile', {
          studentId: userId,
          platform: normalizedPlatform,
          username,
          error: data?.error,
        });
        failedPlatforms.push(normalizedPlatform);
        await updateSyncLogEntry(syncLog?.id, {
          status: 'failed',
          message: data?.error || `Scraper failed for ${normalizedPlatform}`,
          response: { username, error: data?.error || 'Scraper failed' },
        });
        continue;
      }

      console.log('[codingSyncService] Saving to database', { studentId: userId, platform: normalizedPlatform, username });
      const advisoryLockId = Number(userId) || 0;
      const result = await withTransaction(async (client) => persistProfileAndContests(client, {
        studentId: userId,
        platform: normalizedPlatform,
        data,
        inputUsername: username,
      }), advisoryLockId);

      contestsAdded += result;
      syncedPlatforms.push(normalizedPlatform);
      await updateSyncLogEntry(syncLog?.id, {
        status: 'success',
        message: `Sync successful for ${normalizedPlatform}`,
        response: { username, syncedPlatforms: normalizedPlatform },
      });
    } catch (error) {
      console.error(`[codingSyncService] Failed to sync ${normalizedPlatform} for student ${userId}`, error);
      failedPlatforms.push(normalizedPlatform);
      await updateSyncLogEntry(syncLog?.id, {
        status: 'failed',
        message: error?.message || 'Sync failed',
        response: { username, error: String(error) },
      });
    }
  }

  const result = {
    success: failedPlatforms.length === 0,
    syncedPlatforms: [...new Set(syncedPlatforms)],
    failedPlatforms: [...new Set(failedPlatforms)],
    contestsAdded,
  };
  console.log('[codingSyncService] Sync completed', { studentId: userId, ...result });
  return result;
};

const syncAllCodingProfiles = async () => {
  const result = await pool.query(`
    SELECT DISTINCT student_id FROM (
      SELECT student_id FROM coding_handles WHERE student_id IS NOT NULL
      UNION
      SELECT student_id FROM coding_profiles WHERE student_id IS NOT NULL
    ) AS all_students
  `);
  const students = (result.rows || []).map((row) => row.student_id).filter(Boolean);

  const aggregated = {
    success: true,
    syncedPlatforms: [],
    failedPlatforms: [],
    contestsAdded: 0,
  };

  for (const studentId of students) {
    const studentResult = await syncUserCodingProfiles(studentId);
    aggregated.syncedPlatforms.push(...studentResult.syncedPlatforms);
    aggregated.failedPlatforms.push(...studentResult.failedPlatforms);
    aggregated.contestsAdded += studentResult.contestsAdded;
  }

  aggregated.syncedPlatforms = [...new Set(aggregated.syncedPlatforms)];
  aggregated.failedPlatforms = [...new Set(aggregated.failedPlatforms)];
  return aggregated;
};

module.exports = {
  resolvePersistedUsername,
  syncUserCodingProfiles,
  syncAllCodingProfiles,
};
