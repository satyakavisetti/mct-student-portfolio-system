const fs = require('fs');
const path = require('path');
const { launchBrowser } = require('./browser');

const debugDir = path.resolve(__dirname, '..', '..', 'debug');

const buildEmptyProfile = (username) => ({
  platform: 'leetcode',
  username: username || null,
  profileStatus: 'failed',
  lastFetched: new Date().toISOString(),
  rating: null,
  rank: null,
  problemsSolved: null,
  currentStreak: null,
  totalActiveDays: null,
  maxStreak: null,
  topicStatistics: null,
  badges: [],
  contests: [],
  recentProblems: [],
  success: false,
  error: null,
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
  const numeric = Number(value);
  let date = new Date(value);
  if (Number.isFinite(numeric) && String(value).trim().length <= 10) {
    date = new Date(numeric * 1000);
  }
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const parseJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};

const findValueByKey = (value, targetKey, seen = new Set()) => {
  if (!value || typeof value !== 'object') return null;
  const signature = typeof value === 'object' ? JSON.stringify(value).slice(0, 200) : String(value);
  if (seen.has(signature)) return null;
  seen.add(signature);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValueByKey(item, targetKey, seen);
      if (found !== null) return found;
    }
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(value, targetKey)) {
    return value[targetKey];
  }

  for (const child of Object.values(value)) {
    const found = findValueByKey(child, targetKey, seen);
    if (found !== null) return found;
  }

  return null;
};

  const findNumericValueByKey = (value, targetKey, seen = new Set()) => {
    const found = findValueByKey(value, targetKey, seen);
    if (found === null || found === undefined) return null;
    const parsed = Number(String(found).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };
const extractProblemCounts = (submitStats) => {
  const counts = { easy: null, medium: null, hard: null, total: null };
  if (!submitStats || typeof submitStats !== 'object') return counts;

  const acSubmissionNum = submitStats.acSubmissionNum || submitStats.acSubmissionNumGlobal || [];
  if (Array.isArray(acSubmissionNum) && acSubmissionNum.length) {
    for (const item of acSubmissionNum) {
      const difficulty = String(item?.difficulty || '').toLowerCase();
      const count = safeNumber(item?.count);
      if (difficulty === 'easy') counts.easy = count;
      if (difficulty === 'medium') counts.medium = count;
      if (difficulty === 'hard') counts.hard = count;
    }
    counts.total = [counts.easy, counts.medium, counts.hard].reduce((sum, n) => sum + (n || 0), 0);
    return counts;
  }

  const easy = safeNumber(submitStats.easySolved || submitStats.easyCount);
  const medium = safeNumber(submitStats.mediumSolved || submitStats.mediumCount);
  const hard = safeNumber(submitStats.hardSolved || submitStats.hardCount);
  const total = safeNumber(submitStats.totalSolved || submitStats.problemSolved || submitStats.solvedCount);

  return {
    easy,
    medium,
    hard,
    total: total || [easy, medium, hard].reduce((sum, n) => sum + (n || 0), 0),
  };
};

const normalizeBadges = (contestBadge) => {
  const badges = [];
  if (!contestBadge) return badges;

  let badgeList = contestBadge;
  if (!Array.isArray(badgeList)) {
    if (Array.isArray(contestBadge?.badges)) {
      badgeList = contestBadge.badges;
    } else if (Array.isArray(contestBadge?.upcomingBadges)) {
      badgeList = contestBadge.upcomingBadges;
    } else {
      badgeList = [contestBadge];
    }
  }

  for (const badge of badgeList) {
    if (!badge || typeof badge !== 'object') continue;
    const name = safeString(badge?.badgeName || badge?.name || badge?.title || badge?.displayName);
    const icon = safeString(badge?.icon || badge?.imageUrl || badge?.iconUrl || badge?.medal?.config?.iconGif);
    const expired = Boolean(badge?.expired || badge?.isExpired || false);
    if (name) badges.push({ name, icon, expired });
  }

  return badges;
};

const normalizeContests = (contestHistory) => {
  const contests = [];
  if (!Array.isArray(contestHistory)) return contests;

  for (const entry of contestHistory) {
    if (!entry || typeof entry !== 'object') continue;
    const contestName = safeString(
      entry?.contestName ||
      entry?.contest?.title ||
      entry?.title ||
      entry?.contest_title ||
      entry?.name
    );
    const contestDate = normalizeDate(entry?.startTime || entry?.contest?.startTime || entry?.date || entry?.contestDate);
    const rank = safeNumber(entry?.ranking || entry?.rank || entry?.ranking || entry?.contest?.ranking);
    const ratingAfter = safeNumber(entry?.rating || entry?.newRating || entry?.contest?.rating);
    const ratingChange = safeNumber(entry?.ratingProgress || entry?.delta || entry?.contest?.ratingProgress);
    const ratingBefore = ratingChange != null && ratingAfter != null ? ratingAfter - ratingChange : safeNumber(entry?.oldRating || entry?.contest?.oldRating);
    const problemsSolved = safeNumber(
      entry?.problemsSolved || entry?.solvedCount || entry?.problemSolved || entry?.contest?.problemsSolved || entry?.problemsSolved
    );

    if (!contestName) continue;
    contests.push({
      contestName,
      contestDate,
      rank,
      ratingBefore,
      ratingAfter,
      ratingChange,
      problemsSolved,
    });
  }

  return contests;
};

const normalizeRecentProblems = (recentList) => {
  const recentProblems = [];
  if (!Array.isArray(recentList)) return recentProblems;

  for (const entry of recentList) {
    if (!entry || typeof entry !== 'object') continue;
    const title = safeString(entry?.title);
    const titleSlug = safeString(entry?.titleSlug || entry?.slug);
    const difficulty = safeString(entry?.difficulty || entry?.level);
    const solvedDate = normalizeDate(entry?.timestamp || entry?.submitTimestamp || entry?.createdAt);
    const url = titleSlug ? `https://leetcode.com/problems/${titleSlug}/` : safeString(entry?.url);

    if (!title) continue;
    recentProblems.push({ title, difficulty, url, solvedDate });
  }

  return recentProblems;
};

const extractNumericValue = (data, key) => {
    const value = findValueByKey(data, key);
    if (value === null || value === undefined) return null;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const extractProfileFromQueries = (queries) => {
  const queryKeyStrings = queries.map((query) => JSON.stringify(query.queryKey || [])).filter(Boolean);
  console.log('[Playwright] All queryKey values:', queryKeyStrings);

  const queryDataList = queries.map((query) => query.state?.data).filter(Boolean);

  const matchedUser = findValueByKey(queryDataList, 'matchedUser');
  const matchedUserKeys = queries
    .filter((query) => query.state?.data && findValueByKey(query.state.data, 'matchedUser'))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (matchedUserKeys.length) console.log('[Playwright] Found matchedUser in', matchedUserKeys);

  const submitStats = findValueByKey(queryDataList, 'submitStats') || matchedUser?.submitStats;
  const submitStatsKeys = queries
    .filter((query) => query.state?.data && findValueByKey(query.state.data, 'submitStats'))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (submitStatsKeys.length) console.log('[Playwright] Found submitStats in', submitStatsKeys);

  const userContestRanking = findValueByKey(queryDataList, 'userContestRanking') || matchedUser?.userContestRanking;
  const contestRankingKeys = queries
    .filter((query) => query.state?.data && findValueByKey(query.state.data, 'userContestRanking'))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (contestRankingKeys.length) console.log('[Playwright] Found contestRanking in', contestRankingKeys);

  const recentAcSubmissionList = findValueByKey(queryDataList, 'recentAcSubmissionList') || matchedUser?.recentAcSubmissionList;
  const recentAcKeys = queries
    .filter((query) => query.state?.data && findValueByKey(query.state.data, 'recentAcSubmissionList'))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (recentAcKeys.length) console.log('[Playwright] Found recentAcSubmissionList in', recentAcKeys);

  const recentSubmissionList = findValueByKey(queryDataList, 'recentSubmissionList') || matchedUser?.recentSubmissionList;
  const recentSubmissionKeys = queries
    .filter((query) => query.state?.data && findValueByKey(query.state.data, 'recentSubmissionList'))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (recentSubmissionKeys.length) console.log('[Playwright] Found recentSubmissionList in', recentSubmissionKeys);

  const contestHistory = findValueByKey(queryDataList, 'contestHistory') || findValueByKey(queryDataList, 'userContestRankingHistory') || matchedUser?.userContestRankingHistory;
  const contestHistoryKeys = queries
    .filter((query) => query.state?.data && (findValueByKey(query.state.data, 'contestHistory') || findValueByKey(query.state.data, 'userContestRankingHistory')))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (contestHistoryKeys.length) console.log('[Playwright] Found contest history in', contestHistoryKeys);

  const contestBadge = matchedUser?.contestBadge || findValueByKey(queryDataList, 'contestBadge');
  const contestBadgeKeys = queries
    .filter((query) => query.state?.data && findValueByKey(query.state.data, 'contestBadge'))
    .map((query) => JSON.stringify(query.queryKey || []));
  if (contestBadgeKeys.length) console.log('[Playwright] Found contestBadge in', contestBadgeKeys);

  return {
    matchedUser,
    submitStats,
    userContestRanking,
    recentAcSubmissionList,
    recentSubmissionList,
    contestHistory,
    contestBadge,
    currentStreak: extractNumericValue(queryDataList, 'currentStreak'),
    maxStreak: extractNumericValue(queryDataList, 'maxStreak'),
    activeDays: extractNumericValue(queryDataList, 'activeDays') ?? extractNumericValue(queryDataList, 'totalActiveDays'),
    totalSolved: extractNumericValue(queryDataList, 'totalSolved') ?? extractNumericValue(queryDataList, 'problemsSolved'),
    queryKeyStrings,
    matchedQueryKeys: [
      ...(matchedUserKeys || []),
      ...(submitStatsKeys || []),
      ...(contestRankingKeys || []),
      ...(recentAcKeys || []),
      ...(recentSubmissionKeys || []),
      ...(contestHistoryKeys || []),
      ...(contestBadgeKeys || []),
    ],
  };
};

const requestGraphQL = async (page, operationName, query, variables = {}) => {
  console.log(`[Playwright] GraphQL request ${operationName}`);
  const response = await page.request.post('https://leetcode.com/graphql/', {
    headers: {
      'content-type': 'application/json',
      referer: 'https://leetcode.com/u/' + encodeURIComponent(variables.username || '' ) + '/',
      origin: 'https://leetcode.com',
      accept: 'application/json, text/plain, */*',
    },
    data: {
      query,
      variables,
      operationName,
    },
  });

  const status = response.status();
  const json = await response.json().catch((error) => {
    console.error(`[Playwright] GraphQL ${operationName} parse failed:`, error.message);
    return null;
  });

  console.log(`[Playwright] GraphQL ${operationName} status:`, status);
  if (json) {
    console.log(`[Playwright] GraphQL ${operationName} response keys:`, Object.keys(json));
    if (json.errors) {
      console.error(`[Playwright] GraphQL ${operationName} errors:`, JSON.stringify(json.errors, null, 2));
    }
  }

  return json;
};

const extractProfileFromGraphQL = async (page, username) => {
  const profileQuery = `query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        userAvatar
        realName
        reputation
        countryName
        company
        school
      }
    }
  }`;

  const sessionProgressQuery = `query userSessionProgress($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }`;

  const contestQuery = `query userContestRankingInfo($username: String!) {
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
    userContestRankingHistory(username: $username) {
      attended
      trendDirection
      problemsSolved
      totalProblems
      finishTimeInSeconds
      rating
      ranking
      contest {
        title
        startTime
      }
    }
  }`;

  const badgesQuery = `query userBadges($username: String!) {
    matchedUser(username: $username) {
      badges {
        id
        name
        shortName
        displayName
        icon
        hoverText
        medal {
          slug
          config {
            iconGif
            iconGifBackground
          }
        }
        creationDate
        category
      }
    }
  }`;

  const recentQuery = `query recentAcSubmissionList($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }`;

  const [profileResponse, sessionResponse, contestResponse, badgesResponse, recentResponse] = await Promise.all([
    requestGraphQL(page, 'userProfile', profileQuery, { username }),
    requestGraphQL(page, 'userSessionProgress', sessionProgressQuery, { username }),
    requestGraphQL(page, 'userContestRankingInfo', contestQuery, { username }),
    requestGraphQL(page, 'userBadges', badgesQuery, { username }),
    requestGraphQL(page, 'recentAcSubmissionList', recentQuery, { username, limit: 20 }),
  ]);

  const profile = profileResponse?.data?.matchedUser || null;
  const submitStats = sessionResponse?.data?.matchedUser?.submitStats || null;
  const userContestRanking = contestResponse?.data?.userContestRanking || null;
  const contestHistory = contestResponse?.data?.userContestRankingHistory || null;
  const badges = badgesResponse?.data?.matchedUser?.badges || null;
  const recentAcSubmissionList = recentResponse?.data?.recentAcSubmissionList || null;
  const normalizedBadges = Array.isArray(badges) ? badges : [];

  return {
    matchedUser: profile,
    submitStats,
    userContestRanking,
    contestHistory,
    userContestRankingHistory: contestHistory,
    contestBadge: normalizedBadges,
    recentAcSubmissionList,
  };
};

const extractFromNextData = async (page, username) => {
  const nextData = await page.evaluate(() => window.__NEXT_DATA__);
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  const profileData = extractProfileFromQueries(queries);

  const shouldUseGraphQL = !profileData.matchedUser || !profileData.submitStats || !profileData.userContestRanking || (!profileData.recentAcSubmissionList && !profileData.recentSubmissionList);
  let graphQLData = null;
  if (shouldUseGraphQL) {
    try {
      console.log('[Playwright] Falling back to GraphQL for missing data');
      graphQLData = await extractProfileFromGraphQL(page, username);
    } catch (error) {
      console.error('[Playwright] GraphQL fallback failed:', error);
    }
  }

  const matchedUser = profileData.matchedUser || graphQLData?.matchedUser || null;
  const submitStats = profileData.submitStats || graphQLData?.submitStats || matchedUser?.submitStats;
  const userContestRanking = profileData.userContestRanking || graphQLData?.userContestRanking || matchedUser?.userContestRanking;
  const contestHistory = profileData.contestHistory || graphQLData?.contestHistory || graphQLData?.userContestRankingHistory || matchedUser?.userContestRankingHistory;
  const contestBadge = profileData.contestBadge || graphQLData?.contestBadge || matchedUser?.contestBadge;
  const recentAcSubmissionList = profileData.recentAcSubmissionList || graphQLData?.recentAcSubmissionList || matchedUser?.recentAcSubmissionList;
  const recentSubmissionList = profileData.recentSubmissionList || graphQLData?.recentSubmissionList || matchedUser?.recentSubmissionList;

  if (graphQLData) {
    console.log('[Playwright] GraphQL fallback data merged into profile');
    if (!profileData.submitStats && graphQLData.submitStats) {
      console.log('[Playwright] GraphQL provided submitStats');
    }
    if (!profileData.userContestRanking && graphQLData.userContestRanking) {
      console.log('[Playwright] GraphQL provided userContestRanking');
    }
    if (!profileData.recentAcSubmissionList && graphQLData.recentAcSubmissionList) {
      console.log('[Playwright] GraphQL provided recentAcSubmissionList');
    }
  }

  const solvedCounts = extractProblemCounts(submitStats || graphQLData?.submitStats || matchedUser?.submitStats);
  const badges = normalizeBadges(contestBadge);
  const contests = normalizeContests(contestHistory);
  const recentProblems = normalizeRecentProblems(recentAcSubmissionList || recentSubmissionList);
  const totalSolved = safeNumber(solvedCounts.total);

  const parsedProfile = {
    platform: 'leetcode',
    username: safeString(matchedUser?.username || username),
    realName: safeString(matchedUser?.profile?.realName || matchedUser?.realName),
    avatar: safeString(matchedUser?.profile?.userAvatar || matchedUser?.profile?.avatar || matchedUser?.userAvatar),
    rank: safeNumber(userContestRanking?.globalRanking || userContestRanking?.global_rank || matchedUser?.profile?.ranking),
    reputation: safeNumber(matchedUser?.profile?.reputation || matchedUser?.reputation),
    country: safeString(matchedUser?.profile?.countryName || matchedUser?.profile?.country),
    company: safeString(matchedUser?.profile?.company),
    school: safeString(matchedUser?.profile?.school),
    rating: safeNumber(userContestRanking?.rating || matchedUser?.profile?.rating),
    problemsSolved: totalSolved,
    badges,
    contests,
    recentProblems,
    profileUrl: safeString(matchedUser?.profile?.profileUrl) || (matchedUser?.username ? `https://leetcode.com/u/${safeString(matchedUser.username)}/` : null),
    queryKeys: profileData.queryKeyStrings,
    matchedQueryKeys: profileData.matchedQueryKeys,
  };

  console.log('[Playwright] Final Parsed Profile');
  console.dir(parsedProfile, { depth: null });

  return parsedProfile;
};

const waitForAnySelector = async (page, selectors, timeout = 20000) => {
  const errors = [];
  for (const selector of selectors) {
    try {
      const element = await page.waitForSelector(selector, { timeout });
      if (element) {
        console.log('[Playwright] Found selector for required section', { selector });
        return element;
      }
    } catch (error) {
      errors.push(error.message || String(error));
    }
  }
  throw new Error(`No selectors matched among [${selectors.join(', ')}]: ${errors.join(' | ')}`);
};

const waitForRequiredSections = async (page) => {
  try {
    await waitForAnySelector(page, [
      'body',
    ], 20000);
  } catch (error) {
    console.warn('[Playwright] body selector not found; continuing anyway', { message: error?.message });
  }
};

const extractFromDom = async (page) => {
  try {
    await waitForRequiredSections(page);

    // Ensure Skills section is visible and expanded so all topic groups render
    try {
      await page.evaluate(() => {
        const findSkillsRoot = () => {
          // prefer elements that contain the 'Skills' heading text
          const candidates = Array.from(document.querySelectorAll('section, div'));
          for (const el of candidates) {
            const text = (el.textContent || '').trim();
            if (/\bSkills\b/i.test(text) && (el.querySelector('a[href*="/tag/"]') || /Advanced|Intermediate|Fundamental/i.test(text))) {
              return el;
            }
          }
          return document.body;
        };

        const root = findSkillsRoot();
        try { root.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) {}

        // Click any "Show more" elements inside the skills root to expand hidden topics
        const toggles = Array.from(root.querySelectorAll('span,button,a')).filter((el) => /show more/i.test(el.textContent || ''));
        for (const t of toggles) {
          try { t.click(); } catch (e) {}
        }
      });
      // give a moment for client-side rendering to update
      await page.waitForTimeout(500);
    } catch (err) {
      console.warn('[Playwright] Failed to expand Skills section:', err?.message || err);
    }

    const domData = await page.evaluate(() => {
      const safeText = (value) => {
        if (!value) return null;
        const text = String(value).trim();
        return text || null;
      };

      const parseNumber = (value) => {
        if (value === undefined || value === null) return null;
        const normalized = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        return normalized ? Number(normalized[0]) : null;
      };

      const parsePercentage = (value) => {
        const number = parseNumber(value);
        return number !== null ? number : null;
      };

      const findNearestNumber = (element) => {
        if (!element) return null;
        const text = element.textContent || '';
        const parsed = parseNumber(text);
        if (parsed !== null) return parsed;
        const siblings = [element.nextElementSibling, element.previousElementSibling, element.parentElement, element.closest('div')?.nextElementSibling];
        for (const sibling of siblings) {
          if (!sibling) continue;
          const siblingText = sibling.textContent || '';
          const parsedSibling = parseNumber(siblingText);
          if (parsedSibling !== null) return parsedSibling;
        }
        return null;
      };

      const queryText = (regex) => {
        const body = document.body.innerText || '';
        const match = body.match(regex);
        return match ? match[1] : null;
      };

      const findLabelValue = (labelRegex, valueRegex) => {
        const candidateElements = Array.from(document.querySelectorAll('body *')).filter((el) => {
          const text = el.textContent || '';
          return labelRegex.test(text);
        });
        for (const element of candidateElements) {
          const text = element.textContent || '';
          if (valueRegex) {
            const directMatch = text.match(valueRegex);
            if (directMatch) return directMatch[1];
          }
          const siblingValue = findNearestNumber(element);
          if (siblingValue !== null) return siblingValue;
        }
        return null;
      };

      const findTopicSection = () => {
        const sections = Array.from(document.querySelectorAll('section, div')).filter((el) => {
          const text = (el.textContent || '').toLowerCase();
          return /skills|topic|topic statistics|topics/i.test(text);
        });
        return sections.find((section) => section.querySelectorAll('li, div, span').length > 1) || sections[0] || null;
      };

      const parseTopicStatistics = () => {
        const section = findTopicSection() || document.body;
        if (!section) return null;

        const topicsMap = Object.create(null);

        // Collect all anchors that link to tag pages
        const anchors = Array.from(section.querySelectorAll('a[href*="/tag/"]'));
        for (const anchor of anchors) {
          const topicName = safeText(anchor.textContent) || null;
          if (!topicName) continue;

          // find nearest container that likely holds the count (e.g., the .mb-3 inline-block)
          let container = anchor.closest('div') || anchor.parentElement || anchor;
          // build text from container to search for numeric count
          const containerText = (container && (container.textContent || '')) || '';
          // try to match patterns like 'x38' or 'x 38' or trailing number
          let match = containerText.match(/x\s*([0-9,]+)/i) || containerText.match(/([0-9,]+)\s*$/);
          let count = match ? parseNumber(match[1]) : null;

          // If count still null, try to inspect immediate siblings for a numeric span
          if (count === null) {
            const siblings = Array.from(container.querySelectorAll('span'))
              .map((s) => s.textContent || '')
              .reverse();
            for (const t of siblings) {
              const m = String(t).match(/x\s*([0-9,]+)/i) || String(t).match(/([0-9,]+)\s*$/);
              if (m) { count = parseNumber(m[1]); break; }
            }
          }

          // default to 0 when no numeric value found
          if (count === null) count = 0;

          // keep the larger count if duplicate topics appear
          const existing = topicsMap[topicName];
          topicsMap[topicName] = existing ? Math.max(existing, count) : count;
        }

        // If nothing found via anchors, fallback to line-based parsing across section text
        if (!Object.keys(topicsMap).length) {
          const lines = (section.innerText || '').split(/\n|\r/).map((l) => l.trim()).filter(Boolean);
          for (const line of lines) {
            const m = line.match(/^(.{1,80}?)\s*(?:x|×)\s*([0-9,]+)\b/i) || line.match(/^(.{1,80}?)\s+([0-9,]+)\b$/i);
            if (m) {
              const t = m[1].trim();
              const c = parseNumber(m[2]);
              if (t && Number.isFinite(c)) {
                topicsMap[t] = topicsMap[t] ? Math.max(topicsMap[t], c) : c;
              }
            }
          }
        }

        const keys = Object.keys(topicsMap);
        if (!keys.length) return null;

        // Normalize keys by trimming and return a plain object
        const result = {};
        for (const k of keys) result[String(k).trim()] = topicsMap[k];

        // Log topic statistics before returning
        try { console.log('Topic statistics:', result); } catch (e) {}

        return result;
      };

      const parseRecentSubmissions = () => {
        const section = Array.from(document.querySelectorAll('section, div')).find((el) => {
          const text = (el.textContent || '').toLowerCase();
          return /recent submissions|recent activity|recent problems|recent questions|submission/i.test(text);
        });
        if (!section) return null;
        const submissions = [];
        const rows = Array.from(section.querySelectorAll('tr, li, div')).filter((node) => node.textContent && /submitted|accepted|wrong answer|runtime error|partial/i.test(node.textContent));
        for (const row of rows.slice(0, 20)) {
          const text = row.textContent || '';
          const title = safeText(row.querySelector('a')?.textContent) || safeText(row.querySelector('span')?.textContent) || null;
          const time = safeText(row.querySelector('time')?.textContent) || queryText(/(\d{1,2}\s+(?:minutes?|hours?|days?|weeks?|months?)\s+ago|\d{4}-\d{2}-\d{2}|\w+ \d{1,2}, \d{4})/i);
          const statusMatch = text.match(/(accepted|wrong answer|runtime error|time limit|memory limit|pending|submitted)/i);
          const status = statusMatch ? statusMatch[1] : null;
          const url = row.querySelector('a')?.href || null;
          if (title || status || time) {
            submissions.push({ title, status, time, url });
          }
        }
        return submissions.length ? submissions : null;
      };

      const parseActivityCalendar = () => {
        const calendarElements = Array.from(document.querySelectorAll('[data-date], rect, g[data-date], .calendar-day, .contribution-day'));
        const calendar = [];
        for (const element of calendarElements) {
          const date = element.getAttribute('data-date') || element.getAttribute('aria-label')?.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || null;
          const count = parseNumber(element.getAttribute('data-count') || element.getAttribute('count') || element.textContent);
          if (date) {
            calendar.push({ date, count, color: element.getAttribute('fill') || element.style?.backgroundColor || null });
          }
        }
        return calendar.length ? calendar : null;
      };

      const computeCalendarMetrics = (calendar) => {
        const entries = Array.isArray(calendar)
          ? calendar
              .map((entry) => ({ date: safeText(entry?.date), count: parseNumber(entry?.count) || 0 }))
              .filter((entry) => entry.date)
              .sort((left, right) => left.date.localeCompare(right.date))
          : [];
        if (!entries.length) {
          return { totalActiveDays: null, currentStreak: null, maxStreak: null };
        }

        const activeDates = new Set(entries.filter((entry) => entry.count > 0).map((entry) => entry.date));
        const totalActiveDays = activeDates.size || null;

        let maxStreak = 0;
        let currentRun = 0;
        let previousDate = null;
        for (const entry of entries) {
          if (entry.count > 0) {
            if (previousDate && new Date(entry.date).getTime() - new Date(previousDate).getTime() === 86400000) {
              currentRun += 1;
            } else {
              currentRun = 1;
            }
            maxStreak = Math.max(maxStreak, currentRun);
          } else {
            currentRun = 0;
          }
          previousDate = entry.date;
        }
        maxStreak = maxStreak || null;

        const latestDate = new Date(entries[entries.length - 1].date);
        latestDate.setUTCHours(0, 0, 0, 0);
        let currentStreak = 0;
        for (let cursor = new Date(latestDate); cursor >= new Date(entries[0].date); cursor.setUTCDate(cursor.getUTCDate() - 1)) {
          const iso = cursor.toISOString().slice(0, 10);
          if (activeDates.has(iso)) {
            currentStreak += 1;
          } else {
            break;
          }
        }
        currentStreak = currentStreak || null;

        return { totalActiveDays, currentStreak, maxStreak };
      };

      const username = safeText(document.querySelector('h1, h2, [data-testid="profile-name"], .profile-name, .username')?.textContent) || null;
      const displayName = safeText(document.querySelector('.profile-name, .display-name, [data-testid="profile-display-name"], .realname')?.textContent) || null;
      const profileUrl = document.querySelector('a[href*="leetcode.com/u/"]')?.href || document.location.href;
      const avatarUrl = document.querySelector('img[src*="avatar"], img[class*="avatar"], img[alt*="profile"]')?.src || null;
      const country = safeText(document.querySelector('[alt*="flag"]')?.closest('div')?.innerText) || safeText(queryText(/country\s*[:\-]?\s*([A-Za-z ]+)/i));
      const rank = parseNumber(queryText(/global\s+ranking\s*[:\-]?\s*#?([0-9,]+)/i) || queryText(/ranking\s*[:\-]?\s*#?([0-9,]+)/i));
      const contestRating = parseNumber(queryText(/contest\s+rating\s*[:\-]?\s*([0-9,]+)/i));
      const maxRating = parseNumber(queryText(/max\s+rating\s*[:\-]?\s*([0-9,]+)/i));
      const globalRank = rank;
      const contestsAttended = parseNumber(queryText(/(attended\s+contests|contests\s+attended)\s*[:\-]?\s*([0-9,]+)/i) || queryText(/attended\s*[:\-]?\s*([0-9,]+)/i));
      const topPercentage = parsePercentage(queryText(/top\s*%\s*[:\-]?\s*([0-9,.]+)/i));
      const easySolved = parseNumber(queryText(/easy\s*[:\-]?\s*([0-9,]+)/i));
      const mediumSolved = parseNumber(queryText(/medium\s*[:\-]?\s*([0-9,]+)/i));
      const hardSolved = parseNumber(queryText(/hard\s*[:\-]?\s*([0-9,]+)/i));
      const totalSolved = parseNumber(queryText(/total\s*(?:problems\s*)?solved\s*[:\-]?\s*([0-9,]+)/i) || queryText(/([0-9,]+)\s+problems\s+solved/i) || queryText(/([0-9,]+)\s+solved/i));
      const currentStreak = parseNumber(
        queryText(/current\s+streak\s*[:\-]?\s*([0-9,]+)/i)
        || queryText(/(?:🔥|fire)\s*([0-9,]+)/i)
        || queryText(/(\d+)\s*[-–]?\s*day\s+streak/i)
      );
      const totalActiveDays = parseNumber(
        queryText(/total\s+active\s+days\s*[:\-]?\s*([0-9,]+)/i)
        || queryText(/active\s+days\s*[:\-]?\s*([0-9,]+)/i)
        || queryText(/([0-9,]+)\s*active\s+days/i)
      );
      const maxStreak = parseNumber(
        queryText(/max\s+streak\s*[:\-]?\s*([0-9,]+)/i)
        || queryText(/longest\s+streak\s*[:\-]?\s*([0-9,]+)/i)
        || queryText(/(?:streak|max)\s*[:\-]?\s*([0-9,]+)\s*(?:days|day)?/i)
      );
      const topicStatistics = parseTopicStatistics();
      const activityCalendar = parseActivityCalendar();
      const recentSubmissions = parseRecentSubmissions();

      return {
        username,
        displayName,
        profileUrl,
        avatarUrl,
        country,
        rank,
        contestRating,
        maxRating,
        globalRank,
        contestsAttended,
        topPercentage,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        currentStreak,
        totalActiveDays,
        maxStreak,
        activityCalendar,
        recentSubmissions,
        topicStatistics,
      };
    });

    return domData;
  } catch (error) {
    console.error('[Playwright] extractFromDom failed:', error?.message || error);
    return {};
  }
};

const safeGoto = async (page, url, { timeout = 60000, maxAttempts = 2, backoffMs = 2000, postLoadDelayMs = 3000 } = {}) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      console.log('[Playwright] Navigating to profile', { url, attempt, maxAttempts });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      if (postLoadDelayMs > 0) {
        await page.waitForTimeout(postLoadDelayMs);
      }
      console.log('[Playwright] Navigation completed', { url, attempt });
      return;
    } catch (navigationError) {
      lastError = navigationError;
      console.error('[Playwright] safeGoto navigation error', {
        attempt,
        message: navigationError?.message,
        name: navigationError?.name,
      });
      if (attempt >= maxAttempts) {
        throw new Error(`Navigation failed after ${maxAttempts} attempts: ${navigationError?.message || 'unknown error'}`);
      }
      console.log('[Playwright] Retrying navigation after delay', { backoffMs });
      await page.waitForTimeout(backoffMs);
    }
  }
  throw new Error(`Navigation failed after ${maxAttempts} attempts: ${lastError?.message || 'unknown error'}`);
};

const safeWaitForSelector = async (page, selector, timeout = 15000) => {
  try {
    console.log('[Playwright] Waiting for selector', { selector, timeout });
    const elementHandle = await page.waitForSelector(selector, { timeout });
    if (!elementHandle) {
      throw new Error(`Selector not found: ${selector}`);
    }
    console.log('[Playwright] Selector found', { selector });
    return elementHandle;
  } catch (error) {
    throw new Error(`Failed to find selector ${selector}: ${error?.message || 'timeout'}`);
  }
};

const safeClosePlaywright = async ({ page, context, browser }) => {
  if (page) {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      console.error('Failed to close Playwright page:', error?.message || error);
    }
  }
  if (context) {
    try {
      await context.close();
    } catch (error) {
      console.error('Failed to close Playwright context:', error?.message || error);
    }
  }
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Failed to close Playwright browser:', error?.message || error);
    }
  }
};

const waitForCloudflareToPass = async (page) => {
  const blockedPattern = /just a moment|checking your browser|captcha|access denied|cloudflare/i;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      const title = await page.title();
      const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
      if (!blockedPattern.test(`${title} ${bodyText}`)) {
        return false;
      }
    } catch (error) {
      // continue waiting
    }

    await page.waitForTimeout(3000);
  }

  return true;
};

async function fetchLeetCodeProfile(username) {
  const profile = buildEmptyProfile(username);
  const profileUrl = `https://leetcode.com/u/${encodeURIComponent(username)}/`;

  let browser = null;
  let context = null;
  let page = null;

  try {
    console.log('Launching browser');
    browser = await launchBrowser();
    console.log('Browser created');
    browser.on('disconnected', () => console.log('[Playwright] Browser disconnected'));

    console.log('Creating context');
    context = await browser.newContext({
      viewport: null,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Asia/Kolkata',
    });
    console.log('Context created');
    context.on('close', () => console.log('[Playwright] Context closed'));

    console.log('Creating page');
    page = await context.newPage();
    console.log('Page created');
    page.on('close', () => console.log('[Playwright] Page closed'));
    page.on('crash', () => console.log('[Playwright] Page crashed'));

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    console.log('[Playwright] browser.isConnected before goto:', browser.isConnected());
    console.log('Starting page.goto:', profileUrl);
    console.log('[Playwright] Waiting for Cloudflare...');
    try {
      await safeGoto(page, profileUrl, {
        timeout: 60000,
        maxAttempts: 2,
        backoffMs: 2000,
        postLoadDelayMs: 3000,
      });
      console.log('[Playwright] browser.isConnected after goto:', browser.isConnected());
    } catch (navigationError) {
      console.error('[Playwright] safeGoto failed:', {
        name: navigationError?.name,
        message: navigationError?.message,
      });
      console.log('[Playwright] browser.isConnected after goto error:', browser.isConnected());
      throw navigationError;
    }

    try {
      await safeWaitForSelector(page, 'body', 15000);
    } catch (selectorError) {
      console.error('[Playwright] profile selector wait failed:', selectorError?.message);
      throw selectorError;
    }

    for (let attempt = 0; attempt < 15; attempt += 1) {
      try {
        const title = (await page.title()).trim();
        const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
        const blocked = /just a moment|checking your browser|captcha|access denied|cloudflare/i.test(`${title} ${bodyText}`);
        if (!blocked) {
          console.log('Cloudflare solved');
          break;
        }
        await page.waitForTimeout(3000);
      } catch (error) {
        break;
      }
    }

    const finalTitle = (await page.title()).trim();
    const finalBodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    const stillBlocked = /just a moment|checking your browser|captcha|access denied|cloudflare/i.test(`${finalTitle} ${finalBodyText}`);

    if (stillBlocked) {
      profile.profileStatus = 'estimated';
      return profile;
    }

    console.log('[Playwright] Cloudflare cleared');
    console.log('[Playwright] Extracting __NEXT_DATA__');

    const nextData = await page.evaluate(() => window.__NEXT_DATA__);
    const nextDataJson = JSON.stringify(nextData || {}, null, 2);

    // By default do not write debug files. Enable by setting ENABLE_DEBUG_FILES=true in env.
    if (process.env.ENABLE_DEBUG_FILES === 'true') {
      try {
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const tempDebugDir = path.resolve(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDebugDir)) {
          fs.mkdirSync(tempDebugDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tempDebugDir, 'leetcode-next-data.json'), nextDataJson, 'utf8');
      } catch (writeError) {
        console.error('Failed to write next data debug file:', writeError);
      }

      try {
        const html = await page.evaluate(() => document.body.innerHTML);
        const tempDebugDir = path.resolve(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDebugDir)) {
          fs.mkdirSync(tempDebugDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tempDebugDir, 'leetcode-page.html'), html, 'utf8');
      } catch (writeError) {
        console.error('Failed to write page HTML debug file:', writeError);
      }
    } else {
      // Log minimal debug info instead of writing files
      try {
        console.log('[Playwright] __NEXT_DATA__ length:', nextDataJson ? nextDataJson.length : 0);
        const html = await page.evaluate(() => document.body.innerHTML);
        console.log('[Playwright] page HTML length:', html ? html.length : 0);
      } catch (err) {
        console.warn('[Playwright] Failed to extract page HTML for logging:', err?.message || err);
      }
    }

    const nextKeys = await page.evaluate(() => Object.keys(window.__NEXT_DATA__ || {}));
    const propsKeys = await page.evaluate(() => Object.keys((window.__NEXT_DATA__ || {}).props || {}));
    const pagePropsKeys = await page.evaluate(() => Object.keys(((window.__NEXT_DATA__ || {}).props || {}).pageProps || {}));

    console.log('window.__NEXT_DATA__ keys:', nextKeys);
    console.log('window.__NEXT_DATA__.props keys:', propsKeys);
    console.log('window.__NEXT_DATA__.props.pageProps keys:', pagePropsKeys);

    const extractedProfile = await extractFromNextData(page, username);
    const domProfile = await extractFromDom(page);

    // Merge strategy: prefer GraphQL/extractedProfile values and only use DOM to fill missing fields.
    const pick = (a, b) => (a !== undefined && a !== null ? a : (b !== undefined && b !== null ? b : null));

    const mergedProfile = {
      ...extractedProfile,
      displayName: pick(extractedProfile.displayName, domProfile.displayName),
      country: pick(extractedProfile.country, domProfile.country),
      contestRating: pick(extractedProfile.contestRating, domProfile.contestRating),
      maxRating: pick(extractedProfile.maxRating, domProfile.maxRating),
      contestsAttended: pick(extractedProfile.contestsAttended, domProfile.contestsAttended),
      topPercentage: pick(extractedProfile.topPercentage, domProfile.topPercentage),
      totalSolved: pick(extractedProfile.totalSolved, domProfile.totalSolved),
      easySolved: pick(extractedProfile.easySolved, domProfile.easySolved),
      mediumSolved: pick(extractedProfile.mediumSolved, domProfile.mediumSolved),
      hardSolved: pick(extractedProfile.hardSolved, domProfile.hardSolved),
      currentStreak: pick(extractedProfile.currentStreak, domProfile.currentStreak),
      totalActiveDays: pick(extractedProfile.totalActiveDays, domProfile.totalActiveDays),
      maxStreak: pick(extractedProfile.maxStreak, domProfile.maxStreak),
      activityCalendar: pick(extractedProfile.activityCalendar, domProfile.activityCalendar),
      recentSubmissions: pick(extractedProfile.recentSubmissions, domProfile.recentSubmissions),
      topicStatistics: pick(extractedProfile.topicStatistics, domProfile.topicStatistics),
    };

    const debugProfile = {
      username: mergedProfile.username || username,
      displayName: mergedProfile.displayName || null,
      profileUrl: mergedProfile.profileUrl || `https://leetcode.com/u/${encodeURIComponent(username)}/`,
      avatarUrl: mergedProfile.avatar || mergedProfile.avatarUrl || null,
      country: mergedProfile.country || null,
      rank: mergedProfile.rank || null,
      contestRating: mergedProfile.contestRating || null,
      maxRating: mergedProfile.maxRating || null,
      globalRank: mergedProfile.globalRank || mergedProfile.rank || null,
      contestsAttended: mergedProfile.contestsAttended || null,
      topPercentage: mergedProfile.topPercentage || null,
      totalSolved: mergedProfile.totalSolved || mergedProfile.problemsSolved || null,
      easySolved: mergedProfile.easySolved || null,
      mediumSolved: mergedProfile.mediumSolved || null,
      hardSolved: mergedProfile.hardSolved || null,
      currentStreak: mergedProfile.currentStreak || null,
      totalActiveDays: mergedProfile.totalActiveDays || null,
      maxStreak: mergedProfile.maxStreak || null,
      topicStatistics: mergedProfile.topicStatistics || null,
    };
    console.log('[Playwright] Final extracted LeetCode profile object:', JSON.stringify(debugProfile, null, 2));

    profile.username = safeString(mergedProfile?.username || username) || null;
    profile.profileStatus = mergedProfile ? 'active' : 'failed';
    profile.rating = safeNumber(mergedProfile?.rating);
    profile.rank = safeNumber(mergedProfile?.rank || mergedProfile?.globalRank || mergedProfile?.rank);
    profile.problemsSolved = mergedProfile?.totalSolved || mergedProfile?.problemsSolved || null;
    profile.currentStreak = safeNumber(mergedProfile?.currentStreak);
    profile.totalActiveDays = safeNumber(mergedProfile?.totalActiveDays);
    profile.maxStreak = safeNumber(mergedProfile?.maxStreak);
    profile.topicStatistics = mergedProfile?.topicStatistics || null;
    profile.badges = safeArray(mergedProfile?.badges);
    profile.contests = safeArray(mergedProfile?.contests);
    profile.recentProblems = safeArray(mergedProfile?.recentProblems);
    profile.success = true;
    profile.error = null;

    if (mergedProfile?.queryKeys) {
      console.log('[Playwright] Extracted query keys:', mergedProfile.queryKeys);
    }

    console.log('[Playwright] Profile parsed successfully');
    return profile;
  } catch (error) {
    console.error('LeetCode scraper failed:', error);
    profile.profileStatus = 'failed';
    profile.success = false;
    profile.error = error?.message || 'LeetCode scraper failed';
    return profile;
  } finally {
    console.log('Playwright cleanup start');
    await safeClosePlaywright({ page, context, browser });
    console.log('Playwright cleanup completed');
  }
}

module.exports = {
  fetchLeetCodeProfile,
};
