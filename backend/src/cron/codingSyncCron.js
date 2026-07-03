let cron;
try {
  cron = require('node-cron');
} catch (error) {
  cron = { schedule: () => ({}) };
}

const { syncAllCodingProfiles } = require('../services/codingSyncService');

const runInitialSync = async () => {
  try {
    await syncAllCodingProfiles();
  } catch (error) {
    console.error('[Coding Sync] Error:', error?.message || error);
  }
};

const startCodingSyncCron = () => {
  try {
    console.log('[Coding Sync] Started');
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('[Coding Sync] Started');
        await syncAllCodingProfiles();
        console.log('[Coding Sync] Finished');
      } catch (error) {
        console.error('[Coding Sync] Error:', error?.message || error);
      }
    });

    console.log('[Coding Sync] Finished');
  } catch (error) {
    console.error('[Coding Sync] Error:', error?.message || error);
  }
};

module.exports = {
  startCodingSyncCron,
  runInitialSync,
};
