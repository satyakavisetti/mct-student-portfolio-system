const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePersistedUsername } = require('../src/services/codingSyncService');

test('resolvePersistedUsername preserves the original HackerRank username', () => {
  assert.equal(
    resolvePersistedUsername({
      platform: 'hackerrank',
      inputUsername: 'matetivaidhika11',
      fallbackUsername: 'Vaidhika Mateti',
    }),
    'matetivaidhika11'
  );
});
