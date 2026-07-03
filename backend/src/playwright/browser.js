const { chromium } = require('playwright');

const launchBrowser = async () => {
  console.log('[Playwright] Launching browser');

  const launchOptions = {
    headless: true,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-infobars',
    ],
  };

  try {
    const browser = await chromium.launch(launchOptions);
    console.log('[Playwright] Browser launched');
    try {
      const version = await browser.version();
      console.log('[Playwright] Browser version:', version);
    } catch (versionError) {
      console.error('[Playwright] Failed to read browser version:', versionError);
    }
    return browser;
  } catch (error) {
    console.error('[Playwright] Browser launch failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    if (error.message && error.message.includes('channel chrome is not supported')) {
      try {
        const browser = await chromium.launch({
          headless: true,
          args: launchOptions.args,
        });
        console.log('[Playwright] Browser launched without chrome channel');
        try {
          const version = await browser.version();
          console.log('[Playwright] Browser version:', version);
        } catch (versionError) {
          console.error('[Playwright] Failed to read browser version after fallback:', versionError);
        }
        return browser;
      } catch (fallbackError) {
        console.error('Failed to launch Playwright browser fallback:', {
          name: fallbackError.name,
          message: fallbackError.message,
          stack: fallbackError.stack,
        });
        throw fallbackError;
      }
    }

    if (error.message && error.message.includes('Could not find Chromium')) {
      try {
        const browser = await chromium.launch({
          headless: true,
          args: launchOptions.args,
        });
        console.log('[Playwright] Browser launched without chrome channel');
        try {
          const version = await browser.version();
          console.log('[Playwright] Browser version:', version);
        } catch (versionError) {
          console.error('[Playwright] Failed to read browser version after fallback:', versionError);
        }
        return browser;
      } catch (fallbackError) {
        console.error('Failed to launch Playwright browser fallback:', {
          name: fallbackError.name,
          message: fallbackError.message,
          stack: fallbackError.stack,
        });
        throw fallbackError;
      }
    }

    console.error('Failed to launch Playwright browser:', error);
    throw error;
  }
};

module.exports = {
  launchBrowser,
  getBrowser: launchBrowser,
};
