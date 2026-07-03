const fs = require('fs');
const { launchBrowser } = require('./src/playwright/browser');
(async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: null, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36', locale:'en-US', timezoneId:'Asia/Kolkata' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  await page.goto('https://leetcode.com/u/SatyaKavisetti/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', { timeout: 15000 });
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  const lines = bodyText.split(/\r?\n/).filter(line => /Total Active Days|Max Streak|Streak|🔥|Skills|Topic|Topics|Solved|Activities|Active Days/i.test(line));
  console.log('matching lines count', lines.length);
  console.log(lines.slice(0, 80).join('\n'));
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('debug_leetcode_profile_body.txt', bodyText.slice(0, 10000), 'utf8');
  fs.writeFileSync('debug_leetcode_profile_html.txt', html.slice(0, 200000), 'utf8');
  await browser.close();
})();
