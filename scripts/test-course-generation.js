const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

function parseTimestamp(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseChapters(desc, totalDuration) {
  const lines = desc.split('\n');
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/;
  const rawList = [];

  for (const line of lines) {
    const m = line.trim().match(regex);
    if (m) {
      const timeStr = m[1];
      const title = m[2].replace(/^[–—\-:\s]+/, '').trim();
      const seconds = parseTimestamp(timeStr);
      if (!isNaN(seconds) && title) {
        rawList.push({ seconds, title });
      }
    }
  }

  rawList.sort((a, b) => a.seconds - b.seconds);
  const chapters = [];
  for (let i = 0; i < rawList.length; i++) {
    const cur = rawList[i];
    const next = rawList[i + 1];
    const end = next ? next.seconds : totalDuration;
    chapters.push({
      title: cur.title,
      startSeconds: cur.seconds,
      endSeconds: end,
      durationSeconds: Math.max(10, end - cur.seconds),
    });
  }
  return chapters;
}

function organizeIntoDays(lessons, totalDuration) {
  // Target around 5 to 7 days, or ~1.5 to 2.2 hours per day
  const targetDaysCount = Math.min(8, Math.max(3, Math.ceil(totalDuration / (2 * 3600))));
  const targetDayDuration = totalDuration / targetDaysCount;

  const days = [];
  let currentDayLessons = [];
  let currentDaySeconds = 0;
  let dayIndex = 1;

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    currentDayLessons.push(lesson);
    currentDaySeconds += lesson.durationSeconds;

    // Check if we should close this day
    const isLast = i === lessons.length - 1;
    const isOverTarget = currentDaySeconds >= targetDayDuration * 0.9;
    const hasMoreDaysNeeded = dayIndex < targetDaysCount;

    if (isLast || (isOverTarget && hasMoreDaysNeeded)) {
      // Determine descriptive day title from first and key topics
      const firstTitle = currentDayLessons[0]?.title || `Module ${dayIndex}`;
      const lastTitle = currentDayLessons[currentDayLessons.length - 1]?.title || '';
      
      let dayTitle = `Day ${dayIndex} (${firstTitle.split(':')[0].split('&')[0].trim()})`;
      if (dayIndex === 1) dayTitle = `Day 1 (Core Fundamentals & Setup)`;
      else if (firstTitle.toLowerCase().includes('operator') || firstTitle.toLowerCase().includes('if') || firstTitle.toLowerCase().includes('loop')) {
        dayTitle = `Day ${dayIndex} (Operators & Control Flow)`;
      } else if (firstTitle.toLowerCase().includes('list') || firstTitle.toLowerCase().includes('tuple') || firstTitle.toLowerCase().includes('set') || firstTitle.toLowerCase().includes('dict')) {
        dayTitle = `Day ${dayIndex} (Python Data Structures)`;
      } else if (firstTitle.toLowerCase().includes('function') || firstTitle.toLowerCase().includes('lambda')) {
        dayTitle = `Day ${dayIndex} (Functions & Advanced Logic)`;
      } else if (firstTitle.toLowerCase().includes('llm') || firstTitle.toLowerCase().includes('ai') || firstTitle.toLowerCase().includes('prompt')) {
        dayTitle = `Day ${dayIndex} (AI & LLM Foundations)`;
      } else if (firstTitle.toLowerCase().includes('rag') || firstTitle.toLowerCase().includes('agent') || firstTitle.toLowerCase().includes('mcp')) {
        dayTitle = `Day ${dayIndex} (Agentic AI, RAG & MCP)`;
      }

      days.push({
        title: dayTitle,
        description: `Day ${dayIndex} learning plan covering ${currentDayLessons.length} lessons (${Math.round(currentDaySeconds / 60)} minutes).`,
        lessons: [...currentDayLessons],
        totalSeconds: currentDaySeconds,
      });

      dayIndex++;
      currentDayLessons = [];
      currentDaySeconds = 0;
    }
  }

  return days;
}

async function run() {
  const html = await fetchPage('https://www.youtube.com/watch?v=J9BI0jGOds8');
  const durMatch = html.match(/"approxDurationMs":"(\d+)"/);
  const totalDuration = durMatch ? Math.floor(parseInt(durMatch[1]) / 1000) : 46899;

  const descMatch = html.match(/"shortDescription":"(.*?)"/);
  const desc = JSON.parse(`"${descMatch[1]}"`);

  const lessons = parseChapters(desc, totalDuration);
  console.log(`Parsed ${lessons.length} lessons from YouTube timestamps.`);

  const dailyPlan = organizeIntoDays(lessons, totalDuration);
  console.log(`\nCreated ${dailyPlan.length} Days in Daily Plan:`);
  dailyPlan.forEach((d, idx) => {
    const hrs = (d.totalSeconds / 3600).toFixed(1);
    console.log(`\n=== ${d.title} [${d.lessons.length} lessons, ${hrs} hours] ===`);
    d.lessons.slice(0, 3).forEach(l => {
      console.log(`   - [${Math.floor(l.startSeconds/60)}m - ${Math.floor(l.endSeconds/60)}m] ${l.title}`);
    });
    if (d.lessons.length > 3) console.log(`   ... and ${d.lessons.length - 3} more lessons`);
  });
}

run().catch(console.error);

