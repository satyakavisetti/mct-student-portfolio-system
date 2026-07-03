const fs = require('fs');
const { launchBrowser } = require('./src/playwright/browser');
(async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: null, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36', locale: 'en-US', timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  await page.goto('https://leetcode.com/u/SatyaKavisetti/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', { timeout: 15000 });
  const nextData = await page.evaluate(() => window.__NEXT_DATA__);
  fs.writeFileSync('debug_next_data.json', JSON.stringify(nextData, null, 2), 'utf8');
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  const summary = queries.map((q) => ({ key: q.queryKey, dataKeys: q.state?.data ? Object.keys(q.state.data) : null }));
  fs.writeFileSync('debug_query_summary.json', JSON.stringify(summary, null, 2), 'utf8');
  await browser.close();
})();
