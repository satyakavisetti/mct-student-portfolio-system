const axios = require('axios');
const { normalizePlatform } = require('../utils/platformUtils');

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/vnd.github+json',
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
  platform: 'github',
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
  platform: 'github',
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

const fetchProfile = async (username) => {
  const normalizedUsername = safeString(username);
  if (!normalizedUsername) return buildEmptyResponse(username, 'failed');

  const normalizedPlatform = normalizePlatform('github');
  if (!normalizedPlatform) return buildEmptyResponse(normalizedUsername, 'failed');

  try {
    const [profileResponse, repoResponse] = await Promise.all([
      axiosInstance.get(`https://api.github.com/users/${encodeURIComponent(normalizedUsername)}`),
      axiosInstance.get(`https://api.github.com/users/${encodeURIComponent(normalizedUsername)}/repos?per_page=5&sort=updated`),
    ]);

    const profile = profileResponse?.data || {};
    const repos = safeArray(repoResponse?.data);

    const badges = [
      { name: 'followers', value: safeNumber(profile.followers) },
      { name: 'following', value: safeNumber(profile.following) },
      { name: 'publicRepos', value: safeNumber(profile.public_repos) },
    ].filter((item) => item.value !== null);

    const recentProblems = repos.map((repo) => ({
      title: safeString(repo.name),
      difficulty: null,
      url: safeString(repo.html_url),
      solvedDate: normalizeDate(repo.updated_at),
    }));

    return buildNormalizedResponse({
      username: profile.login || normalizedUsername,
      profileStatus: profile.login ? 'active' : 'estimated',
      rating: null,
      rank: null,
      problemsSolved: null,
      badges,
      contests: [],
      recentProblems,
    });
  } catch (error) {
    return buildEmptyResponse(normalizedUsername, isTransientFailure(error) ? 'estimated' : 'failed');
  }
};

const fetchGitHubProfile = fetchProfile;
const fetchGitHubContributions = async (username) => {
  return fetchProfile(username);
};

module.exports = {
  fetchProfile,
  fetchGitHubProfile,
  fetchGitHubContributions,
};
