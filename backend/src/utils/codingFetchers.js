const axios = require('axios');
const cloudscraper = require('cloudscraper');

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  withCredentials: true,
});

const safeNumber = (value) => {
  if (value === undefined || value === null) return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const isNonEmptyObject = (value) => Boolean(value && typeof value === 'object');

const normalizeSubmissionCalendar = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === 'string') return { date: entry, count: 1 };
        if (isNonEmptyObject(entry)) {
          const date = safeString(entry.date || entry.timestamp || entry.day || entry.created_at || entry.submittedAt);
          const count = safeNumber(entry.count || entry.total || entry.value || entry.submissions || entry.cnt);
          if (!date) return null;
          return { date, count: count ?? 1 };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (isNonEmptyObject(value)) {
    return Object.entries(value)
      .map(([date, count]) => ({ date, count: safeNumber(count) ?? 1 }))
      .filter((entry) => entry.date);
  }
  return [];
};

const calculateStreakMetricsFromCalendar = (calendarEntries = []) => {
  const dates = calendarEntries
    .filter((entry) => safeNumber(entry?.count) > 0)
    .map((entry) => safeString(entry?.date))
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  if (!dates.length) return { active_days: null, current_streak: null, max_streak: null };

  const uniqueDates = [...new Set(dates.map((date) => date.slice(0, 10)))];
  let currentStreak = 0;
  let maxStreak = 0;
  let streak = 0;
  let previousDate = null;

  uniqueDates.forEach((date) => {
    const currentDate = new Date(`${date}T00:00:00`);
    if (!previousDate) {
      streak = 1;
      currentStreak = 1;
      maxStreak = 1;
    } else {
      const diffDays = Math.round((currentDate - previousDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
        currentStreak = streak;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
        currentStreak = 1;
      }
    }
    previousDate = currentDate;
  });

  return {
    active_days: uniqueDates.length,
    current_streak: currentStreak,
    max_streak: maxStreak,
  };
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && item !== '');
  return [];
};

const safeString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text || null;
};

const normalizeStars = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.min(5, Math.max(0, Math.round(value))) : null;
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned) return null;
    const explicitMatch = cleaned.match(/(\d)(?:\s*\/\s*5)?/i);
    if (explicitMatch) return Math.min(5, Math.max(0, Number(explicitMatch[1])));
    const count = (cleaned.match(/★/g) || []).length;
    if (count) return Math.min(5, Math.max(0, count));
    const numeric = Number(cleaned.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric)) return Math.min(5, Math.max(0, Math.round(numeric)));
  }
  return null;
};

const estimateCompletionFromStars = (value) => {
  const stars = normalizeStars(value);
  if (stars === null) return null;
  const mapping = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
  return mapping[stars] ?? null;
};

const parseStructuredList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed];
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') return [value];
  return [];
};

const parseLeetCodeHtml = (html) => {
  const source = String(html || '');
  const result = {};

  const totalSolvedMatch = source.match(/"totalSolved"\s*:\s*(\d+)/i) || source.match(/"numSolved"\s*:\s*(\d+)/i);
  if (totalSolvedMatch) result.problems_solved = safeNumber(totalSolvedMatch[1]);

  const easyMatch = source.match(/"Easy"\s*:\s*(\d+)/i) || source.match(/"easySolved"\s*:\s*(\d+)/i);
  const mediumMatch = source.match(/"Medium"\s*:\s*(\d+)/i) || source.match(/"mediumSolved"\s*:\s*(\d+)/i);
  const hardMatch = source.match(/"Hard"\s*:\s*(\d+)/i) || source.match(/"hardSolved"\s*:\s*(\d+)/i);
  if (easyMatch) result.easy_solved = safeNumber(easyMatch[1]);
  if (mediumMatch) result.medium_solved = safeNumber(mediumMatch[1]);
  if (hardMatch) result.hard_solved = safeNumber(hardMatch[1]);

  const contestRatingMatch = source.match(/"contestRating"\s*:\s*(\d+)/i) || source.match(/"rating"\s*:\s*(\d+)/i);
  if (contestRatingMatch) result.contest_rating = safeNumber(contestRatingMatch[1]);

  const globalRankMatch = source.match(/"globalRanking"\s*:\s*(\d+)/i) || source.match(/"globalRank"\s*:\s*(\d+)/i);
  if (globalRankMatch) result.global_rank = safeNumber(globalRankMatch[1]);

  const activeDaysMatch = source.match(/"activeDays"\s*:\s*(\d+)/i);
  if (activeDaysMatch) result.active_days = safeNumber(activeDaysMatch[1]);

  const streakMatch = source.match(/"currentStreak"\s*:\s*(\d+)/i) || source.match(/"streak"\s*:\s*(\d+)/i);
  if (streakMatch) result.current_streak = safeNumber(streakMatch[1]);

  const recentMatch = source.match(/"recentSubmissionList"\s*:\s*(\[[\s\S]*?\])\s*(?:,|\n|\])/i);
  if (recentMatch) {
    try {
      const parsedRecent = JSON.parse(recentMatch[1]);
      if (Array.isArray(parsedRecent)) {
        result.recent_questions = parsedRecent.slice(0, 5).map((item) => ({
          title: safeString(item.title || item.question_title || item.questionTitle || item.problem_name || item.problemName),
          difficulty: safeString(item.difficulty || item.level),
          question_url: safeString(item.question_url || item.url || item.questionUrl || item.urlSlug),
          date_solved: safeString(item.date_solved || item.date || item.timestamp),
        })).filter((item) => item.title || item.question_url);
      }
    } catch (error) {
      console.warn(`[LeetCode] Failed to parse recent submissions from HTML: ${error.message}`);
    }
  }

  return result;
};

const parseRecentSolved = (recentSubmissions = [], sourcePlatform = 'Unknown') => {
  if (!Array.isArray(recentSubmissions)) return [];
  return recentSubmissions
    .map((item) => ({
      title: safeString(item.title || item.question_title || item.questionTitle || item.problem_name || item.problemName),
      difficulty: safeString(item.difficulty || item.level),
      question_url: safeString(item.question_url || item.url || item.questionUrl || item.urlSlug),
      date_solved: safeString(item.date_solved || item.date || item.timestamp),
      source: sourcePlatform,
    }))
    .filter((item) => item.title || item.question_url);
};

// ===== PLATFORM EXTRACTION HELPERS =====n
const extractLeetCodeUsername = (url) => {
  if (!url) return null;
  try {
    const match = url.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_.-]+)\/?$/i);
    if (match && match[1]) {
      console.log(`[LeetCode] Extracted username from URL: ${match[1]}`);
      return match[1];
    }
  } catch (err) {
    console.warn(`[LeetCode] Failed to extract username from URL: ${err.message}`);
  }
  return null;
};

const extractCodeChefUsername = (url) => {
  if (!url) return null;
  try {
    const match = url.match(/codechef\.com\/users\/([a-zA-Z0-9_.-]+)\/?$/i);
    if (match && match[1]) {
      console.log(`[CodeChef] Extracted username from URL: ${match[1]}`);
      return match[1];
    }
  } catch (err) {
    console.warn(`[CodeChef] Failed to extract username from URL: ${err.message}`);
  }
  return null;
};

const extractHackerRankUsername = (url) => {
  if (!url) return null;
  try {
    const match = url.match(/hackerrank\.com\/profile\/([a-zA-Z0-9_.-]+)\/?$/i);
    if (match && match[1]) {
      console.log(`[HackerRank] Extracted username from URL: ${match[1]}`);
      return match[1];
    }
  } catch (err) {
    console.warn(`[HackerRank] Failed to extract username from URL: ${err.message}`);
  }
  return null;
};

const normalizePlatform = (platform) => {
  if (!platform) return null;
  const key = String(platform).toLowerCase().trim();
  if (key.includes('leet')) return 'leetcode';
  if (key.includes('codechef')) return 'codechef';
  if (key.includes('hackerrank')) return 'hackerrank';
  return null;
};

const inferPlatformFromURL = (url) => {
  if (!url) return null;
  const normalizedUrl = String(url).toLowerCase();
  if (normalizedUrl.includes('leetcode.com')) return 'leetcode';
  if (normalizedUrl.includes('codechef.com')) return 'codechef';
  if (normalizedUrl.includes('hackerrank.com')) return 'hackerrank';
  return null;
};

const isValidProfileURL = (platform, url) => {
  if (!url) return false;
  const normalizedPlatform = normalizePlatform(platform) || inferPlatformFromURL(url);
  if (!normalizedPlatform) return false;
  const trimmed = String(url).trim();
  try {
    new URL(trimmed);
  } catch {
    return false;
  }

  const patterns = {
    leetcode: /leetcode\.com\/(?:u\/|profile\/)?([A-Za-z0-9_.-]+)\/?(?:\?.*)?$/i,
    codechef: /codechef\.com\/users\/([A-Za-z0-9_.-]+)\/?(?:\?.*)?$/i,
    hackerrank: /hackerrank\.com\/profile\/([A-Za-z0-9_.-]+)\/?(?:\?.*)?$/i,
  };

  return patterns[normalizedPlatform]?.test(trimmed) || false;
};

const extractUsernameFromURL = (platform, url) => {
  if (!url) return null;

  const normalizedPlatform = normalizePlatform(platform) || inferPlatformFromURL(url);
  if (!normalizedPlatform) return null;

  switch (normalizedPlatform) {
    case 'leetcode':
      return extractLeetCodeUsername(url);
    case 'codechef':
      return extractCodeChefUsername(url);
    case 'hackerrank':
      return extractHackerRankUsername(url);
    default:
      return null;
  }
};
const calculateCodingScore = (profile, recent = []) => {
  const problemsScore = Math.min(100, ((profile.problems_solved || 0) / 2000) * 100);
  const ratingScore = Math.min(100, ((profile.rating || 0) / 3000) * 100);

  const lastActivityDate = getLastActivityDateFromRecent(recent) || profile.last_activity_date;
  const inactiveDays = calculateInactiveDays(lastActivityDate);
  const recentActivityScore = inactiveDays === null ? 0 : (inactiveDays <= 3 ? 100 : inactiveDays <= 7 ? 75 : inactiveDays <= 15 ? 40 : 10);

  const contestScore = Math.min(100, ((profile.contest_count || 0) / 100) * 100);

  const weighted = (problemsScore * 0.4) + (ratingScore * 0.25) + (recentActivityScore * 0.15) + (contestScore * 0.1);
  return Math.round(Math.min(100, weighted));
};

const getLastActivityDateFromRecent = (recent = []) => {
  if (!Array.isArray(recent) || recent.length === 0) return null;
  for (const item of recent) {
    if (item.date_solved) return item.date_solved;
    if (item.date) return item.date;
    if (item.timestamp) return item.timestamp;
  }
  return null;
};

const calculateInactiveDays = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getActivityStatus = (inactiveDays) => {
  if (inactiveDays === null) return 'unknown';
  if (inactiveDays <= 3) return 'very_active';
  if (inactiveDays <= 7) return 'active';
  if (inactiveDays <= 30) return 'less_active';
  return 'inactive';
};

const getCurrentStreak = (recent = []) => {
  if (!Array.isArray(recent) || recent.length === 0) return null;
  const dates = recent.map((r) => {
    const d = new Date(r.date_solved || r.date || r.timestamp);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0,10);
  }).filter(Boolean).sort().reverse();
  if (dates.length === 0) return null;
  let streak = 1;
  let prev = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const curr = dates[i];
    const prevDate = new Date(prev);
    const currDate = new Date(curr);
    const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
      prev = curr;
    } else if (diffDays > 1) {
      break;
    }
  }
  return streak;
};

const buildProfileAnalytics = (profile, recent = []) => {
  const lastActivityDate = getLastActivityDateFromRecent(recent) || profile?.last_activity_date;
  const lastSyncDate = new Date().toISOString().slice(0, 10);
  const inactiveDays = calculateInactiveDays(lastActivityDate);
  const activityStatus = getActivityStatus(inactiveDays);
  const currentStreak = getCurrentStreak(recent);
  const hasMeaningfulScoreData = profile?.problems_solved != null || profile?.rating != null || profile?.contest_count != null || (Array.isArray(recent) && recent.length > 0);
  const codingScore = profile?.coding_score != null && profile?.coding_score !== undefined
    ? safeNumber(profile.coding_score)
    : hasMeaningfulScoreData
      ? calculateCodingScore(profile, recent)
      : null;

  return {
    last_activity_date: lastActivityDate,
    last_sync_date: lastSyncDate,
    inactive_days: inactiveDays,
    activity_status: activityStatus,
    coding_score: codingScore,
    current_streak: currentStreak,
  };
};

const finalizeProfile = (profile, platform, verificationStatus = 'estimated') => {
  return {
    ...profile,
    data_verification_status: verificationStatus,
  };
};

const buildPlatformProfileURL = (platform, username) => {
  switch (platform) {
    case 'leetcode': return `https://leetcode.com/${encodeURIComponent(username)}`;
    case 'codechef': return `https://www.codechef.com/users/${encodeURIComponent(username)}`;
    case 'hackerrank': return `https://www.hackerrank.com/profile/${encodeURIComponent(username)}`;
    default: return `https://${platform}.com/profile/${encodeURIComponent(username)}`;
  }
};

// ===== LEETCODE FETCHER =====

const fetchLeetCodeProfile = async (username) => {
  const lowerUsername = String(username).trim();
  if (!lowerUsername) return { profile: null, recent: [] };

  const profileUrl = `https://leetcode.com/${encodeURIComponent(lowerUsername)}`;
  const leetScraper = cloudscraper.defaults({
    jar: cloudscraper.jar(),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    followAllRedirects: true,
    cloudflareMaxTimeout: 30000,
  });

  const fetchLeetCodeFallbackApi = async () => {
    try {
      const fallbackUrl = `https://leetcode-stats-api.vercel.app/${encodeURIComponent(lowerUsername)}`;
      const apiResponse = await axiosInstance.get(fallbackUrl, {
        headers: {
          Referer: 'https://leetcode.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
        },
      });

      const apiData = apiResponse.data || {};
      const solvedCount = safeNumber(apiData.totalSolved) || (Array.isArray(apiData.totalSubmissions) ? apiData.totalSubmissions.reduce((sum, item) => sum + (safeNumber(item.count) || 0), 0) : null);
      
      const easyCount = Array.isArray(apiData.totalSubmissions) ? safeNumber(apiData.totalSubmissions.find(s => s.difficulty === 'Easy')?.count) : null;
      const mediumCount = Array.isArray(apiData.totalSubmissions) ? safeNumber(apiData.totalSubmissions.find(s => s.difficulty === 'Medium')?.count) : null;
      const hardCount = Array.isArray(apiData.totalSubmissions) ? safeNumber(apiData.totalSubmissions.find(s => s.difficulty === 'Hard')?.count) : null;

      const recentSubmissions = Array.isArray(apiData.recentSubmissions) ? apiData.recentSubmissions.slice(0, 10).map(item => ({
        title: item.title || item.questionTitle || 'Unknown',
        difficulty: item.difficulty || 'Unknown',
        date_solved: item.date || item.submissionDate || null,
        question_url: item.questionLink || item.questionUrl || null,
      })) : [];

      const recentSolved = parseRecentSolved(recentSubmissions, 'LeetCode');
      const submissionCalendar = normalizeSubmissionCalendar(apiData.submissionCalendar || apiData.heatmap || null);
      const streakMetrics = calculateStreakMetricsFromCalendar(submissionCalendar);
      return {
        profile: finalizeProfile({
          username: apiData.username || lowerUsername,
          profile_url: profileUrl,
          avatar_url: apiData.avatar || apiData.profilePicture || null,
          reputation: safeNumber(apiData.reputation),
          rating: null,
          max_rating: null,
          contest_rating: safeNumber(apiData.contestRating) || null,
          problems_solved: solvedCount,
          easy_solved: easyCount,
          medium_solved: mediumCount,
          hard_solved: hardCount,
          contest_count: safeNumber(apiData.contestParticipation) || null,
          global_rank: safeNumber(apiData.ranking) || null,
          country_rank: null,
          badges: Array.isArray(apiData.badges) ? apiData.badges.map(b => b.name || b).slice(0, 10) : null,
          stars_badges: null,
          active_days: safeNumber(apiData.activeDays) || streakMetrics.active_days || null,
          current_streak: safeNumber(apiData.currentStreak) || streakMetrics.current_streak || null,
          max_streak: safeNumber(apiData.maxStreak) || streakMetrics.max_streak || null,
          achievements_analysis: {
            recent_questions: recentSolved,
            recent_submissions: recentSubmissions.slice(0, 5),
            last_updated: apiData.lastUpdated || apiData.updatedAt || new Date().toISOString().slice(0, 10),
            heatmap: apiData.submissionCalendar || apiData.heatmap || null,
          },
        }, 'LeetCode', 'estimated'),
        recent: recentSolved,
      };
    } catch (err) {
      console.warn(`[LeetCode] Fallback API failed: ${err.message}`);
      throw err;
    }
  };

  try {
    // Try native LeetCode GraphQL first
    await leetScraper.get({
      uri: 'https://leetcode.com/',
      resolveWithFullResponse: true,
    });

    const graphqlQuery = `query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          userAvatar
          reputation
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
        userContestRanking {
          rating
          globalRanking
          totalParticipated
        }
      }
    }`;

    const responseBody = await leetScraper.post({
      uri: 'https://leetcode.com/graphql',
      json: true,
      body: { query: graphqlQuery, variables: { username: lowerUsername } },
      headers: {
        Referer: 'https://leetcode.com/',
        Origin: 'https://leetcode.com',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
    });

    const user = responseBody?.data?.matchedUser;
    if (!user) throw new Error('LeetCode profile not found');

    const solvedCount = user.submitStats?.acSubmissionNum?.reduce((sum, item) => sum + (safeNumber(item.count) || 0), 0) || null;
    const easyCount = safeNumber(user.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'Easy')?.count) || null;
    const mediumCount = safeNumber(user.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'Medium')?.count) || null;
    const hardCount = safeNumber(user.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'Hard')?.count) || null;

    return {
      profile: finalizeProfile({
        username: user.username,
        profile_url: profileUrl,
        avatar_url: user.profile?.userAvatar || null,
        reputation: safeNumber(user.profile?.reputation),
        rating: null,
        max_rating: null,
        contest_rating: safeNumber(user.userContestRanking?.rating) || null,
        problems_solved: solvedCount,
        easy_solved: easyCount,
        medium_solved: mediumCount,
        hard_solved: hardCount,
        contest_count: safeNumber(user.userContestRanking?.totalParticipated) || null,
        global_rank: safeNumber(user.userContestRanking?.globalRanking) || null,
        country_rank: null,
        badges: null,
        stars_badges: null,
        active_days: null,
        current_streak: null,
        max_streak: null,
        achievements_analysis: {
          recent_questions: [],
          recent_submissions: [],
          last_updated: null,
          heatmap: null,
        },
      }, 'LeetCode', 'verified'),
      recent: [],
    };
  } catch (error) {
    console.warn(`[LeetCode] GraphQL fetch failed: ${error.message}`);
    try {
      return await fetchLeetCodeFallbackApi();
    } catch (fallbackError) {
      console.warn(`[LeetCode] All attempts failed for ${username}: ${fallbackError.message}`);
      throw error;
    }
  }
};

// ===== HACKERRANK FETCHER =====

const extractHackerRankLanguageProgress = (data = {}, html = '') => {
  const candidates = [];
  const directLanguages = safeArray(data.languages || data.languageProgress || data.skills || data.skillProgress || data.skill_list || data.skills_list);

  directLanguages.forEach((item) => {
    const name = safeString(item.name || item.language || item.language_name || item.title || item.label || item.skill || item.key);
    const stars = normalizeStars(item.stars || item.star || item.level || item.rating || item.score || item.value);
    const percentage = safeNumber(item.percent || item.percentage || item.progress || item.completion_percentage || item.completionPercent || item.percentComplete);
    const completion = percentage ?? estimateCompletionFromStars(stars);
    if (name) candidates.push({ language: name, stars, completion_percentage: completion });
  });

  if (candidates.length > 0) return candidates;

  const htmlString = String(html || '');
  const htmlMatches = [...htmlString.matchAll(/([A-Za-z][A-Za-z0-9+#.\- ]{2,})\s*(?:\((\d)\s*★\)|([1-5])\s*★)/g)];
  const parsedHtml = htmlMatches
    .map((match) => ({
      language: safeString(match[1]),
      stars: normalizeStars(match[2] || match[3]),
      completion_percentage: estimateCompletionFromStars(match[2] || match[3]),
    }))
    .filter((item) => item.language && item.stars != null);

  return parsedHtml;
};

const parseInitialUserDataFromHtml = (html = '') => {
  try {
    const str = String(html || '');
    // Try direct id lookup first
    const idMatch = str.match(/<script[^>]*id=["']initialUserData["'][^>]*>([\s\S]*?)<\/script>/i);
    const candidates = [];
    if (idMatch && idMatch[1]) candidates.push(idMatch[1].trim());

    // Fallback: collect script tags that look like encoded JSON
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRegex.exec(str)) !== null) {
      const content = (m[1] || '').trim();
      if (!content) continue;
      // heuristics: percent-encoded JSON or JSON-like objects
      if (/%7B|%22|"totalSolvedProblems|languageProgress|languages|globalRank/.test(content)) {
        candidates.push(content);
      }
    }

    for (const raw of candidates) {
      // try decodeURIComponent first (handles %7B...)
      try {
        const decoded = decodeURIComponent(raw);
        try {
          const parsed = JSON.parse(decoded);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {}
      } catch {}

      // try raw JSON parse
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
  } catch (e) {
    // ignore
  }
  return null;
};

const fetchHackerRankProfile = async (username) => {
  const lowerUsername = String(username).trim();
  if (!lowerUsername) return { profile: null, recent: [] };

  try {
    console.log(`[HackerRank] Fetching profile for: ${lowerUsername}`);

    try {
      console.log(`[HackerRank] Attempting REST API endpoint`);
      const profileUrl = `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(lowerUsername)}/profile`;
      const resp = await axiosInstance.get(profileUrl);
      const data = resp.data?.model || resp.data;

      if (data && Object.keys(data).length > 0) {
        const languageProgress = extractHackerRankLanguageProgress(data);
        const meaningfulStars = languageProgress.filter((item) => item.stars != null);
        const averageStars = meaningfulStars.length
          ? meaningfulStars.reduce((sum, item) => sum + item.stars, 0) / meaningfulStars.length
          : null;
        const codingScore = averageStars !== null ? Math.round(Math.min(100, (averageStars / 5) * 100)) : null;

        return {
          profile: finalizeProfile({
            username: lowerUsername,
            profile_url: `https://www.hackerrank.com/profile/${encodeURIComponent(lowerUsername)}`,
            avatar_url: safeString(data.avatar) || null,
            reputation: null,
            rating: null,
            max_rating: null,
            problems_solved: safeNumber(data.totalSolvedProblems) || safeNumber(data.solved_count) || null,
            contest_count: safeNumber(data.contestsParticipated) || safeNumber(data.contest_count) || null,
            global_rank: safeNumber(data.globalRank) || safeNumber(data.global_rank) || null,
            country_rank: safeNumber(data.countryRank) || safeNumber(data.country_rank) || null,
            countries: safeString(data.country) || null,
            badges: null,
            languages: languageProgress.length ? languageProgress : null,
            stars_badges: null,
            country: safeString(data.country) || null,
            hacker_name: safeString(data.hacker_name || data.name) || null,
            coding_score: codingScore,
            achievements_analysis: {
              last_updated: null,
              recent_activity: [],
            },
          }, 'HackerRank', languageProgress.length ? 'verified' : 'estimated'),
          recent: [],
        };
      }
    } catch (apiError) {
      console.warn(`[HackerRank] REST API failed: ${apiError.message}`);
    }

    try {
      console.log(`[HackerRank] Attempting profile page scraping`);
      const profilePageUrl = `https://www.hackerrank.com/profile/${encodeURIComponent(lowerUsername)}`;
      const pageResp = await axiosInstance.get(profilePageUrl);
      const html = pageResp.data;
      const languageProgress = extractHackerRankLanguageProgress({}, html);
      const solvedMatch = html.match(/"solved_count"\s*:\s*(\d+)|"totalSolvedProblems"\s*:\s*(\d+)/i);
      const solvedCount = solvedMatch ? safeNumber(solvedMatch[1] || solvedMatch[2]) : null;
      const meaningfulStars = languageProgress.filter((item) => item.stars != null);
      const averageStars = meaningfulStars.length
        ? meaningfulStars.reduce((sum, item) => sum + item.stars, 0) / meaningfulStars.length
        : null;
      const codingScore = averageStars !== null ? Math.round(Math.min(100, (averageStars / 5) * 100)) : null;

      return {
        profile: finalizeProfile({
          username: lowerUsername,
          profile_url: profilePageUrl,
          avatar_url: null,
          reputation: null,
          rating: null,
          max_rating: null,
          problems_solved: solvedCount,
          contest_count: null,
          global_rank: null,
          country_rank: null,
          badges: null,
          languages: languageProgress.length ? languageProgress : null,
          stars_badges: null,
          country: null,
          hacker_name: null,
          coding_score: codingScore,
          achievements_analysis: {
            last_updated: null,
            recent_activity: [],
          },
        }, 'HackerRank', languageProgress.length ? 'estimated' : 'estimated'),
        recent: [],
      };
    } catch (scrapeError) {
      console.warn(`[HackerRank] Scraping failed: ${scrapeError.message}`);
    }

    console.warn(`[HackerRank] Could not fetch detailed stats. Returning basic profile with URL only`);
    return {
      profile: finalizeProfile({
        username: lowerUsername,
        profile_url: `https://www.hackerrank.com/profile/${encodeURIComponent(lowerUsername)}`,
        avatar_url: null,
        reputation: null,
        rating: null,
        max_rating: null,
        problems_solved: null,
        contest_count: null,
        global_rank: null,
        country_rank: null,
        badges: null,
        languages: null,
        stars_badges: null,
        country: null,
        hacker_name: null,
        coding_score: null,
        achievements_analysis: {
          last_updated: null,
          recent_activity: [],
        },
      }, 'HackerRank', 'estimated'),
      recent: [],
    };
  } catch (error) {
    console.error(`[HackerRank] Final error for ${username}: ${error.message}`);
    throw error;
  }
};

// ===== CODECHEF FETCHER =====

const fetchCodeChefProfile = async (username) => {
  const lowerUsername = String(username).trim();
  if (!lowerUsername) return { profile: null, recent: [] };

  try {
    const html = await axiosInstance.get(`https://www.codechef.com/users/${encodeURIComponent(lowerUsername)}`);
    const data = html.data;

    // Extract current rating
    const ratingMatch = data.match(/rating-number\s*">\s*([\d,]+)/i) || data.match(/"currentRating"\s*:\s*(\d+)/i) || data.match(/Current Rating[^0-9]*(\d+)/i);
    const rating = ratingMatch ? safeNumber(ratingMatch[1]) : null;

    // Extract highest rating
    const highestRatingMatch = data.match(/Highest Rating[^0-9]*(\d+)/i) || data.match(/"highestRating"\s*:\s*(\d+)/i);
    const highestRating = highestRatingMatch ? safeNumber(highestRatingMatch[1]) : null;

    // Extract stars
    const starsMatch = data.match(/rating-star\s*">\s*([^<]+)/i) || data.match(/★+/g);
    const stars = starsMatch ? (Array.isArray(starsMatch) ? starsMatch.length : starsMatch[0]) : null;

    // Extract problems solved
    const problemsMatch = data.match(/Problems solved\s*<span[^>]*>([\d,]+)/i) || data.match(/"problemsSolved"\s*:\s*(\d+)/i);
    const problemsSolved = problemsMatch ? safeNumber(problemsMatch[1]) : null;

    // Extract global rank
    const globalRankMatch = data.match(/Global rank\s*<span[^>]*>#?([\d,]+)/i) || data.match(/"globalRank"\s*:\s*(\d+)/i);
    const globalRank = globalRankMatch ? safeNumber(globalRankMatch[1]) : null;

    // Extract country rank
    const countryRankMatch = data.match(/Country rank\s*<span[^>]*>#?([\d,]+)/i) || data.match(/"countryRank"\s*:\s*(\d+)/i);
    const countryRank = countryRankMatch ? safeNumber(countryRankMatch[1]) : null;

    // Extract contest count
    const contestMatch = data.match(/contests\/[\w\d]*[^>]*>([\d,]+)/i) || data.match(/"contestCount"\s*:\s*(\d+)/i);
    const contestCount = contestMatch ? safeNumber(contestMatch[1]) : null;

    // Extract country
    const countryMatch = data.match(/Country[^<]*<span[^>]*>([^<]+)/i);
    const country = countryMatch ? countryMatch[1].trim() : null;

    // Extract badges
    const badgesMatch = data.match(/Badges<\/strong>[^<]*<span[^>]*>(\d+)/i) || data.match(/"badges"\s*:\s*(\d+)/i);
    const badges = badgesMatch ? safeNumber(badgesMatch[1]) : null;
    const recentContests = [...data.matchAll(/<a[^>]+href="\/contests\/[^"#]+"[^>]*>([^<]+)<\/a>/gi)]
      .map((match) => safeString(match[1]))
      .filter(Boolean)
      .slice(0, 5);

    return {
      profile: finalizeProfile({
        username: lowerUsername,
        profile_url: `https://www.codechef.com/users/${encodeURIComponent(lowerUsername)}`,
        avatar_url: null,
        reputation: null,
        rating: rating,
        max_rating: highestRating,
        problems_solved: problemsSolved,
        contest_count: contestCount,
        global_rank: globalRank,
        country_rank: countryRank,
        badges: badges ? [badges] : null,
        stars_badges: stars || null,
        country: country,
        achievements_analysis: {
          recent_contests: recentContests.map((name) => ({ name })),
          recent_activity: [],
          last_updated: null,
        },
      }, 'CodeChef', 'estimated'),
      recent: [],
    };
  } catch (error) {
    console.warn(`[CodeChef] Fetch failed for ${username}: ${error.message}`);
    throw error;
  }
};

// ===== MAIN FETCHER =====

const fetchProfileData = async ({ platform, username, profile_url }) => {
  const normalizedPlatform = normalizePlatform(platform) || inferPlatformFromURL(profile_url);
  const extractedUsername = extractUsernameFromURL(normalizedPlatform, profile_url);
  const effectiveUsername = username ? String(username).trim() : extractedUsername ? String(extractedUsername).trim() : null;

  if (!normalizedPlatform || !effectiveUsername) {
    return { profile: null, recent: [] };
  }

  try {
    switch (normalizedPlatform) {
      case 'leetcode':
        return await fetchLeetCodeProfile(effectiveUsername);
      case 'codechef':
        return await fetchCodeChefProfile(effectiveUsername);
      case 'hackerrank':
        // Disabled: HackerRank automatic scraping is removed. Use screenshot upload instead.
        console.log('[fetchProfileData] HackerRank automatic fetching disabled; returning null.');
        return { profile: null, recent: [] };
      default:
        return { profile: null, recent: [] };
    }
  } catch (error) {
    console.warn(`Failed to fetch ${normalizedPlatform} profile for ${effectiveUsername}: ${error.message}`);
    return { profile: null, recent: [] };
  }
};

module.exports = {
  fetchProfileData,
  parseRecentSolved,
  extractLeetCodeUsername,
  extractCodeChefUsername,
  extractHackerRankUsername,
  extractUsernameFromURL,
  normalizePlatform,
  inferPlatformFromURL,
  isValidProfileURL,
  buildProfileAnalytics,
  buildPlatformProfileURL,
};
