const axios = require('axios');

async function printBadges(username) {
  try {
    const url = `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`;
    console.log('Fetching:', url);
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    console.log('HTTP status:', res.status);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error fetching badges:', err && err.toString ? err.toString() : err);
    if (err.response) {
      console.error('Response status:', err.response.status);
      try { console.error(JSON.stringify(err.response.data, null, 2)); } catch (e) {}
    }
    process.exitCode = 2;
  }
}

const username = process.argv[2] || 'tourist';
printBadges(username);
