const test = require('node:test');
const assert = require('node:assert/strict');
const { buildNormalizedProfile } = require('../src/services/leetcodeGraphql.service');

test('buildNormalizedProfile prefers the direct daily streak over calendar fallback', () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

  const profile = buildNormalizedProfile(
    {
      matchedUser: {
        username: 'alice',
        profile: {
          userAvatar: 'avatar.png',
          realName: 'Alice',
          reputation: 1234,
          ranking: 45,
          countryName: 'US',
          company: 'Test Corp',
          school: 'Test University',
          aboutMe: 'Engineer',
        },
        submitStats: {
          acSubmissionNum: [
            { difficulty: 'All', count: 120 },
            { difficulty: 'Easy', count: 80 },
            { difficulty: 'Medium', count: 30 },
            { difficulty: 'Hard', count: 10 },
          ],
        },
        recentAcSubmissionList: [],
        topicTags: [],
      },
    },
    'alice',
    {
      currentStreak: 1,
      submissionCalendar: [
        { date: now.toISOString().slice(0, 10), count: 1 },
        { date: yesterday.toISOString().slice(0, 10), count: 1 },
        { date: twoDaysAgo.toISOString().slice(0, 10), count: 1 },
      ],
      badges: [],
      contestRanking: {},
    }
  );

  assert.equal(profile.profile.currentStreak, 1);
  assert.equal(profile.profile.maxStreak, 3);
  assert.equal(profile.profile.activeDays, 3);
});
