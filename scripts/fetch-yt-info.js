const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

async function run() {
  const html = await fetchPage('https://www.youtube.com/watch?v=J9BI0jGOds8');
  
  // Approx duration
  const durMatch = html.match(/"approxDurationMs":"(\d+)"/);
  if (durMatch) {
    const ms = parseInt(durMatch[1]);
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    console.log(`Duration: ${hrs}h ${mins}m ${secs}s (total seconds: ${totalSecs})`);
  }

  // Check description for timestamps / chapters!
  const descMatch = html.match(/"shortDescription":"(.*?)"/);
  if (descMatch) {
    console.log('Short description preview:');
    const desc = JSON.parse(`"${descMatch[1]}"`);
    console.log(desc.slice(0, 1500));
  }
}

run().catch(console.error);

