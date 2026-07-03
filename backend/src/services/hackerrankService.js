const axios = require('axios');
const { normalizePlatform } = require('../utils/platformUtils');

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json, text/plain, */*',
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

const safeObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return null;
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

const getResponseData = (response) => {
  if (!response || !response.data) return null;
  return response.data.model || response.data;
};

const buildEmptyResponse = (username, profileStatus = 'failed') => ({
  platform: 'hackerrank',
  username: safeString(username) || null,
  profileStatus,
  lastFetched: new Date().toISOString(),
  rating: null,
  rank: null,
  problemsSolved: null,
  badges: [],
  skills: [],
  certifications: [],
  languageBadges: [],
  challengeTracks: [],
  contests: [],
  recentProblems: [],
  fullName: null,
  country: null,
  profileUrl: null,
  avatarUrl: null,
});

const buildNormalizedResponse = ({
  username,
  profileStatus,
  rating,
  rank,
  problemsSolved,
  badges,
  skills,
  certifications,
  languageBadges,
  challengeTracks,
  contests,
  recentProblems,
  fullName,
  country,
  profileUrl,
  avatarUrl,
}) => ({
  platform: 'hackerrank',
  username: safeString(username) || null,
  profileStatus,
  lastFetched: new Date().toISOString(),
  rating: safeNumber(rating),
  rank: safeNumber(rank),
  problemsSolved: safeNumber(problemsSolved),
  badges: safeArray(badges),
  skills: safeArray(skills),
  certifications: safeArray(certifications),
  languageBadges: safeArray(languageBadges),
  challengeTracks: safeArray(challengeTracks),
  contests: safeArray(contests),
  recentProblems: safeArray(recentProblems),
  fullName: safeString(fullName),
  country: safeString(country),
  profileUrl: safeString(profileUrl),
  avatarUrl: safeString(avatarUrl),
});

const normalizeBadgeEntry = (badge) => {
  if (!badge) return null;
  if (typeof badge === 'string') return { name: safeString(badge) };

  const name = safeString(badge.name || badge.title || badge.badge_name || badge.badgeName || badge.label || badge.trackName || badge.challengeName);
  if (!name) return null;

  const value = safeString(badge.value || badge.level || badge.rank || badge.points || badge.score || badge.starCount);
  const type = safeString(badge.type || badge.category || badge.badgeType || badge.trackType || badge.kind);
  const icon = safeString(badge.icon || badge.image || badge.imageUrl || badge.logo);

  // Extract raw stars if present in the API (common keys: stars, starCount, star_count)
  const rawStars = (() => {
    const candidate = badge.stars ?? badge.starCount ?? badge.star_count ?? (badge.value !== undefined && badge.value !== null && !Number.isNaN(Number(badge.value)) ? Number(badge.value) : undefined);
    return safeNumber(candidate);
  })();

  // Use the API-provided stars value directly when present. Keep `starsRaw` for traceability.
  const starsRaw = rawStars;
  const stars = starsRaw != null ? Number(starsRaw) : null;

  return {
    name,
    value,
    type,
    icon,
    starsRaw,
    stars,
  };
};

const normalizeSkillEntry = (skill) => {
  if (!skill) return null;
  if (typeof skill === 'string') return { name: safeString(skill) };

  const name = safeString(skill.name || skill.language || skill.skill || skill.title || skill.label);
  if (!name) return null;

  return {
    name,
    value: safeString(skill.score || skill.level || skill.rating || skill.value || skill.percent || skill.completion || skill.progress),
  };
};

const normalizeChallengeTrackEntry = (track) => {
  if (!track) return null;
  if (typeof track === 'string') return { name: safeString(track) };

  const name = safeString(track.name || track.title || track.trackName || track.challengeName || track.label);
  if (!name) return null;

  return {
    name,
    value: safeString(track.value || track.status || track.progress || track.level),
    type: safeString(track.type || track.category || track.trackType),
  };
};

const normalizeRecentProblemEntry = (entry) => {
  if (!entry) return null;
  const title = safeString(entry.title || entry.problem_name || entry.problemName || entry.challenge || entry.name || entry.challengeName);
  if (!title) return null;

  return {
    title,
    difficulty: safeString(entry.difficulty || entry.level || entry.category || entry.status),
    url: safeString(entry.link || entry.url || entry.problem_url || entry.problemUrl),
    solvedDate: normalizeDate(entry.solved_at || entry.solvedAt || entry.completed_at || entry.completedAt || entry.date || entry.timestamp),
  };
};

const extractArrayEntries = (data, keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null) {
      return safeArray(value);
    }
  }
  return [];
};

const fetchHackerRankProfileData = async (username) => {
  const endpoints = [
    `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}`,
    `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/profile`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axiosInstance.get(endpoint);
      const data = getResponseData(response);
      if (data && Object.keys(data).length > 0) {
        return data;
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }
  return null;
};

const fetchHackerRankBadges = async (username) => {
  try {
    const response = await axiosInstance.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`);
    const data = getResponseData(response);
    if (!data) return [];
    return safeArray(data.models || data.badges || data.items || data);
  } catch (error) {
    if (isTransientFailure(error)) return [];
    return [];
  }
};

const mergeBadgeSources = (profileBadges, badgeModels) => {
  const badges = [
    ...safeArray(profileBadges).map(normalizeBadgeEntry),
    ...safeArray(badgeModels).map(normalizeBadgeEntry),
  ].filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const badge of badges) {
    const key = `${badge.name}:${badge.value || ''}:${badge.type || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(badge);
    }
  }

  return unique;
};

const extractHackerRankSkills = (data) => {
  const candidates = [
    ...extractArrayEntries(data, ['skills', 'skill_list', 'skills_list', 'skillProgress', 'languageProgress', 'languages', 'language_progress', 'languageProgress']),
  ];
  return candidates.map(normalizeSkillEntry).filter(Boolean);
};

const extractHackerRankChallengeTracks = (data) => {
  const candidates = [
    ...extractArrayEntries(data, ['challengeTracks', 'challenge_tracks', 'tracks', 'trackProgress', 'track_progress']),
  ];
  return candidates.map(normalizeChallengeTrackEntry).filter(Boolean);
};

const extractHackerRankCertifications = (data) => {
  const candidates = [
    ...extractArrayEntries(data, ['certifications', 'certs', 'certificationList', 'certification_list', 'certificates']),
  ];
  return candidates.map((entry) => {
    if (typeof entry === 'string') return { name: safeString(entry) };
    const name = safeString(entry.name || entry.title || entry.certification || entry.certificate || entry.label);
    if (!name) return null;
    return {
      name,
      date: normalizeDate(entry.completedAt || entry.completed_at || entry.issuedOn || entry.issued_on || entry.date),
      url: safeString(entry.url || entry.link),
    };
  }).filter(Boolean);
};

const extractHackerRankLanguageBadges = (data) => {
  const candidates = [
    ...extractArrayEntries(data, ['languageBadges', 'language_badges', 'languages', 'languageProgress', 'skills', 'skills_list', 'skill_list']),
  ];
  return candidates.map(normalizeSkillEntry).filter(Boolean);
};

const extractHackerRankRecentProblems = (data) => {
  const candidates = [
    ...extractArrayEntries(data, ['recent_submissions', 'recentProblems', 'recent_problems', 'recentActivity', 'recent_activity', 'activities', 'activity']),
  ];
  return candidates.map(normalizeRecentProblemEntry).filter(Boolean);
};

const fetchProfile = async (username) => {
  const normalizedUsername = safeString(username);
  if (!normalizedUsername) return buildEmptyResponse(username, 'failed');

  const normalizedPlatform = normalizePlatform('hackerrank');
  if (!normalizedPlatform) return buildEmptyResponse(normalizedUsername, 'failed');

  try {
    const [profileData, badgeModels] = await Promise.all([
      fetchHackerRankProfileData(normalizedUsername),
      fetchHackerRankBadges(normalizedUsername),
    ]);

    const data = safeObject(profileData) || {};
    const badges = mergeBadgeSources(data.badges || data.badges_list || data.badgesList || [], badgeModels);
    const skills = extractHackerRankSkills(data);
    const certifications = extractHackerRankCertifications(data);
    const languageBadges = extractHackerRankLanguageBadges(data);
    const challengeTracks = extractHackerRankChallengeTracks(data);
    const recentProblems = extractHackerRankRecentProblems(data);

    return buildNormalizedResponse({
      username: data.hacker_name || data.name || normalizedUsername,
      profileStatus: Object.keys(data).length > 0 ? 'active' : 'estimated',
      rating: null,
      rank: data.globalRank || data.global_rank || data.rank || null,
      problemsSolved: data.totalSolvedProblems || data.solved_count || data.problemsSolved || null,
      badges,
      skills,
      certifications,
      languageBadges,
      challengeTracks,
      contests: [],
      recentProblems,
      fullName: data.name || data.fullName || data.displayName || null,
      country: data.country || data.countryName || null,
      profileUrl: data.profileUrl || data.profile_url || `https://www.hackerrank.com/profile/${encodeURIComponent(normalizedUsername)}`,
      avatarUrl: data.avatar || data.avatar_url || data.avatarUrl || null,
    });
  } catch (error) {
    return buildEmptyResponse(normalizedUsername, isTransientFailure(error) ? 'estimated' : 'failed');
  }
};

const fetchHackerRankProfile = fetchProfile;
const fetchHackerRankContests = async (username) => {
  const data = await fetchProfile(username);
  return data.contests || [];
};

module.exports = {
  fetchProfile,
  fetchHackerRankProfile,
  fetchHackerRankContests,
};
