const https = require('https');
const fetch = (u) => new Promise((resolve, reject) => {
  const req = https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json, text/plain, */*' } }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
  });
  req.on('error', reject);
});
(async () => {
  try {
    const username = 'tourist';
    const paths = [
      `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/profile`,
      `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`,
    ];
    for (const path of paths) {
      const res = await fetch(path);
      console.log('PATH', path);
      console.log('STATUS', res.status);
      console.log(res.body.slice(0, 2000));
      console.log('---');
    }
  } catch (err) {
    console.error(err);
  }
})();
