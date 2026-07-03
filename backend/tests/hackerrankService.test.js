const test = require('node:test');
const assert = require('node:assert/strict');
const hackerrankService = require('../src/services/hackerrankService');

test('hackerrank service returns the extended profile fields', async () => {
  const profile = await hackerrankService.fetchProfile('tourist');

  assert.equal(profile.platform, 'hackerrank');
  assert.equal(profile.username, 'tourist');
  assert.ok(Array.isArray(profile.badges));
  assert.ok(Array.isArray(profile.skills));
  assert.ok(Array.isArray(profile.certifications));
  assert.ok(Array.isArray(profile.languageBadges));
  assert.ok(Array.isArray(profile.challengeTracks));
  assert.ok(Array.isArray(profile.recentProblems));
  assert.ok('profileUrl' in profile);
  assert.ok('avatarUrl' in profile);
});
