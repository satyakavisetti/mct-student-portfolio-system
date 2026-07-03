const db = require('../db');
const { saveCodingHandle } = require('../db/codingHandles');
const { syncUserCodingProfiles } = require('./codingSyncService');

const safeString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const safeJSON = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value;
  return null;
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
  return [];
};

const normalizePlatform = (platform) => {
  if (!platform) return null;
  return safeString(platform).toLowerCase();
};

const buildHackerRankExtras = (profile) => {
  if (!profile || normalizePlatform(profile.platform) !== 'hackerrank') {
    return {};
  }

  const badgesAnalysis = safeJSON(profile.badges_analysis ?? profile.badgesAnalysis) || {};
  const achievementsAnalysis = safeJSON(profile.achievements_analysis ?? profile.achievementsAnalysis) || {};
  const derived = {
    ...badgesAnalysis,
    ...achievementsAnalysis,
  };

  return {
    skills: safeArray(derived.skills || badgesAnalysis.skills || []),
    certifications: safeArray(derived.certifications || badgesAnalysis.certifications || []),
    languageBadges: safeArray(derived.languageBadges || badgesAnalysis.languageBadges || []),
    challengeTracks: safeArray(derived.challengeTracks || badgesAnalysis.challengeTracks || []),
    recentProblems: safeArray(derived.recentProblems || achievementsAnalysis.recentProblems || achievementsAnalysis.recent_problems || []),
    fullName: safeString(derived.fullName || badgesAnalysis.fullName || achievementsAnalysis.fullName || null),
    country: safeString(derived.country || badgesAnalysis.country || achievementsAnalysis.country || null),
    profileUrl: safeString(derived.profileUrl || badgesAnalysis.profileUrl || achievementsAnalysis.profileUrl || null),
    avatarUrl: safeString(derived.avatarUrl || badgesAnalysis.avatarUrl || achievementsAnalysis.avatarUrl || null),
    badges: safeArray(derived.badges || badgesAnalysis.badges || []),
  };
};

const buildProfileSummary = (profile) => {
  if (!profile) return null;

  const rating = safeNumber(profile.current_rating ?? profile.rating ?? profile.max_rating);
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_problems ?? profile.total_solved);
  const totalSolved = safeNumber(profile.total_solved ?? profile.total_problems ?? profile.problems_solved);
  const contestCount = safeNumber(profile.contest_count);
  const contestsAttended = safeNumber(profile.contests_attended ?? profile.contest_count);
  const globalRank = safeNumber(profile.global_rank);
  const reputation = safeNumber(profile.reputation);

  return {
    id: profile.id,
    studentId: safeNumber(profile.student_id),
    platform: normalizePlatform(profile.platform),
    username: safeString(profile.username),
    displayName: safeString(profile.display_name),
    profileStatus: safeString(profile.profile_status) || 'failed',
    rating,
    currentRating: safeNumber(profile.current_rating),
    maxRating: safeNumber(profile.max_rating),
    problemsSolved,
    totalSolved,
    easySolved: safeNumber(profile.easy_solved),
    mediumSolved: safeNumber(profile.medium_solved),
    hardSolved: safeNumber(profile.hard_solved),
    contestCount,
    contestsAttended,
    contestRating: safeNumber(profile.contest_rating),
    topPercentage: safeNumber(profile.top_percentage),
    country: safeString(profile.country),
    activeDays: safeNumber(profile.total_active_days ?? profile.active_days),
    totalActiveDays: safeNumber(profile.total_active_days ?? profile.active_days),
    currentStreak: safeNumber(profile.current_streak),
    maxStreak: safeNumber(profile.max_streak),
    topicWiseSolved: safeJSON(profile.topic_statistics ?? profile.topic_stats ?? profile.topicWiseSolved),
    topicStatistics: safeJSON(profile.topic_statistics ?? profile.topic_stats ?? profile.topicWiseSolved),
    topics: safeJSON(profile.topics ?? profile.topic_statistics ?? profile.topic_stats),
    activityCalendar: safeJSON(profile.activity_calendar ?? profile.activityCalendar),
    recentSubmissions: safeJSON(profile.recent_submissions ?? profile.recentSubmissions),
    globalRank,
    countryRank: safeNumber(profile.country_rank),
    reputation,
    starsBadges: safeString(profile.stars_badges),
    codingScore: safeNumber(profile.coding_score),
    lastActivityDate: profile.last_activity_date || null,
    lastSyncDate: profile.last_sync_date || profile.last_sync || null,
    profileUrl: safeString(profile.profile_url),
    avatarUrl: safeString(profile.avatar_url),
    badgesAnalysis: safeJSON(profile.badges_analysis) || safeJSON(profile.badgesAnalysis) || null,
    achievementsAnalysis: safeJSON(profile.achievements_analysis) || safeJSON(profile.achievementsAnalysis) || null,
    updatedAt: profile.updated_at || null,
    ...buildHackerRankExtras(profile),
  };
};

const buildContestRecord = (record) => {
  if (!record) return null;

  return {
    id: record.id,
    studentId: safeNumber(record.student_id),
    platform: safeString(record.platform),
    contestId: safeString(record.contest_id),
    contestName: safeString(record.contest_name),
    contestUrl: safeString(record.contest_url),
    contestDate: record.contest_date || null,
    rank: safeNumber(record.rank),
    ratingBefore: safeNumber(record.rating_before),
    ratingAfter: safeNumber(record.rating_after),
    ratingChange: safeNumber(record.rating_change),
    details: record.details || null,
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
  };
};

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeRatio = (value, max) => {
  const num = safeNumber(value);
  if (!num || !max) return 0;
  return clampPercent((num / max) * 100);
};

const parseJsonSafe = (value) => safeJSON(value) || {};

const getHackerRankExtras = (profile) => {
  const badgesAnalysis = parseJsonSafe(profile.badges_analysis ?? profile.badgesAnalysis);
  const achievementsAnalysis = parseJsonSafe(profile.achievements_analysis ?? profile.achievementsAnalysis);
  const derived = { ...badgesAnalysis, ...achievementsAnalysis };
  const certifications = Array.isArray(derived.certifications) ? derived.certifications.length : 0;
  const skills = Array.isArray(derived.skills) ? derived.skills.length : 0;
  return { certifications, skills };
};

const calculateLeetCodeScore = (profile) => {
  if (!profile) return 0;
  const rating = safeNumber(profile.current_rating ?? profile.rating ?? profile.max_rating) || 0;
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_solved ?? profile.total_problems) || 0;
  const contestCount = safeNumber(profile.contest_count ?? profile.contests_attended) || 0;
  const globalRank = safeNumber(profile.global_rank);

  const ratingScore = normalizeRatio(rating, 2600);
  const problemsScore = normalizeRatio(problemsSolved, 1200);
  const contestScore = normalizeRatio(contestCount, 80);
  const rankScore = globalRank ? clampPercent(Math.max(0, Math.round((1000 - Math.min(globalRank, 1000)) / 10))) : 0;

  return clampPercent(ratingScore * 0.45 + problemsScore * 0.30 + contestScore * 0.15 + rankScore * 0.10);
};

const calculateCodeChefScore = (profile) => {
  if (!profile) return 0;
  const rating = safeNumber(profile.current_rating ?? profile.rating ?? profile.max_rating) || 0;
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_solved ?? profile.total_problems) || 0;
  const contestCount = safeNumber(profile.contest_count ?? profile.contests_attended) || 0;
  const reputation = safeNumber(profile.reputation) || 0;

  const ratingScore = normalizeRatio(rating, 3000);
  const problemsScore = normalizeRatio(problemsSolved, 1200);
  const contestScore = normalizeRatio(contestCount, 80);
  const reputationScore = normalizeRatio(reputation, 15000);

  return clampPercent(ratingScore * 0.45 + problemsScore * 0.25 + contestScore * 0.15 + reputationScore * 0.15);
};

const calculateHackerRankScore = (profile) => {
  if (!profile) return 0;
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_solved ?? profile.total_problems) || 0;
  const badges = safeNumber(profile.badges_count ?? profile.stars_count) || 0;
  const reputation = safeNumber(profile.reputation) || 0;
  const { certifications } = getHackerRankExtras(profile);

  const problemsScore = normalizeRatio(problemsSolved, 900);
  const badgesScore = normalizeRatio(badges, 80);
  const reputationScore = normalizeRatio(reputation, 10000);
  const certificateScore = normalizeRatio(certifications, 15);

  return clampPercent(problemsScore * 0.40 + badgesScore * 0.25 + reputationScore * 0.20 + certificateScore * 0.15);
};

const calculatePlatformScore = (profile) => {
  if (!profile) return 0;
  const normalizedPlatform = normalizePlatform(profile.platform);
  if (normalizedPlatform === 'leetcode') return calculateLeetCodeScore(profile);
  if (normalizedPlatform === 'codechef') return calculateCodeChefScore(profile);
  if (normalizedPlatform === 'hackerrank') return calculateHackerRankScore(profile);
  return computePlatformScore(profile);
};

const computePlatformScore = (profile) => {
  if (!profile) return 0;
  const rating = safeNumber(profile.current_rating ?? profile.rating ?? profile.max_rating) || 0;
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_problems) || 0;
  const contestCount = safeNumber(profile.contest_count) || 0;
  const reputation = safeNumber(profile.reputation) || 0;
  const globalRank = safeNumber(profile.global_rank);
  const rankBonus = globalRank ? Math.max(0, 1000 - globalRank) / 100 : 0;

  return Math.round(rating * 2 + problemsSolved * 2 + contestCount * 10 + reputation / 10 + rankBonus);
};

const mapLeaderboardRecord = (profile) => {
  const summary = buildProfileSummary(profile);
  if (!summary) return null;
  return {
    ...summary,
    leaderboardScore: computePlatformScore(profile),
  };
};

const getStudentProfile = async (studentId) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;

  const profiles = await db.all(
    `SELECT * FROM coding_profiles WHERE student_id = $1 ORDER BY platform ASC`,
    [normalizedStudentId]
  );

  if (!profiles || profiles.length === 0) {
    return null;
  }

  const platformProfiles = profiles.map(buildProfileSummary).filter(Boolean);
  const platforms = {};
  let totalProblemsSolved = 0;
  let totalContestCount = 0;
  let totalRating = 0;
  let ratingCount = 0;
  let lastSync = null;
  let lastUpdate = null;

  for (const profile of platformProfiles) {
    platforms[profile.platform] = profile;
    totalProblemsSolved += profile.problemsSolved || 0;
    totalContestCount += profile.contestCount || 0;
    if (profile.rating) {
      totalRating += profile.rating;
      ratingCount += 1;
    }
    if (profile.lastSyncDate) {
      const timestamp = new Date(profile.lastSyncDate).getTime();
      if (!Number.isNaN(timestamp) && timestamp > (lastSync ? new Date(lastSync).getTime() : 0)) {
        lastSync = new Date(timestamp).toISOString();
      }
    }
    if (profile.updatedAt) {
      const timestamp = new Date(profile.updatedAt).getTime();
      if (!Number.isNaN(timestamp) && timestamp > (lastUpdate ? new Date(lastUpdate).getTime() : 0)) {
        lastUpdate = new Date(timestamp).toISOString();
      }
    }
  }

  return {
    studentId: normalizedStudentId,
    platforms,
    totals: {
      platformsCount: Object.keys(platforms).length,
      totalProblemsSolved,
      totalContestCount,
      averageRating: ratingCount ? Math.round(totalRating / ratingCount) : null,
      lastSync,
      lastUpdate,
    },
  };
};

const getPlatformAnalytics = async (studentId, platform) => {
  const normalizedStudentId = safeNumber(studentId);
  const normalizedPlatform = normalizePlatform(platform);
  if (!normalizedStudentId || !normalizedPlatform) return null;

  const profile = await db.one(
    `SELECT * FROM coding_profiles WHERE student_id = $1 AND platform = $2 LIMIT 1`,
    [normalizedStudentId, normalizedPlatform]
  );

  if (!profile) {
    return null;
  }

  const contests = await db.all(
    `SELECT * FROM contest_history WHERE student_id = $1 AND platform = $2 ORDER BY contest_date DESC NULLS LAST, id DESC`,
    [normalizedStudentId, normalizedPlatform]
  );

  const statistics = await db.all(
    `SELECT * FROM coding_statistics WHERE student_id = $1 AND platform = $2 ORDER BY recorded_date DESC, id DESC`,
    [normalizedStudentId, normalizedPlatform]
  );

  const profileHistory = await db.all(
    `SELECT * FROM coding_profile_history WHERE student_id = $1 AND platform = $2 ORDER BY recorded_date DESC, id DESC`,
    [normalizedStudentId, normalizedPlatform]
  );

  return {
    studentId: normalizedStudentId,
    platform: normalizedPlatform,
    profile: buildProfileSummary(profile),
    contestHistory: contests.map(buildContestRecord).filter(Boolean),
    statistics: statistics.map((item) => ({
      id: item.id,
      recordedDate: item.recorded_date || null,
      rating: safeNumber(item.rating),
      maxRating: safeNumber(item.max_rating),
      problemsSolved: safeNumber(item.problems_solved),
      contestCount: safeNumber(item.contest_count),
      globalRank: safeNumber(item.global_rank),
      countryRank: safeNumber(item.country_rank),
      reputation: safeNumber(item.reputation),
      starsBadges: safeString(item.stars_badges),
      createdAt: item.created_at || null,
    })),
    profileHistory: profileHistory.map((item) => ({
      id: item.id,
      recordedDate: item.recorded_date || null,
      rating: safeNumber(item.rating),
      maxRating: safeNumber(item.max_rating),
      problemsSolved: safeNumber(item.problems_solved),
      globalRank: safeNumber(item.global_rank),
      countryRank: safeNumber(item.country_rank),
      starsBadges: safeString(item.stars_badges),
      createdAt: item.created_at || null,
    })),
  };
};

const calculateOverallCodingScore = async (studentId) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;

  const profiles = await db.all(
    `SELECT * FROM coding_profiles WHERE student_id = $1`,
    [normalizedStudentId]
  );

  if (!profiles || profiles.length === 0) {
    return null;
  }

  const platformWeights = {
    leetcode: 0.5,
    codechef: 0.35,
    hackerrank: 0.15,
  };

  let weightedScore = 0;
  let totalWeight = 0;

  const platformScores = profiles.map((profile) => {
    const platform = normalizePlatform(profile.platform);
    const score = calculatePlatformScore(profile);
    const weight = platformWeights[platform] || 0;
    if (weight > 0) {
      weightedScore += score * weight;
      totalWeight += weight;
    }
    return {
      platform,
      score,
      weight,
      profile: buildProfileSummary(profile),
    };
  });

  const overallCodingScore = totalWeight > 0 ? clampPercent(Math.round(weightedScore / totalWeight)) : 0;

  return {
    studentId: normalizedStudentId,
    overallCodingScore,
    platformScores,
    platformWeightSum: totalWeight,
  };
};

const calculatePlacementReadiness = async (studentId) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;

  const academic = await db.one(
    `SELECT cgpa, backlogs FROM academic_details WHERE student_id = $1 LIMIT 1`,
    [normalizedStudentId]
  );

  const resume = await db.one(
    `SELECT id FROM resume WHERE student_id = $1 LIMIT 1`,
    [normalizedStudentId]
  );

  const goalsTable = await db.one(`SELECT to_regclass('public.goals') AS table_name`);
  const projectsTable = await db.one(`SELECT to_regclass('public.projects') AS table_name`);

  let goalsCount = 0;
  let projectsCount = 0;

  if (goalsTable?.table_name) {
    const goalsResult = await db.one(`SELECT COUNT(*)::integer AS count FROM goals WHERE student_id = $1`, [normalizedStudentId]);
    goalsCount = safeNumber(goalsResult?.count) || 0;
  }

  if (projectsTable?.table_name) {
    const projectsResult = await db.one(`SELECT COUNT(*)::integer AS count FROM projects WHERE student_id = $1`, [normalizedStudentId]);
    projectsCount = safeNumber(projectsResult?.count) || 0;
  }

  const codingScoreResult = await calculateOverallCodingScore(normalizedStudentId);
  const codingScore = safeNumber(codingScoreResult?.overallCodingScore) || 0;

  const cgpa = safeNumber(academic?.cgpa);
  const backlogs = safeNumber(academic?.backlogs);
  const cgpaScore = cgpa != null ? clampPercent((cgpa / 10) * 100) : 0;
  const backlogScore = backlogs != null ? clampPercent(Math.max(0, 100 - Math.min(backlogs, 5) * 20)) : 100;
  const academicScore = clampPercent(Math.round(cgpaScore * 0.75 + backlogScore * 0.25));
  const resumeScore = resume ? 100 : 0;
  const projectScore = projectsCount > 0 ? clampPercent(Math.min(projectsCount, 8) / 8 * 100) : 0;
  const goalsScore = goalsCount > 0 ? clampPercent(Math.min(goalsCount, 8) / 8 * 100) : 0;

  const weights = {
    academic: 0.30,
    resume: 0.20,
    projects: 0.20,
    goals: 0.15,
    coding: 0.15,
  };

  const placementReadinessScore = clampPercent(
    Math.round(
      academicScore * weights.academic +
      resumeScore * weights.resume +
      projectScore * weights.projects +
      goalsScore * weights.goals +
      codingScore * weights.coding
    )
  );

  return {
    studentId: normalizedStudentId,
    placementReadinessScore,
    breakdown: {
      academic: academicScore,
      resume: resumeScore,
      projects: projectScore,
      goals: goalsScore,
      coding: codingScore,
    },
  };
};

const getOverallScore = async (studentId) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;

  const profiles = await db.all(
    `SELECT * FROM coding_profiles WHERE student_id = $1`,
    [normalizedStudentId]
  );

  if (!profiles || profiles.length === 0) {
    return null;
  }

  let totalScore = 0;
  let platformCount = 0;

  const platformScores = profiles.map((profile) => {
    const score = computePlatformScore(profile);
    totalScore += score;
    platformCount += 1;
    return {
      platform: normalizePlatform(profile.platform),
      score,
      profile: buildProfileSummary(profile),
    };
  });

  const overallCoding = await calculateOverallCodingScore(normalizedStudentId);
  const placementReadiness = await calculatePlacementReadiness(normalizedStudentId);

  return {
    studentId: normalizedStudentId,
    totalScore: Math.round(totalScore),
    platformCount,
    averagePlatformScore: platformCount ? Math.round(totalScore / platformCount) : 0,
    platformScores,
    overallCodingScore: overallCoding?.overallCodingScore ?? null,
    placementReadinessScore: placementReadiness?.placementReadinessScore ?? null,
    scoreBreakdown: {
      coding: overallCoding?.platformScores || [],
      placement: placementReadiness?.breakdown || {},
    },
  };
};

const getLeaderboard = async (platform = null) => {
  const normalizedPlatform = platform ? normalizePlatform(platform) : null;
  const params = [];
  const platformFilter = normalizedPlatform ? 'WHERE platform = $1' : '';
  if (normalizedPlatform) params.push(normalizedPlatform);

  const profiles = await db.all(
    `SELECT * FROM coding_profiles ${platformFilter} ORDER BY COALESCE(current_rating, rating, max_rating) DESC NULLS LAST, problems_solved DESC NULLS LAST, contest_count DESC NULLS LAST`,
    params
  );

  return (profiles || []).map(mapLeaderboardRecord).filter(Boolean);
};

const saveHandles = async (studentId, handles) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;

  const entries = safeArray(handles);
  if (entries.length === 0) return null;

  const saved = [];
  for (const handleItem of entries) {
    const platform = normalizePlatform(handleItem.platform);
    const handle = safeString(handleItem.handle);
    const profileUrl = safeString(handleItem.profileUrl) || null;

    if (!platform || !handle) {
      continue;
    }

    const record = await saveCodingHandle({
      student_id: normalizedStudentId,
      platform,
      handle,
      profile_url: profileUrl,
      is_primary: !!handleItem.is_primary,
      metadata: handleItem.metadata || {},
    });

    if (record) {
      saved.push(record);
    }
  }

  return saved;
};

const syncHandles = async (studentId) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;

  const result = await syncUserCodingProfiles(normalizedStudentId);
  if (!result) {
    return null;
  }

  const syncedPlatforms = Array.isArray(result.syncedPlatforms) ? result.syncedPlatforms : [];
  const failedPlatforms = Array.isArray(result.failedPlatforms) ? result.failedPlatforms : [];

  return {
    status: failedPlatforms.length > 0 ? 'partial' : 'success',
    syncedAt: new Date().toISOString(),
    syncedPlatforms,
    failedPlatforms,
    contestsAdded: Number.isFinite(Number(result.contestsAdded)) ? Number(result.contestsAdded) : 0,
    message:
      failedPlatforms.length > 0
        ? 'Sync completed with some platform failures.'
        : 'Sync completed successfully.',
  };
};

module.exports = {
  getStudentProfile,
  getPlatformAnalytics,
  getOverallScore,
  calculateOverallCodingScore,
  calculatePlacementReadiness,
  getLeaderboard,
  saveHandles,
  syncHandles,
};
