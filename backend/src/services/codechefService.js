const axios = require('axios');
const { normalizePlatform } = require('../utils/platformUtils');

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
});

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

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isTransientFailure = (error) => {
  const status = error?.response?.status;
  const message = `${error?.message || ''} ${error?.code || ''}`.toLowerCase();
  return status === 403 || status === 429 || message.includes('cloudflare') || message.includes('timeout') || message.includes('timed out') || message.includes('network');
};

const buildEmptyResponse = (username, profileStatus = 'failed') => ({
  platform: 'codechef',
  username: safeString(username) || null,
  profileStatus,
  lastFetched: new Date().toISOString(),
  rating: null,
  rank: null,
  problemsSolved: null,
  badges: [],
  contests: [],
  recentProblems: [],
});

const buildNormalizedResponse = ({ username, profileStatus, rating, rank, problemsSolved, badges, contests, recentProblems }) => ({
  platform: 'codechef',
  username: safeString(username) || null,
  profileStatus,
  lastFetched: new Date().toISOString(),
  rating: safeNumber(rating),
  rank: safeNumber(rank),
  problemsSolved: safeNumber(problemsSolved),
  badges: safeArray(badges),
  contests: safeArray(contests),
  recentProblems: safeArray(recentProblems),
});

const extractFromHtml = (html) => {
  const source = String(html || '');
  const ratingMatch = source.match(/rating-number\s*">\s*([\d,]+)/i) || source.match(/"currentRating"\s*:\s*(\d+)/i);
  const highestRatingMatch = source.match(/Highest Rating[^0-9]*(\d+)/i) || source.match(/"highestRating"\s*:\s*(\d+)/i);
  const starsMatch = source.match(/rating-star\s*">\s*([^<]+)/i);
  const problemsMatch = source.match(/Problems solved\s*<span[^>]*>([\d,]+)/i) || source.match(/"problemsSolved"\s*:\s*(\d+)/i);
  const globalRankMatch = source.match(/Global rank\s*<span[^>]*>#?([\d,]+)/i) || source.match(/"globalRank"\s*:\s*(\d+)/i);
  const countryRankMatch = source.match(/Country rank\s*<span[^>]*>#?([\d,]+)/i) || source.match(/"countryRank"\s*:\s*(\d+)/i);
  const contestMatches = [...source.matchAll(/<a[^>]+href="\/contests\/[^"#]+"[^>]*>([^<]+)<\/a>/gi)].map((match) => safeString(match[1])).filter(Boolean).slice(0, 5);
  const problemMatches = [...source.matchAll(/href="\/problems\/([^"#]+)"/gi)].map((match) => safeString(match[1])).filter(Boolean).slice(0, 5);
  const badgeCountMatch = source.match(/Badges<\/strong>[^<]*<span[^>]*>(\d+)/i);

  return {
    rating: ratingMatch ? safeNumber(ratingMatch[1]) : null,
    highestRating: highestRatingMatch ? safeNumber(highestRatingMatch[1]) : null,
    stars: starsMatch ? safeString(starsMatch[1]) : null,
    problemsSolved: problemsMatch ? safeNumber(problemsMatch[1]) : null,
    globalRank: globalRankMatch ? safeNumber(globalRankMatch[1]) : null,
    countryRank: countryRankMatch ? safeNumber(countryRankMatch[1]) : null,
    contests: contestMatches.map((name) => ({ contestName: name, contestDate: null, rank: null, rating: null, ratingChange: null, problemsSolved: null })),
    recentProblems: problemMatches.map((slug) => ({ title: slug, difficulty: null, url: `https://www.codechef.com/problems/${slug}`, solvedDate: null })),
    badges: badgeCountMatch ? [{ name: 'badges', value: safeNumber(badgeCountMatch[1]) }] : [],
  };
};

const fetchProfile = async (username) => {
  const normalizedUsername = safeString(username);
  if (!normalizedUsername) return buildEmptyResponse(username, 'failed');

  const normalizedPlatform = normalizePlatform('codechef');
  if (!normalizedPlatform) return buildEmptyResponse(normalizedUsername, 'failed');

  try {
    const response = await axiosInstance.get(`https://www.codechef.com/users/${encodeURIComponent(normalizedUsername)}`);
    const parsed = extractFromHtml(response?.data || '');

    return buildNormalizedResponse({
      username: normalizedUsername,
      profileStatus: parsed.rating || parsed.problemsSolved || parsed.globalRank ? 'active' : 'estimated',
      rating: parsed.rating,
      rank: parsed.globalRank || parsed.countryRank,
      problemsSolved: parsed.problemsSolved,
      badges: parsed.badges,
      contests: parsed.contests,
      recentProblems: parsed.recentProblems,
    });
  } catch (error) {
    return buildEmptyResponse(normalizedUsername, isTransientFailure(error) ? 'estimated' : 'failed');
  }
};

const fetchCodeChefProfile = fetchProfile;
const fetchCodeChefContests = async (username) => {
  const data = await fetchProfile(username);
  return data.contests || [];
};

module.exports = {
  fetchProfile,
  fetchCodeChefProfile,
  fetchCodeChefContests,
};
