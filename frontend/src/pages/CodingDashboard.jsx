import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import analyticsService from '../services/analyticsService';
import ProfileCard from '../components/coding/ProfileCard';
import StatsCard from '../components/coding/StatsCard';
import ChartCard from '../components/coding/ChartCard';
import LoadingCard from '../components/coding/LoadingCard';
import ErrorCard from '../components/coding/ErrorCard';

const platformOrder = ['leetcode', 'codechef', 'hackerrank', 'github'];

const defaultStats = {
  totalPlatforms: 0,
  totalProblems: 0,
  highestRating: null,
  totalFollowers: null,
  badgesEarned: null,
  reposCount: null,
};

const normalizeProfile = (platform, profileData) => {
  const stats = profileData?.stats || {};
  return {
    platform,
    username: profileData?.username || '',
    displayName: profileData?.displayName || profileData?.username || '',
    profileStatus: profileData?.profileStatus || 'failed',
    lastSynced: profileData?.lastSynced || null,
    stats,
    badgesAnalysis: profileData?.badgesAnalysis || {},
    achievementsAnalysis: profileData?.achievementsAnalysis || {},
    contestHistory: profileData?.contestHistory || [],
    raw: profileData,
  };
};

const formatChartData = (profiles) => {
  const data = [];
  profiles.forEach((profile) => {
    const stats = profile.stats || {};
    const problems = stats.problemsSolved != null ? stats.problemsSolved : (stats.totalSolved != null ? stats.totalSolved : 0);
    if (stats.rating != null || problems != null) {
      data.push({
        platform: profile.platform,
        problems,
        rating: stats.rating || 0,
      });
    }
  });
  return data;
};

const CodingDashboard = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(null);
  const [overallCodingScore, setOverallCodingScore] = useState(null);
  const [placementReadinessScore, setPlacementReadinessScore] = useState(null);
  const [profileCompletionPercent, setProfileCompletionPercent] = useState(0);
  const [error, setError] = useState(null);

  const getBadgeValue = (profile, key) => {
    if (!Array.isArray(profile.badgesAnalysis?.badges)) return null;
    const badge = profile.badgesAnalysis.badges.find((item) => String(item?.name).toLowerCase() === String(key).toLowerCase());
    return badge ? Number(badge.value ?? badge.count ?? 0) : null;
  };

  const stats = useMemo(() => {
    if (!profiles.length) return defaultStats;

    const totalProblems = profiles.reduce((sum, profile) => {
      const stats = profile.stats || {};
      return sum + ((stats.problemsSolved != null ? stats.problemsSolved : (stats.totalSolved != null ? stats.totalSolved : 0)) || 0);
    }, 0);
    const highestRating = profiles.reduce((best, profile) => {
      const rating = profile.stats?.rating;
      return rating != null ? Math.max(best, rating) : best;
    }, 0);
    const totalFollowers = profiles.reduce((sum, profile) => {
      if (profile.platform === 'github') {
        return sum + (getBadgeValue(profile, 'followers') || 0);
      }
      return sum;
    }, 0);
    const reposCount = profiles.reduce((sum, profile) => {
      if (profile.platform === 'github') {
        return sum + (getBadgeValue(profile, 'publicRepos') || 0);
      }
      return sum;
    }, 0);
    const badgesEarned = profiles.reduce((sum, profile) => {
      if (Array.isArray(profile.badgesAnalysis?.badges)) {
        return sum + profile.badgesAnalysis.badges.length;
      }
      return sum;
    }, 0);

    return {
      totalPlatforms: profiles.length,
      totalProblems,
      highestRating: highestRating || 'N/A',
      totalFollowers: totalFollowers || 'N/A',
      badgesEarned,
      reposCount: reposCount || 'N/A',
    };
  }, [profiles]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const studentId = user?.id;
        if (!studentId) {
          setError('Student ID unavailable');
          setLoading(false);
          return;
        }
        const [profileResponse, overallResponse] = await Promise.allSettled([
          api.get(`/coding/profile/${studentId}`),
          analyticsService.getOverallScore(),
        ]);

        const profileData = profileResponse.status === 'fulfilled' ? profileResponse.value.data || {} : {};
        const platformData = profileData.platforms || {};
        const contestHistory = profileData.contestHistory || {};
        const normalized = platformOrder.map((platform) => ({
          ...normalizeProfile(platform, platformData[platform] || {}),
          contestHistory: contestHistory[platform] || [],
        }));

        setProfiles(normalized);
        setPlacementReadinessScore(profileData.placementReadinessScore ?? null);
        setOverallCodingScore(overallResponse.status === 'fulfilled' ? overallResponse.value?.overallCodingScore ?? null : null);
        setProfileCompletionPercent(
          Math.round(
            (normalized.filter((profile) => Boolean(profile.username)).length / platformOrder.length) * 100
          )
        );
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load coding profile dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleRefresh = async (platform) => {
    if (!user?.id) return;
    setRefreshing(platform);
    try {
      await api.post(`/coding/sync/${user.id}`);
      const response = await api.get(`/coding/profile/${user.id}`);
      const data = response.data || {};
      const platformData = data.platforms || {};
      const contestHistory = data.contestHistory || {};
      const normalized = platformOrder.map((platformName) => ({
        ...normalizeProfile(platformName, platformData[platformName] || {}),
        contestHistory: contestHistory[platformName] || [],
      }));
      setProfiles(normalized);
      setPlacementReadinessScore(data.placementReadinessScore ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Refresh failed for profile data.');
    } finally {
      setRefreshing(null);
    }
  };

  const problemsChartData = formatChartData(profiles);

  if (loading) {
    return <LoadingCard message="Loading coding dashboard…" />;
  }

  if (error) {
    return <ErrorCard title="Coding Dashboard Error" message={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <StatsCard label="Overall Coding Score" value={overallCodingScore != null ? `${overallCodingScore}/100` : 'N/A'} />
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Placement Readiness Score</p>
          {placementReadinessScore != null ? (
            <p className="mt-3 text-2xl font-semibold text-slate-900">{placementReadinessScore}/100</p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">Complete your profile to unlock your Placement Readiness Score.</p>
          )}
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile Completion</p>
            <p className="text-xs font-semibold text-slate-900">{profileCompletionPercent}%</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${profileCompletionPercent}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-500">Shows the percentage of coding platforms connected and linked for your profile.</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <StatsCard label="Platforms Connected" value={stats.totalPlatforms} />
        <StatsCard label="Total Problems Solved" value={stats.totalProblems} />
        <StatsCard label="Highest Contest Rating" value={stats.highestRating} />
        <StatsCard label="GitHub Followers" value={stats.totalFollowers} />
        <StatsCard label="Badges Earned" value={stats.badgesEarned} />
        <StatsCard label="GitHub Repos" value={stats.reposCount} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Problems Solved by Platform">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={problemsChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="problems" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Rating Trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={problemsChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.platform}
            platform={profile.platform}
            profile={profile}
            contestHistory={profile.contestHistory}
            onRefresh={handleRefresh}
            refreshing={refreshing === profile.platform}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.stats.avatarUrl && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <img src={profile.stats.avatarUrl} alt={`${profile.username} avatar`} className="mx-auto h-16 w-16 rounded-full object-cover" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Avatar</p>
                </div>
              )}
              {profile.stats.rating != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{profile.stats.rating}</p>
                </div>
              )}
              {profile.stats.globalRank != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Global Rank</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{profile.stats.globalRank}</p>
                </div>
              )}
              {profile.stats.problemsSolved != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Problems Solved</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{profile.stats.problemsSolved}</p>
                </div>
              )}
              {profile.stats.countryRank != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Country Rank</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{profile.stats.countryRank}</p>
                </div>
              )}
            </div>

            {profile.platform === 'github' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Public Repos</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{getBadgeValue(profile, 'publicRepos') ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Followers</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{getBadgeValue(profile, 'followers') ?? 'N/A'}</p>
                </div>
              </div>
            )}
            {Array.isArray(profile.achievementsAnalysis?.recentProblems) && profile.achievementsAnalysis.recentProblems.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Recent Activity</p>
                <div className="mt-3 space-y-3">
                  {profile.achievementsAnalysis.recentProblems.slice(0, 3).map((item, idx) => (
                    <a
                      key={`${item.title || item.url || idx}-${idx}`}
                      href={item.url || item.question_url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                    >
                      <p className="font-medium text-slate-900">{item.title || item.question_name || item.repository_name || 'Recent item'}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.url ? new URL(item.url).hostname : 'No link available'}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </ProfileCard>
        ))}
      </div>
    </div>
  );
};

export default CodingDashboard;
