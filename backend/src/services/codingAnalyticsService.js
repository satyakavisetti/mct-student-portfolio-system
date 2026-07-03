const { getStudentHandles } = require('../db/codingHandles');
const analyticsDb = require('../db/codingAnalytics');

const safeNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const safeString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
};

const safeJSON = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
  if (typeof value === 'object') return value;
  return null;
};

const groupByPlatform = (rows) => {
  const grouped = {};
  for (const row of rows || []) {
    const platform = safeString(row.platform) || 'unknown';
    grouped[platform] = grouped[platform] || [];
    grouped[platform].push(row);
  }
  return grouped;
};

const computeLeaderboardScore = (profile) => {
  const rating = safeNumber(profile.current_rating ?? profile.rating ?? profile.max_rating) || 0;
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_problems) || 0;
  const contestCount = safeNumber(profile.contest_count) || 0;
  const reputation = safeNumber(profile.reputation) || 0;
  const globalRank = safeNumber(profile.global_rank);
  const rankBonus = globalRank ? Math.max(0, 1000 - globalRank) / 100 : 0;
  return Math.round(rating * 2 + problemsSolved * 3 + contestCount * 10 + reputation / 10 + rankBonus);
};

const buildProfileSummary = (profile) => {
  if (!profile) return null;
  const rating = safeNumber(profile.current_rating ?? profile.rating ?? profile.max_rating);
  const problemsSolved = safeNumber(profile.problems_solved ?? profile.total_problems ?? profile.total_solved);
  const contestCount = safeNumber(profile.contest_count);

  return {
    id: profile.id,
    studentId: profile.student_id,
    platform: safeString(profile.platform),
    username: safeString(profile.username),
    profileStatus: safeString(profile.profile_status) || 'failed',
    rating,
    maxRating: safeNumber(profile.max_rating),
    problemsSolved,
    contestCount,
    globalRank: safeNumber(profile.global_rank),
    countryRank: safeNumber(profile.country_rank),
    reputation: safeNumber(profile.reputation),
    starsBadges: safeString(profile.stars_badges),
    codingScore: safeNumber(profile.coding_score),
    lastSync: profile.last_sync_date || profile.last_sync || null,
    score: computeLeaderboardScore(profile),
    activeDays: safeNumber(profile.total_active_days ?? profile.active_days),
    totalActiveDays: safeNumber(profile.total_active_days ?? profile.active_days),
    currentStreak: safeNumber(profile.current_streak),
    maxStreak: safeNumber(profile.max_streak),
    topicStatistics: safeJSON(profile.topic_statistics ?? profile.topic_stats ?? profile.topicStatistics),
    activityCalendar: safeJSON(profile.activity_calendar ?? profile.activityCalendar),
    recentSubmissions: safeJSON(profile.recent_submissions ?? profile.recentSubmissions),
    analytics: {
      badgesAnalysis: profile.badges_analysis ? safeString(profile.badges_analysis) : null,
      achievementsAnalysis: profile.achievements_analysis ? safeString(profile.achievements_analysis) : null,
      dataVerificationStatus: safeString(profile.data_verification_status),
      estimatedSkillLevel: safeString(profile.estimated_skill_level),
      estimatedProgressScore: safeNumber(profile.estimated_progress_score),
    },
    createdAt: profile.created_at || null,
    updatedAt: profile.updated_at || null,
  };
};

const buildContestRecord = (contest) => {
  if (!contest) return null;
  return {
    id: contest.id,
    studentId: contest.student_id,
    platform: safeString(contest.platform),
    contestId: safeString(contest.contest_id),
    contestName: safeString(contest.contest_name),
    contestUrl: safeString(contest.contest_url),
    contestDate: contest.contest_date || null,
    rank: safeNumber(contest.rank),
    ratingBefore: safeNumber(contest.rating_before),
    ratingAfter: safeNumber(contest.rating_after),
    ratingChange: safeNumber(contest.rating_change),
    details: contest.details || null,
    createdAt: contest.created_at || null,
    updatedAt: contest.updated_at || null,
  };
};

const buildTimeSeriesRecord = (record) => {
  if (!record) return null;
  return {
    id: record.id,
    studentId: record.student_id,
    platform: safeString(record.platform),
    rating: safeNumber(record.rating),
    maxRating: safeNumber(record.max_rating),
    problemsSolved: safeNumber(record.problems_solved),
    globalRank: safeNumber(record.global_rank),
    countryRank: safeNumber(record.country_rank),
    starsBadges: safeString(record.stars_badges),
    recordedDate: record.recorded_date || null,
    createdAt: record.created_at || null,
  };
};

const getStudentAnalytics = async (studentId) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) {
    return null;
  }

  const [profiles, contests, statistics, history, handles] = await Promise.all([
    analyticsDb.getCodingProfilesForStudent(normalizedStudentId),
    analyticsDb.getContestHistoryForStudent(normalizedStudentId),
    analyticsDb.getCodingStatisticsForStudent(normalizedStudentId),
    analyticsDb.getCodingProfileHistoryForStudent(normalizedStudentId),
    getStudentHandles(normalizedStudentId),
  ]);

  const platformProfiles = (profiles || []).map(buildProfileSummary);
  const contestHistory = groupByPlatform((contests || []).map(buildContestRecord));
  const statisticsTimeline = (statistics || []).map(buildTimeSeriesRecord);
  const profileHistory = (history || []).map(buildTimeSeriesRecord);

  const totalContests = (contests || []).length;
  const totalProblemsSolved = (profiles || []).reduce((acc, profile) => acc + (safeNumber(profile.problems_solved ?? profile.total_problems) || 0), 0);
  const latestUpdate = profiles.reduce((latest, profile) => {
    const updatedAt = profile.updated_at ? new Date(profile.updated_at).getTime() : 0;
    return Math.max(latest, updatedAt);
  }, 0);

  return {
    studentId: normalizedStudentId,
    handles: (handles || []).map((handle) => ({ platform: safeString(handle.platform), handle: safeString(handle.handle), profileUrl: safeString(handle.profile_url), isPrimary: !!handle.is_primary })),
    platformProfiles,
    contestHistory,
    statistics: statisticsTimeline,
    profileHistory,
    totals: {
      totalContests,
      totalProblemsSolved,
      platformCount: platformProfiles.length,
      latestUpdatedAt: latestUpdate ? new Date(latestUpdate).toISOString() : null,
    },
  };
};

const getStudentContestHistory = async (studentId, platform = null) => {
  const normalizedStudentId = safeNumber(studentId);
  if (!normalizedStudentId) return null;
  const rows = await analyticsDb.getContestHistoryForStudent(normalizedStudentId, safeString(platform));
  return (rows || []).map(buildContestRecord);
};

const getLeaderboard = async (platform = null) => {
  const rows = await analyticsDb.getLeaderboard(safeString(platform));
  return (rows || []).map((row) => {
    const profile = buildProfileSummary(row);
    return {
      ...profile,
      leaderboardScore: profile.score,
    };
  });
};

module.exports = {
  getStudentAnalytics,
  getStudentContestHistory,
  getLeaderboard,
};
