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

function parseTimestamp(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

async function run() {
  const html = await fetchPage('https://www.youtube.com/watch?v=J9BI0jGOds8');
  
  const durMatch = html.match(/"approxDurationMs":"(\d+)"/);
  const totalDuration = durMatch ? Math.floor(parseInt(durMatch[1]) / 1000) : 46899;
  console.log('Total duration:', totalDuration, 'seconds', `(${Math.floor(totalDuration/3600)}h ${Math.floor((totalDuration%3600)/60)}m)`);

  const descMatch = html.match(/"shortDescription":"(.*?)"/);
  if (!descMatch) {
    console.log('No description found');
    return;
  }
  const desc = JSON.parse(`"${descMatch[1]}"`);
  
  // Extract timestamps lines: e.g. "00:00 Intro: Master Python + AI" or "1:00:14 Float Data Type"
  const lines = desc.split('\n');
  const chapters = [];
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/;

  for (const line of lines) {
    const m = line.trim().match(regex);
    if (m) {
      const timeStr = m[1];
      const title = m[2].replace(/[–—\-]/, '').trim();
      const seconds = parseTimestamp(timeStr);
      chapters.push({ timeStr, seconds, title });
    }
  }

  console.log(`Found ${chapters.length} chapter marks in description:`);
  for (let i = 0; i < chapters.length; i++) {
    const cur = chapters[i];
    const next = chapters[i + 1];
    const endSeconds = next ? next.seconds : totalDuration;
    const dur = endSeconds - cur.seconds;
    console.log(`[${cur.timeStr}] ${cur.title} (${Math.floor(dur/60)}m ${dur%60}s)`);
  }
}

run().catch(console.error);

