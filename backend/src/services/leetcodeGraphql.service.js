const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: 'https://leetcode.com/graphql/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Referer: 'https://leetcode.com/',
    Origin: 'https://leetcode.com',
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

const safeString = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const safeInteger = (value) => {
  const numeric = safeNumber(value);
  return numeric === null ? null : Math.round(numeric);
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
  return [];
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const requestGraphQL = async (query, variables) => {
  try {
    console.log('[leetcodeGraphql] requestGraphQL', {
      queryPreview: typeof query === 'string' ? query.replace(/\s+/g, ' ').trim().slice(0, 500) : null,
      variables,
    });
    const response = await axiosInstance.post('', { query, variables });
    if (response?.data?.errors?.length) {
      const messages = response.data.errors.map((error) => String(error.message || error)).join('; ');
      const err = new Error(messages || 'GraphQL request failed');
      err.response = response;
      throw err;
    }
    const data = response?.data?.data || null;
    console.log('[leetcodeGraphql] raw GraphQL response', {
      hasData: !!data,
      responsePreview: data ? JSON.stringify(data).slice(0, 4000) : null,
    });
    return data;
  } catch (error) {
    console.error('[leetcodeGraphql] requestGraphQL failed', {
      status: error?.response?.status,
      headers: error?.response?.headers,
      data: typeof error?.response?.data === 'object' ? JSON.stringify(error.response.data, null, 2) : error?.response?.data,
      query: typeof query === 'string' ? query.replace(/\s+/g, ' ').trim().slice(0, 400) : null,
      variables,
      message: error?.message,
    });
    throw error;
  }
};

const buildTopicStatistics = (topics) => {
  const topicEntries = safeArray(topics).reduce((accumulator, topic) => {
    const name = safeString(topic?.name || topic?.translatedName || topic?.tagName?.name || topic?.slug);
    if (!name) return accumulator;
    const count = safeInteger(topic?.questionsSolved || topic?.problemsSolved || topic?.totalSolved || topic?.solvedCount || topic?.count);
    if (count !== null) accumulator[name] = count;
    return accumulator;
  }, {});
  return Object.keys(topicEntries).length ? topicEntries : null;
};

const parseSubmissionCalendar = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return safeArray(value)
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const date = safeString(entry.date || entry.day || entry.timestamp || entry.label);
        const count = safeInteger(entry.count || entry.value || entry.score || entry.total);
        if (!date) return null;
        return { date, count: count ?? 0 };
      })
      .filter(Boolean);
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([date, count]) => ({ date: safeString(date), count: safeInteger(count) ?? 0 }))
      .filter((entry) => entry.date);
  }
  if (typeof value === 'string') {
    try {
      return parseSubmissionCalendar(JSON.parse(value));
    } catch (error) {
      return [];
    }
  }
  return [];
};

const calculateActivityMetrics = (calendarEntries) => {
  const entries = safeArray(calendarEntries)
    .map((entry) => ({ ...entry, count: safeInteger(entry?.count) ?? 0 }))
    .filter((entry) => entry?.date);
  const activeEntries = entries.filter((entry) => entry.count > 0).sort((left, right) => String(left.date).localeCompare(String(right.date)));
  const activeDays = activeEntries.length;

  const dateSet = new Set(activeEntries.map((entry) => entry.date));
  let currentStreak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  for (let step = 0; step < 365; step += 1) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(iso)) {
      break;
    }
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let maxStreak = 0;
  let running = 0;
  let previousDate = null;
  for (const entry of activeEntries) {
    const entryDate = new Date(entry.date);
    if (!previousDate) {
      running = 1;
    } else {
      const diffMs = entryDate.getTime() - previousDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (diffMs === oneDayMs) {
        running += 1;
      } else {
        running = 1;
      }
    }
    maxStreak = Math.max(maxStreak, running);
    previousDate = entryDate;
  }

  return {
    activeDays,
    currentStreak,
    maxStreak,
  };
};

const buildNormalizedProfile = (data, username, optionalData = {}) => {
  const profileData = data?.matchedUser || {};
  const profileMeta = profileData.profile || {};
  const contestRanking = optionalData.contestRanking || {};
  const submitStats = profileData.submitStats || {};
  const recentActivity = safeArray(
    profileData.recentAcSubmissionList ||
    profileData.recentSubmissionList ||
    data?.recentAcSubmissionList ||
    data?.recentSubmissionList
  );
  const topicTags = safeArray(profileData.topicTags || profileMeta.topicTags || data?.topicTags);
  const badges = safeArray(optionalData.badges || profileData.badges || profileMeta.badges || data?.badges)
    .map((badge) => ({
      name: safeString(badge?.name || badge?.displayName || badge?.shortName || badge?.slug),
      shortName: safeString(badge?.shortName || badge?.displayName),
      icon: safeString(badge?.icon || badge?.imageUrl),
    }))
    .filter((badge) => badge.name);
  const submissionCalendar = parseSubmissionCalendar(optionalData.submissionCalendar || profileData.submissionCalendar || profileMeta.submissionCalendar || data?.submissionCalendar || data?.matchedUser?.submissionCalendar);
  const activityMetrics = calculateActivityMetrics(submissionCalendar);
  const directCurrentStreak = safeInteger(
    optionalData.currentStreak
    ?? optionalData.dailyStreak
    ?? optionalData.streak
    ?? profileData.currentStreak
    ?? profileData.dailyStreak
    ?? profileData.streak
    ?? profileMeta.currentStreak
    ?? profileMeta.dailyStreak
    ?? profileMeta.streak
    ?? data?.matchedUser?.currentStreak
    ?? data?.matchedUser?.dailyStreak
    ?? data?.matchedUser?.streak
    ?? data?.currentStreak
    ?? data?.dailyStreak
    ?? data?.streak
    ?? null
  );

  const totalSolved = safeNumber(
    submitStats.acSubmissionNum?.find((item) => String(item.difficulty).toLowerCase() === 'all')?.count
  );

  const displayName = safeString(profileMeta.realName || profileData.username || profileMeta.userName);
  const avatar = safeString(profileMeta.userAvatar || profileMeta.avatar);
  const ranking = safeNumber(profileMeta.ranking || contestRanking.globalRanking || contestRanking.global_rank);
  const reputation = safeNumber(profileMeta.reputation);
  const currentRating = safeNumber(contestRanking.rating);
  const country = safeString(profileMeta.countryName || profileMeta.country);
  const aboutMe = safeString(profileMeta.aboutMe || profileMeta.about_me);
  const school = safeString(profileMeta.school);
  const company = safeString(profileMeta.company);
  const skillTags = safeArray(profileMeta.skillTags || profileMeta.skill_tags || profileData.skillTags || profileData.skill_tags)
    .map((tag) => safeString(tag?.name || tag?.label || tag))
    .filter(Boolean);

  if (!avatar) console.warn('[leetcodeGraphql] GraphQL does not expose avatar', { username });
  if (ranking === null) console.warn('[leetcodeGraphql] GraphQL does not expose ranking', { username });
  if (reputation === null) console.warn('[leetcodeGraphql] GraphQL does not expose reputation', { username });
  if (!country) console.warn('[leetcodeGraphql] GraphQL does not expose country', { username });
  if (!aboutMe) console.warn('[leetcodeGraphql] GraphQL does not expose aboutMe', { username });
  if (!school) console.warn('[leetcodeGraphql] GraphQL does not expose school', { username });
  if (!company) console.warn('[leetcodeGraphql] GraphQL does not expose company', { username });
  if (!skillTags.length) console.warn('[leetcodeGraphql] GraphQL does not expose skillTags', { username });
  if (!badges.length) console.warn('[leetcodeGraphql] GraphQL does not expose badges', { username });
  if (!recentActivity.length) console.warn('[leetcodeGraphql] GraphQL does not expose recent submissions', { username });
  if (!submissionCalendar.length) console.warn('[leetcodeGraphql] GraphQL does not expose submissionCalendar', { username });
  if (currentRating === null) console.warn('[leetcodeGraphql] GraphQL does not expose currentRating', { username });

  const normalized = {
    platform: 'leetcode',
    username: safeString(profileData.username) || safeString(username) || null,
    profileStatus: 'active',
    success: true,
    error: null,
    profile: {
      displayName,
      avatar,
      profileUrl: safeString((profileData.username ? `https://leetcode.com/u/${encodeURIComponent(profileData.username)}/` : null)),
      ranking,
      reputation,
      currentRating,
      currentStreak: null,
      maxStreak: null,
      activeDays: null,
      country,
      aboutMe,
      school,
      company,
      skillTags,
      contestRating: currentRating,
      submissionCalendar,
    },
    solved: {
      total: totalSolved,
      easy: safeNumber(submitStats.acSubmissionNum?.find((item) => String(item.difficulty).toLowerCase() === 'easy')?.count),
      medium: safeNumber(submitStats.acSubmissionNum?.find((item) => String(item.difficulty).toLowerCase() === 'medium')?.count),
      hard: safeNumber(submitStats.acSubmissionNum?.find((item) => String(item.difficulty).toLowerCase() === 'hard')?.count),
    },
    topics: safeArray(topicTags)
      .map((topic) => ({
        name: safeString(topic.name || topic.translatedName || topic.slug),
        slug: safeString(topic.slug),
        solved: safeNumber(topic.questionsSolved || topic.problemsSolved || topic.totalSolved || topic.solvedCount),
      }))
      .filter((topic) => topic.name),
    topicStatistics: buildTopicStatistics(topicTags),
    recentQuestions: recentActivity
      .slice(0, 10)
      .map((item) => ({
        title: safeString(item.title),
        slug: safeString(item.titleSlug),
        timestamp: normalizeDate(item.timestamp),
      })),
    recentSubmissions: recentActivity
      .slice(0, 10)
      .map((item) => ({
        title: safeString(item.title),
        slug: safeString(item.titleSlug),
        timestamp: normalizeDate(item.timestamp),
      })),
    badges,
    contests: [],
  };

  normalized.profile.currentStreak = directCurrentStreak ?? safeInteger(activityMetrics.currentStreak ?? null);
  normalized.profile.maxStreak = safeInteger(optionalData.maxStreak ?? activityMetrics.maxStreak ?? null);
  normalized.profile.activeDays = safeInteger(optionalData.activeDays ?? activityMetrics.activeDays ?? null);

  console.log('[leetcodeGraphql] merged profile object', {
    username: normalized.username,
    profileUrl: normalized.profile.profileUrl,
    avatar: normalized.profile.avatar,
    ranking: normalized.profile.ranking,
    reputation: normalized.profile.reputation,
    currentRating: normalized.profile.currentRating,
    solvedTotal: normalized.solved.total,
    easySolved: normalized.solved.easy,
    mediumSolved: normalized.solved.medium,
    hardSolved: normalized.solved.hard,
    activeDays: normalized.profile.activeDays,
    currentStreak: normalized.profile.currentStreak,
    maxStreak: normalized.profile.maxStreak,
    topicStatistics: normalized.topicStatistics,
    recentQuestionsLength: normalized.recentQuestions.length,
  });

  return normalized;
};

const fetchSubmissionCalendar = async (username) => {
  const query = `query userSubmissionCalendar($username: String!) {
    matchedUser(username: $username) {
      submissionCalendar
    }
  }`;

  try {
    const data = await requestGraphQL(query, { username });
    const calendarValue = data?.matchedUser?.submissionCalendar || data?.submissionCalendar;
    if (calendarValue === undefined || calendarValue === null) {
      console.warn('[leetcodeGraphql] GraphQL does not expose submissionCalendar', { username });
      return [];
    }
    return parseSubmissionCalendar(calendarValue);
  } catch (error) {
    console.warn('[leetcodeGraphql] GraphQL does not expose submissionCalendar', { username, message: error.message });
    return [];
  }
};

const fetchContestRanking = async (username) => {
  const query = `query userContestInfo($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
      badge {
        name
      }
    }
  }`;

  try {
    const data = await requestGraphQL(query, { username });
    const ranking = data?.userContestRanking;
    if (!ranking) {
      console.warn('[leetcodeGraphql] GraphQL does not expose contest ranking', { username });
      return null;
    }
    return ranking;
  } catch (error) {
    console.warn('[leetcodeGraphql] GraphQL does not expose contest ranking', { username, message: error.message });
    return null;
  }
};

const fetchBadges = async (username) => {
  const query = `query userBadges($username: String!) {
    matchedUser(username: $username) {
      badges {
        name
        shortName
        displayName
        icon
      }
    }
  }`;

  try {
    const data = await requestGraphQL(query, { username });
    const badges = data?.matchedUser?.badges || data?.badges;
    if (!badges) {
      console.warn('[leetcodeGraphql] GraphQL does not expose badges', { username });
      return [];
    }
    return safeArray(badges);
  } catch (error) {
    console.warn('[leetcodeGraphql] GraphQL does not expose badges', { username, message: error.message });
    return [];
  }
};

const fetchLeetCodeProfile = async (username) => {
  const normalizedUsername = safeString(username);
  if (!normalizedUsername) {
    throw new Error('Username is required to fetch LeetCode profile');
  }

  const fullQuery = `query userProfile($username: String!, $limit: Int!) {
    matchedUser(username: $username) {
      username
      profile {
        userAvatar
        realName
        reputation
        ranking
        countryName
        company
        school
        aboutMe
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
    recentSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }`;

  try {
    console.log('[leetcodeGraphql] fetchLeetCodeProfile start', { username: normalizedUsername });
    const data = await requestGraphQL(fullQuery, { username: normalizedUsername, limit: 10 });
    console.log('[leetcodeGraphql] fetchLeetCodeProfile response keys', { username: normalizedUsername, hasData: !!data, dataKeys: data ? Object.keys(data) : null });
    const [calendarEntries, badges, contestRanking] = await Promise.all([
      fetchSubmissionCalendar(normalizedUsername),
      fetchBadges(normalizedUsername),
      fetchContestRanking(normalizedUsername),
    ]);
    if (calendarEntries.length) {
      console.log('[leetcodeGraphql] submissionCalendar parsed', { username: normalizedUsername, entries: calendarEntries.length });
    } else {
      console.warn('[leetcodeGraphql] GraphQL does not expose submissionCalendar', { username: normalizedUsername });
    }
    const normalized = buildNormalizedProfile({
      ...data,
      submissionCalendar: calendarEntries,
    }, normalizedUsername, {
      submissionCalendar: calendarEntries,
      badges,
      contestRanking,
    });
    console.log('[leetcodeGraphql] normalized profile', {
      username: normalizedUsername,
      recentQuestionsLength: safeArray(normalized.recentQuestions).length,
      currentRating: normalized.profile?.currentRating,
      solvedTotal: normalized.solved?.total,
      activeDays: normalized.profile?.activeDays,
      currentStreak: normalized.profile?.currentStreak,
      maxStreak: normalized.profile?.maxStreak,
      topicStatistics: normalized.topicStatistics,
    });
    return normalized;
  } catch (error) {
    console.error('[leetcodeGraphql] fetchLeetCodeProfile failed', { username: normalizedUsername, message: error.message });
    throw new Error(`Failed to fetch LeetCode profile for ${normalizedUsername}: ${error.message}`);
  }
};

module.exports = {
  buildNormalizedProfile,
  fetchLeetCodeProfile,
};
