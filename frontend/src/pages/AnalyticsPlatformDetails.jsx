import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import analyticsService from '../services/analyticsService';
import coordinatorAnalyticsService from '../services/coordinatorAnalyticsService';
import LoadingCard from '../components/coding/LoadingCard';
import ErrorCard from '../components/coding/ErrorCard';

const KNOWN_TOPICS = [
  'Arrays', 'Strings', 'Hash Table', 'Linked List', 'Stack', 'Queue', 'Tree', 'Graph', 'Heap',
  'Greedy', 'Dynamic Programming', 'Trie', 'Math', 'Binary Search', 'Sliding Window',
  'Backtracking', 'Bit Manipulation', 'Prefix Sum', 'Intervals', 'Simulation', 'Design', 'Database',
];

const PLATFORM_META = {
  leetcode: {
    label: 'LeetCode',
    accent: 'from-orange-500 to-amber-400',
    highlight: 'bg-orange-50 text-orange-800',
    platformLabel: 'LeetCode',
  },
  codechef: {
    label: 'CodeChef',
    accent: 'from-blue-600 to-cyan-500',
    highlight: 'bg-blue-50 text-blue-800',
    platformLabel: 'CodeChef',
  },
  hackerrank: {
    label: 'HackerRank',
    accent: 'from-emerald-500 to-teal-500',
    highlight: 'bg-emerald-50 text-emerald-800',
    platformLabel: 'HackerRank',
  },
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

const parseJson = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    if (Array.isArray(parsed)) return parsed.filter((item) => item !== undefined && item !== null);
    return value.trim() ? [value.trim()] : [];
  }
  return [];
};

const TOPIC_KEY_MAP = {
  array: 'Arrays',
  arrays: 'Arrays',
  string: 'Strings',
  strings: 'Strings',
  'hash table': 'Hash Table',
  'hash_table': 'Hash Table',
  'hash-table': 'Hash Table',
  'linked list': 'Linked List',
  linked_list: 'Linked List',
  'linked-list': 'Linked List',
  stack: 'Stack',
  queue: 'Queue',
  tree: 'Tree',
  graph: 'Graph',
  heap: 'Heap',
  greedy: 'Greedy',
  'dynamic programming': 'Dynamic Programming',
  dp: 'Dynamic Programming',
  trie: 'Trie',
  math: 'Math',
  'binary search': 'Binary Search',
  'sliding window': 'Sliding Window',
  'prefix sum': 'Prefix Sum',
  intervals: 'Intervals',
  simulation: 'Simulation',
  design: 'Design',
  database: 'Database',
  'bit manipulation': 'Bit Manipulation',
  backtracking: 'Backtracking',
};

const getTopicCounts = (profile) => {
  const topics = parseJson(profile.topicStatistics)
    || parseJson(profile.topicWiseSolved)
    || parseJson(profile.topic_statistics)
    || profile.topics
    || profile.topic_stats
    || {};
  if (typeof topics !== 'object' || topics === null) {
    return {};
  }

  return Object.keys(topics).reduce((acc, key) => {
    const normalizedKey = String(key).trim().toLowerCase();
    const topicName = TOPIC_KEY_MAP[normalizedKey] || String(key).trim();
    return {
      ...acc,
      [topicName]: safeNumber(topics[key]),
    };
  }, {});
};

const scoreCategory = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Average';
  return 'Needs Improvement';
};

const PlatformDetails = () => {
  const { studentId, platform } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const config = PLATFORM_META[platform];

  useEffect(() => {
    if (!config) return;
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = studentId
          ? await coordinatorAnalyticsService.getPlatform(studentId, platform)
          : await analyticsService.getPlatform(platform);
        setAnalytics(data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [platform, config, studentId]);

  const profile = analytics?.profile || {};
  const contestHistory = safeArray(analytics?.contestHistory);
  const statistics = safeArray(analytics?.statistics);
  const badgesAnalysis = parseJson(profile.badgesAnalysis) || {};
  const achievementsAnalysis = parseJson(profile.achievementsAnalysis) || {};
  const recentProblems = safeArray(profile.recentProblems || profile.recent_submissions || achievementsAnalysis.recentProblems || achievementsAnalysis.recent_problems || []);

  const topicCounts = useMemo(() => getTopicCounts(profile), [profile]);
  const totalSolved = safeNumberOrNull(profile.problemsSolved ?? profile.totalProblems ?? profile.totalSolved ?? null);
  const easySolved = safeNumber(profile.easySolved || profile.easySolvedCount || profile.easy || 0);
  const mediumSolved = safeNumber(profile.mediumSolved || profile.mediumSolvedCount || profile.medium || 0);
  const hardSolved = safeNumber(profile.hardSolved || profile.hardSolvedCount || profile.hard || 0);
  const activeDays = safeNumber(profile.stats?.activeDays ?? profile.activeDays ?? profile.totalActiveDays ?? profile.total_active_days ?? profile.stats?.totalActiveDays ?? 0);
  const currentStreak = safeNumber(profile.stats?.currentStreak ?? profile.currentStreak ?? profile.current_streak ?? 0);
  const maxStreak = safeNumber(profile.stats?.maxStreak ?? profile.maxStreak ?? profile.max_streak ?? 0);
  const solvedBreakdownSum = easySolved + mediumSolved + hardSolved || totalSolved || 1;
  const overallScore = safeNumber(profile.codingScore ?? profile.coding_score ?? profile.estimatedProgressScore ?? profile.estimated_progress_score ?? profile.coding_score ?? null);
  const scoreLabel = overallScore ? scoreCategory(overallScore) : 'Score unavailable';
  const recentActivity = normalizeList(
    profile.recentActivity || profile.recent_activity || profile.recentProblems || profile.recent_problems || achievementsAnalysis.recentProblems || achievementsAnalysis.recent_problems || recentProblems
  );
  const ratingsTimeline = statistics
    .map((item) => ({
      date: item.recordedDate ? formatDate(item.recordedDate) : 'Unknown',
      rating: safeNumber(item.rating),
    }))
    .filter((item) => item.rating != null);

  const headerLabel = config?.label || 'Analytics';

  if (!config) {
    return (
      <div className="space-y-6">
        <ErrorCard title="Platform Not Found" message="That analytics page does not exist." />
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Go back</button>
      </div>
    );
  }

  const codechefName = profile.name || profile.fullName || profile.displayName || profile.display_name || null;
  const codechefCountry = profile.country || profile.countryName || null;
  const codechefAvatar = profile.profilePicture || profile.avatarUrl || profile.profile_image || profile.avatar || null;
  const codechefProfileUrl = profile.profileUrl || (profile.username ? `https://www.codechef.com/users/${encodeURIComponent(profile.username)}` : null);
  const codechefRating = profile.rating ?? profile.currentRating ?? profile.current_rating ?? null;
  const codechefHighestRating = profile.maxRating ?? profile.highestRating ?? profile.max_rating ?? null;
  const codechefGlobalRank = profile.globalRank ?? profile.rank ?? profile.global_rank ?? null;
  const codechefCountryRank = profile.countryRank ?? profile.country_rank ?? null;
  const codechefProblemsSolved = profile.problemsSolved ?? profile.totalSolved ?? totalSolved ?? null;
  const codechefContestsAttended = profile.contestCount ?? profile.contestsAttended ?? profile.totalContests ?? null;
  const codechefBadges = profile.badgesCount ?? profile.starsBadges ?? profile.badges ?? null;
  const codechefLastSynced = profile.lastSyncDate || profile.lastSync || profile.updatedAt || profile.syncedAt || null;
  const codechefRatingHistory = (statistics.length > 0 ? statistics : contestHistory)
    .map((item) => ({
      date: item.recordedDate ? formatDate(item.recordedDate) : item.contestDate ? formatDate(item.contestDate) : 'Unknown',
      rating: safeNumber(item.rating ?? item.ratingAfter ?? item.newRating ?? item.currentRating ?? item.rating_after ?? item.ratingAfter ?? item.rating),
    }))
    .filter((item) => item.rating != null)
    .sort((a, b) => {
      if (a.date === 'Unknown' || b.date === 'Unknown') return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  const codechefRecentContests = contestHistory.slice(0, 4);

  const hackerrankAvatar = profile.avatarUrl || profile.profilePicture || profile.avatar || profile.profile_image;
  const hackerrankFullName = profile.fullName || profile.name || profile.displayName || null;
  const hackerrankCountry = profile.country || profile.countryName || null;
  const hackerrankProfileUrl = profile.profileUrl || profile.profile_url || null;
  const hackerrankBadges = normalizeList(profile.badges || profile.badges_list || profile.badgesList || parseJson(profile.badgesAnalysis)?.badges || []);
  const hackerrankSkills = normalizeList(profile.skills || profile.skillList || profile.skills_list || profile.skill_list || profile.languages || profile.skillsArray || []);
  const hackerrankCertifications = normalizeList(profile.certifications || profile.certs || profile.certificationList || profile.certification_list || []);
  const hackerrankLanguageBadges = normalizeList(profile.languageBadges || profile.language_badges || profile.languageBadgesList || []);
  const hackerrankChallengeTracks = normalizeList(profile.challengeTracks || profile.challenge_tracks || profile.tracks || []);
  const hackerrankLastSynced = profile.lastSyncDate || profile.lastSync || profile.updatedAt || profile.syncedAt;
  const hackerrankSyncStatus = hackerrankLastSynced ? 'Synced' : 'Not Synced';
  const hackerrankCodingScore = safeNumber(profile.codingScore ?? profile.coding_score ?? profile.estimatedProgressScore ?? profile.estimated_progress_score ?? null);
  const hackerrankBadgeDetails = hackerrankBadges
    .map((badge) => {
      if (!badge) return null;
      if (typeof badge === 'string') {
        return { name: badge, level: null, stars: null, icon: '🏅' };
      }

      const name = badge.name || badge.title || badge.badgeName || badge.label || badge.badge_name || 'Badge';
      const level = badge.level || badge.value || badge.tier || badge.badgeLevel || badge.badge_type || null;
      const stars = badge.stars ?? badge.starCount ?? badge.star_count ?? (typeof badge.value === 'number' ? badge.value : null);
      const icon = badge.icon || badge.image || badge.imageUrl || badge.iconUrl || '🏅';

      return { name, level, stars, icon };
    })
    .filter(Boolean);
  const hackerrankBadgeCounts = hackerrankBadgeDetails.reduce(
    (counts, badge) => {
      const level = String(badge.level || '').toLowerCase();
      if (level.includes('gold') || level === '1' || level.includes('1st')) counts.gold += 1;
      else if (level.includes('silver') || level === '2' || level.includes('2nd')) counts.silver += 1;
      else if (level.includes('bronze') || level === '3' || level.includes('3rd')) counts.bronze += 1;
      return counts;
    },
    { gold: 0, silver: 0, bronze: 0 }
  );

  const hackerrankRecentActivity = normalizeList(
    profile.recentProblems || profile.recent_submissions || profile.recentActivity || profile.recent_activity || achievementsAnalysis.recentProblems || achievementsAnalysis.recent_problems || recentProblems
  );
  const hackerrankSummaryItems = [
    hackerrankBadges.length > 0 ? { label: 'Badges', value: hackerrankBadges.length } : null,
    hackerrankSkills.length > 0 ? { label: 'Skills', value: hackerrankSkills.length } : null,
    hackerrankCertifications.length > 0 ? { label: 'Certifications', value: hackerrankCertifications.length } : null,
    hackerrankLanguageBadges.length > 0 ? { label: 'Language Badges', value: hackerrankLanguageBadges.length } : null,
    hackerrankChallengeTracks.length > 0 ? { label: 'Challenge Tracks', value: hackerrankChallengeTracks.length } : null,
  ].filter(Boolean);

  const renderCodeChefSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6 shadow-sm">
        <div className="h-8 w-48 rounded-full bg-slate-200 mb-6" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-40 rounded-3xl bg-slate-200" />
          <div className="grid gap-3">
            <div className="h-16 rounded-3xl bg-slate-200" />
            <div className="h-16 rounded-3xl bg-slate-200" />
            <div className="h-16 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 rounded-3xl bg-slate-200" />
        ))}
      </div>
      <div className="h-72 rounded-3xl bg-slate-200" />
      <div className="h-96 rounded-3xl bg-slate-200" />
    </div>
  );

  const renderCodeChefPage = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">CodeChef Analytics</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{profile.username || 'CodeChef User'}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">Dedicated CodeChef performance metrics fetched from the existing analytics API.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate(-1)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100">
              {codechefAvatar ? (
                <img src={codechefAvatar} alt={profile.username || 'Profile'} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-slate-700">{profile.username?.charAt(0) || 'C'}</span>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Username</p>
                {codechefProfileUrl ? (
                  <a href={codechefProfileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xl font-semibold text-slate-900 hover:text-blue-600">
                    {profile.username || 'CodeChef User'}
                  </a>
                ) : (
                  <p className="mt-2 text-xl font-semibold text-slate-900">{profile.username || 'CodeChef User'}</p>
                )}
              </div>
              {codechefName ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{codechefName}</p>
                </div>
              ) : null}
              {codechefCountry ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Country</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{codechefCountry}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Rating Statistics</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Current Rating', value: codechefRating },
              { label: 'Highest Rating', value: codechefHighestRating },
              { label: 'Global Rank', value: codechefGlobalRank },
              { label: 'Country Rank', value: codechefCountryRank },
              { label: 'Last Synced', value: codechefLastSynced ? formatDate(codechefLastSynced) : null },
            ].filter((item) => item.value != null).map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {codechefProblemsSolved != null ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Problems Solved</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{codechefProblemsSolved}</p>
          </div>
        ) : null}
        {codechefContestsAttended != null ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Contests Attended</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{codechefContestsAttended}</p>
          </div>
        ) : null}
        {codechefBadges != null ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Badges</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{codechefBadges}</p>
          </div>
        ) : null}
      </div>

      {codechefRecentContests.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Recent Contests Attended</h2>
              <p className="mt-2 text-sm text-slate-500">Latest CodeChef contests attended by the user.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {codechefRecentContests.map((contest, index) => (
              <div key={`${contest.contestId || contest.contestName || index}-${index}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{contest.contestName || contest.contestId || 'Contest'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">{formatDate(contest.contestDate || contest.date) || 'Date unavailable'}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  {contest.rank != null ? <p>Rank: <span className="font-semibold text-slate-900">{contest.rank}</span></p> : null}
                  {(contest.ratingAfter ?? contest.rating_after ?? contest.rating) != null ? (
                    <p>Rating: <span className="font-semibold text-slate-900">{contest.ratingAfter ?? contest.rating_after ?? contest.rating}</span></p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Rating History</h2>
            <p className="mt-2 text-sm text-slate-500">Rating progression over time for CodeChef contests.</p>
          </div>
        </div>
        {codechefRatingHistory.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No rating history available.
          </div>
        ) : (
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={codechefRatingHistory} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rating" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );

  const renderHackerRankSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6 shadow-sm">
        <div className="h-8 w-48 rounded-full bg-slate-200 mb-6" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-40 rounded-3xl bg-slate-200" />
          <div className="grid gap-3">
            <div className="h-16 rounded-3xl bg-slate-200" />
            <div className="h-16 rounded-3xl bg-slate-200" />
            <div className="h-16 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 rounded-3xl bg-slate-200" />
        ))}
      </div>
      <div className="h-72 rounded-3xl bg-slate-200" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 rounded-3xl bg-slate-200" />
        <div className="h-72 rounded-3xl bg-slate-200" />
      </div>
    </div>
  );

  const renderHackerRankPage = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">HackerRank Analytics</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{profile.username || 'HackerRank User'}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">Dedicated HackerRank insights fetched from the existing analytics API.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate(-1)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100">
              {hackerrankAvatar ? (
                <img src={hackerrankAvatar} alt={profile.username || 'Avatar'} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-slate-700">{profile.username?.charAt(0) || 'H'}</span>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Username</p>
                {hackerrankProfileUrl ? (
                  <a href={hackerrankProfileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xl font-semibold text-slate-900 hover:text-emerald-600">
                    {profile.username || 'N/A'}
                  </a>
                ) : (
                  <p className="mt-2 text-xl font-semibold text-slate-900">{profile.username || 'N/A'}</p>
                )}
              </div>
              {hackerrankFullName ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Full Name</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{hackerrankFullName}</p>
                </div>
              ) : null}
              {hackerrankCountry ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Country</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{hackerrankCountry}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
          {hackerrankSummaryItems.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {hackerrankSummaryItems.map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">No additional HackerRank metrics were returned by the API.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {hackerrankSkills.length > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Skills</h2>
                <p className="mt-2 text-sm text-slate-500">Skills returned by the HackerRank analytics API.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {hackerrankSkills.map((skill, index) => {
                const skillName = typeof skill === 'string' ? skill : skill.name || skill.title || skill.label || String(skill);
                const skillValue = typeof skill === 'object' && (skill.value || skill.score || skill.level) ? ` • ${skill.value || skill.score || skill.level}` : '';
                return (
                  <span key={`${skillName}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                    {skillName}{skillValue}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        {hackerrankBadgeDetails.length > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Badges</h2>
                <p className="mt-2 text-sm text-slate-500">Badge cards returned by HackerRank.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hackerrankBadgeDetails.map((badge, index) => (
                <div key={`${badge.name}-${index}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                      {badge.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{badge.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{badge.level || 'Level unknown'}</p>
                    </div>
                  </div>
                  {badge.stars ? (
                    <p className="mt-4 text-sm text-slate-600">
                      {Array.from({ length: Number(badge.stars) }).map((_, i) => (
                        <span key={i} className="text-amber-500">★</span>
                      ))}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {hackerrankCertifications.length > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Certifications</h2>
                <p className="mt-2 text-sm text-slate-500">Certifications returned by HackerRank.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {hackerrankCertifications.map((cert, index) => {
                const title = typeof cert === 'string' ? cert : cert.name || cert.title || cert.certification || cert.certificate || 'Certification';
                const date = typeof cert === 'object' ? cert.completedAt || cert.completed_at || cert.date || cert.issuedOn || cert.issued_on || cert.issued || null : null;
                return (
                  <div key={`${title}-${index}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{title}</p>
                    {date ? <p className="mt-2 text-sm text-slate-500">Completed {formatDate(date)}</p> : <p className="mt-2 text-sm text-slate-500">Completion date unavailable</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {hackerrankLanguageBadges.length > 0 || hackerrankChallengeTracks.length > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Language Badges & Tracks</h2>
                <p className="mt-2 text-sm text-slate-500">Additional HackerRank language and challenge progress returned by the API.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {hackerrankLanguageBadges.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900">Language Badges</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {hackerrankLanguageBadges.map((item, index) => {
                      const label = typeof item === 'string' ? item : item.name || item.title || item.label || String(item);
                      const value = typeof item === 'object' && (item.value || item.score || item.level) ? ` • ${item.value || item.score || item.level}` : '';
                      return <span key={`${label}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">{label}{value}</span>;
                    })}
                  </div>
                </div>
              ) : null}
              {hackerrankChallengeTracks.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900">Challenge Tracks</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {hackerrankChallengeTracks.map((item, index) => {
                      const label = typeof item === 'string' ? item : item.name || item.title || item.label || String(item);
                      const value = typeof item === 'object' && (item.value || item.level || item.status) ? ` • ${item.value || item.level || item.status}` : '';
                      return <span key={`${label}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">{label}{value}</span>;
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {hackerrankRecentActivity.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
              <p className="mt-2 text-sm text-slate-500">Latest HackerRank activity returned by the API.</p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {hackerrankRecentActivity.map((item, index) => {
                  const title = typeof item === 'string' ? item : item.title || item.name || item.challenge || item.problemName || item.problem_name || item.activity || 'Activity';
                  const type = typeof item === 'string' ? 'Activity' : item.difficulty || item.type || item.category || item.status || 'Detail';
                  const date = typeof item === 'string' ? null : item.solvedDate || item.submissionDate || item.completedAt || item.completed_at || item.date || item.timestamp || null;
                  return (
                    <tr key={`${title}-${index}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-900">{title}</td>
                      <td className="px-4 py-3">{type}</td>
                      <td className="px-4 py-3">{date ? formatDate(date) : 'Unknown'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Last Synced</h2>
            <p className="mt-2 text-sm text-slate-500">Date and status of the last HackerRank analytics sync.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${hackerrankSyncStatus === 'Synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
            {hackerrankSyncStatus}
          </span>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Last updated</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{hackerrankLastSynced ? formatDate(hackerrankLastSynced) : 'Not available'}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    if (platform === 'codechef') return renderCodeChefSkeleton();
    if (platform === 'hackerrank') return renderHackerRankSkeleton();
    return <LoadingCard message={`Loading ${headerLabel} analytics…`} />;
  }

  if (error) return <ErrorCard title={`${headerLabel} Error`} message={error} />;

  if (platform === 'codechef') return renderCodeChefPage();
  if (platform === 'hackerrank') return renderHackerRankPage();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">LeetCode Details</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{profile.username || 'LeetCode User'}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">Professional LeetCode insights powered by analytics API data only.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate(-1)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-100 text-4xl text-slate-700">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.username || 'Avatar'} className="h-28 w-28 rounded-3xl object-cover" />
              ) : (
                <span>{profile.username?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 flex-1">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Username</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{profile.username || 'N/A'}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ranking</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{profile.globalRank ?? profile.rank ?? 'N/A'}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contest Rating</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{profile.rating ?? profile.contestRating ?? 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Overall Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{overallScore != null ? overallScore : 'N/A'}</p>
              <p className="mt-1 text-sm text-slate-600">{scoreLabel}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Last Synced</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatDate(profile.lastSyncDate || profile.lastSync || profile.updatedAt)}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total Solved</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{totalSolved}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Active Days</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{activeDays}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Max Streak</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{maxStreak}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Problems Solved</h2>
          <p className="mt-2 text-sm text-slate-500">Breakdown of difficulty counts with progress bars.</p>
          <div className="mt-6 space-y-4">
            {[
              { label: 'Easy', value: easySolved, color: 'bg-emerald-500' },
              { label: 'Medium', value: mediumSolved, color: 'bg-blue-500' },
              { label: 'Hard', value: hardSolved, color: 'bg-orange-500' },
            ].map((item) => {
              const percent = totalSolved ? Math.round((item.value / solvedBreakdownSum) * 100) : 0;
              return (
                <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{percent}% of solved problems</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Topic Wise Solved</h2>
          <p className="mt-2 text-sm text-slate-500">Every major topic tracked from analytics data.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {KNOWN_TOPICS.map((topic) => (
              <div key={topic} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{topic}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{topicCounts[topic] || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No recent activity data available.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((item, index) => (
                    <tr key={`${item.title || index}-${index}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-900">{item.title || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Contest History</h2>
          {contestHistory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No contest history found.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Contest</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Solved</th>
                  </tr>
                </thead>
                <tbody>
                  {contestHistory.map((contest, index) => (
                    <tr key={`${contest.contestId || contest.contestName || index}-${index}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-900">{contest.contestName || contest.contestId || 'Unknown'}</td>
                      <td className="px-4 py-3">{formatDate(contest.contestDate)}</td>
                      <td className="px-4 py-3">{contest.rank ?? '—'}</td>
                      <td className="px-4 py-3">{contest.ratingAfter ?? contest.rating_after ?? contest.ratingBefore ?? '—'}</td>
                      <td className="px-4 py-3">{contest.details?.problemsSolved ?? contest.problemsSolved ?? contest.problems_solved ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformDetails;
