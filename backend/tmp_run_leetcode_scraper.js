const fs = require('fs');
const path = require('path');
const { fetchLeetCodeProfile } = require('./src/playwright/leetcodeScraper');

(async function run() {
  try {
    const username = 'SatyaKavisetti';
    console.log('Running leetcode scraper for', username);
    const result = await fetchLeetCodeProfile(username);
    console.dir(result, { depth: null });

    const outPath = path.join(__dirname, 'debug_scraper_output.json');
    try {
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
      console.log('Saved scraper output to', outPath);
    } catch (writeErr) {
      console.error('Failed to write debug output file:', writeErr);
    }

    process.exit(0);
  } catch (error) {
    console.error('Scraper run failed:', error);
    // Ensure non-zero exit on failure
    process.exit(1);
  }
})();
