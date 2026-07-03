const { normalizePlatform } = require('../utils/platformUtils');
const leetcodeGraphqlService = require('./leetcodeGraphql.service');
const leetcodeScraper = require('../playwright/leetcodeScraper');

const safeString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text || null;
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
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
};

const safeObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return null;
};

const buildEmptyResponse = (username, profileStatus = 'failed', error = null) => ({
  platform: 'leetcode',
  username: safeString(username) || null,
  profileStatus,
  success: false,
  error: safeString(error) || 'Failed to fetch LeetCode profile',
  lastFetched: new Date().toISOString(),
  rating: null,
  rank: null,
  problemsSolved: null,
  easySolved: null,
  mediumSolved: null,
  hardSolved: null,
  activeDays: null,
  currentStreak: null,
  maxStreak: null,
  lastActiveDate: null,
  profileUrl: null,
  avatarUrl: null,
  reputation: null,
  displayName: null,
  country: null,
  contestRating: null,
  contestsAttended: null,
  topPercentage: null,
  totalSolved: null,
  activityCalendar: null,
  recentSubmissions: [],
  topics: [],
  topicStatistics: null,
  badges: [],
  contests: [],
  recentProblems: [],
});

const buildNormalizedResponse = ({ username, profileStatus, rating, rank, problemsSolved, easySolved, mediumSolved, hardSolved, activeDays, currentStreak, maxStreak, lastActiveDate, profileUrl, avatarUrl, reputation, displayName, country, contestRating, contestsAttended, topPercentage, totalSolved, activityCalendar, recentSubmissions, topics, topicStatistics, badges, contests, recentProblems, error = null }) => ({
  platform: 'leetcode',
  username: safeString(username) || null,
  profileStatus,
  success: true,
  error: safeString(error) || null,
  lastFetched: new Date().toISOString(),
  rating: safeNumber(rating),
  rank: safeNumber(rank),
  problemsSolved: safeNumber(problemsSolved),
  totalSolved: safeNumber(totalSolved),
  easySolved: safeNumber(easySolved),
  mediumSolved: safeNumber(mediumSolved),
  hardSolved: safeNumber(hardSolved),
  activeDays: safeNumber(activeDays),
  currentStreak: safeNumber(currentStreak),
  maxStreak: safeNumber(maxStreak),
  lastActiveDate: safeString(lastActiveDate),
  profileUrl: safeString(profileUrl),
  avatarUrl: safeString(avatarUrl),
  reputation: safeNumber(reputation),
  displayName: safeString(displayName),
  country: safeString(country),
  contestRating: safeNumber(contestRating),
  contestsAttended: safeInteger(contestsAttended),
  topPercentage: safeNumber(topPercentage),
  activityCalendar: safeArray(activityCalendar),
  recentSubmissions: safeArray(recentSubmissions),
  topics: safeArray(topics),
  topicStatistics: safeObject(topicStatistics),
  badges: safeArray(badges),
  contests: safeArray(contests),
  recentProblems: safeArray(recentProblems),
});

const fetchProfile = async (username) => {
  const normalizedUsername = safeString(username);
  if (!normalizedUsername) return buildEmptyResponse(username, 'failed');

  const normalizedPlatform = normalizePlatform('leetcode');
  if (!normalizedPlatform) return buildEmptyResponse(normalizedUsername, 'failed');

  const hasValue = (value) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };

  try {
    const graphqlProfile = await leetcodeGraphqlService.fetchLeetCodeProfile(normalizedUsername);

    // Determine if important fields are missing from GraphQL and need Playwright fallback
    const needsFallback = (() => {
      const profile = graphqlProfile?.profile || {};
      const solved = graphqlProfile?.solved || {};
      const topicStats = graphqlProfile?.topicStatistics;
      const recent = graphqlProfile?.recentSubmissions || graphqlProfile?.recentQuestions;

      const checks = [
        graphqlProfile?.username,
        profile?.displayName,
        profile?.profileUrl,
        profile?.avatar,
        profile?.country,
        profile?.ranking,
        solved?.total,
        solved?.easy,
        solved?.medium,
        solved?.hard,
        profile?.activeDays,
        profile?.maxStreak,
        profile?.currentStreak,
        topicStats,
        recent,
      ];

      return checks.some((v) => !hasValue(v));
    })();

    let scraperProfile = null;
    if (needsFallback) {
      try {
        console.log('[leetcodeService] GraphQL missing fields, invoking Playwright fallback', { username: normalizedUsername });
        scraperProfile = await leetcodeScraper.fetchLeetCodeProfile(normalizedUsername);
      } catch (scrapeErr) {
        console.warn('[leetcodeService] Playwright fallback failed', { username: normalizedUsername, message: scrapeErr?.message });
      }
    }

    // Merge fields: prefer GraphQL, fall back to scraperProfile when GraphQL is missing or empty
    const pick = (g, s) => (hasValue(g) ? g : (hasValue(s) ? s : null));

    // Contests: prefer GraphQL contests, otherwise use scraper contests
    let mergedContests = safeArray(graphqlProfile?.contests);
    if (!mergedContests.length && scraperProfile) {
      mergedContests = safeArray(scraperProfile?.contests);
    }

    const directCurrentStreak = safeNumber(scraperProfile?.currentStreak ?? graphqlProfile?.profile?.currentStreak ?? graphqlProfile?.currentStreak ?? graphqlProfile?.dailyStreak ?? graphqlProfile?.streak ?? graphqlProfile?.profile?.dailyStreak ?? graphqlProfile?.profile?.streak);
    const merged = buildNormalizedResponse({
      username: pick(graphqlProfile?.username, scraperProfile?.username) || normalizedUsername,
      profileStatus: graphqlProfile?.profileStatus || (scraperProfile ? scraperProfile.profileStatus : 'active') || 'active',
      rating: pick(graphqlProfile?.profile?.currentRating, scraperProfile?.rating || scraperProfile?.contestRating),
      rank: pick(graphqlProfile?.profile?.ranking, scraperProfile?.rank || scraperProfile?.globalRank),
      problemsSolved: pick(graphqlProfile?.solved?.total, scraperProfile?.totalSolved || scraperProfile?.problemsSolved),
      totalSolved: pick(graphqlProfile?.solved?.total, scraperProfile?.totalSolved || scraperProfile?.problemsSolved),
      easySolved: pick(graphqlProfile?.solved?.easy, scraperProfile?.easySolved),
      mediumSolved: pick(graphqlProfile?.solved?.medium, scraperProfile?.mediumSolved),
      hardSolved: pick(graphqlProfile?.solved?.hard, scraperProfile?.hardSolved),
      activeDays: pick(scraperProfile?.totalActiveDays ?? scraperProfile?.activeDays, graphqlProfile?.profile?.activeDays),
      currentStreak: directCurrentStreak,
      maxStreak: pick(scraperProfile?.maxStreak, graphqlProfile?.profile?.maxStreak),
      lastActiveDate: null,
      profileUrl: pick(graphqlProfile?.profile?.profileUrl, scraperProfile?.profileUrl) || null,
      avatarUrl: pick(graphqlProfile?.profile?.avatar, scraperProfile?.avatar || scraperProfile?.avatarUrl) || null,
      reputation: pick(graphqlProfile?.profile?.reputation, scraperProfile?.reputation) || null,
      displayName: pick(graphqlProfile?.profile?.displayName, scraperProfile?.displayName) || null,
      country: pick(graphqlProfile?.profile?.country, scraperProfile?.country) || null,
      contestRating: pick(graphqlProfile?.profile?.contestRating, scraperProfile?.contestRating) || null,
      contestsAttended: pick(null, scraperProfile?.contestsAttended) || null,
      topPercentage: pick(null, scraperProfile?.topPercentage) || null,
      activityCalendar: safeArray(graphqlProfile?.profile?.submissionCalendar).length ? safeArray(graphqlProfile?.profile?.submissionCalendar) : safeArray(scraperProfile?.activityCalendar),
      recentSubmissions: safeArray(graphqlProfile?.recentSubmissions).length ? safeArray(graphqlProfile?.recentSubmissions) : safeArray(scraperProfile?.recentSubmissions),
      topics: safeArray(graphqlProfile?.topics).length ? safeArray(graphqlProfile?.topics) : safeArray(scraperProfile?.topics),
      topicStatistics: safeObject(graphqlProfile?.topicStatistics) || safeObject(scraperProfile?.topicStatistics) || null,
      badges: safeArray(graphqlProfile?.badges).length ? safeArray(graphqlProfile?.badges) : safeArray(scraperProfile?.badges),
      contests: mergedContests,
      recentProblems: safeArray(graphqlProfile?.recentQuestions).length ? safeArray(graphqlProfile?.recentQuestions) : safeArray(scraperProfile?.recentProblems),
    });

    // attach raw sources for logging downstream
    merged._graphql = graphqlProfile || null;
    merged._playwright = scraperProfile || null;

    return merged;
  } catch (graphqlError) {
    console.error('LeetCode GraphQL profile fetch failed', {
      username: normalizedUsername,
      message: graphqlError?.message || graphqlError,
    });
    return buildEmptyResponse(normalizedUsername, 'failed', graphqlError?.message || 'LeetCode GraphQL profile fetch failed');
  }
};

const fetchLeetCodeProfile = fetchProfile;
const fetchLeetCodeContests = async (username) => {
  const data = await fetchProfile(username);
  return data.contests || [];
};

module.exports = {
  fetchProfile,
  fetchLeetCodeProfile,
  fetchLeetCodeContests,
};
