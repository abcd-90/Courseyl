export interface YouTubeUrlInfo {
  valid: boolean;
  type: "VIDEO" | "PLAYLIST";
  videoId?: string;
  playlistId?: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VideoChapter {
  title: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  description?: string;
  chapters?: VideoChapter[];
}

export function parseYouTubeUrl(url: string): YouTubeUrlInfo {
  if (!url) return { valid: false, type: "VIDEO" };

  try {
    const trimmed = url.trim();
    const playlistMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    const videoMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);

    if (playlistMatch && !videoMatch) {
      return {
        valid: true,
        type: "PLAYLIST",
        playlistId: playlistMatch[1],
      };
    }

    if (videoMatch) {
      return {
        valid: true,
        type: playlistMatch ? "PLAYLIST" : "VIDEO",
        videoId: videoMatch[1],
        playlistId: playlistMatch ? playlistMatch[1] : undefined,
      };
    }

    if (/^[\w-]{11}$/.test(trimmed)) {
      return {
        valid: true,
        type: "VIDEO",
        videoId: trimmed,
      };
    }

    return { valid: false, type: "VIDEO" };
  } catch {
    return { valid: false, type: "VIDEO" };
  }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
  }
  return `${s}s`;
}

export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseChaptersFromDescription(description: string, totalDuration: number): VideoChapter[] {
  if (!description) return [];

  const lines = description.split("\n");
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/;
  const rawList: { seconds: number; title: string }[] = [];

  for (const line of lines) {
    const m = line.trim().match(regex);
    if (m) {
      const timeStr = m[1];
      const title = m[2].replace(/^[–—\-:\s]+/, "").trim();
      const parts = timeStr.split(":").map(Number);
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      }
      if (!isNaN(seconds) && title) {
        rawList.push({ seconds, title });
      }
    }
  }

  if (rawList.length === 0) return [];

  rawList.sort((a, b) => a.seconds - b.seconds);

  const chapters: VideoChapter[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const cur = rawList[i];
    const next = rawList[i + 1];
    const end = next ? next.seconds : totalDuration;
    const dur = Math.max(10, end - cur.seconds);
    chapters.push({
      title: cur.title,
      startSeconds: cur.seconds,
      endSeconds: end,
      durationSeconds: dur,
    });
  }

  return chapters;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          const durationSeconds = parseISO8601Duration(item.contentDetails.duration) || 1800;
          const description = item.snippet.description || "";
          const chapters = parseChaptersFromDescription(description, durationSeconds);
          return {
            videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl:
              item.snippet.thumbnails?.maxres?.url ||
              item.snippet.thumbnails?.high?.url ||
              `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            durationSeconds,
            description,
            chapters,
          };
        }
      }
    } catch (err) {
      console.warn("YouTube Data API fetch failed, falling back to watch page / oEmbed:", err);
    }
  }

  // Live Watch Page Scraping: Extracts real duration in seconds and chapter timestamps
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract duration in seconds
      const durMatch = html.match(/"approxDurationMs":"(\d+)"/);
      const durationSeconds = durMatch ? Math.floor(parseInt(durMatch[1], 10) / 1000) : 0;

      // Extract description
      let description = "";
      const descMatch = html.match(/"shortDescription":"(.*?)"/);
      if (descMatch) {
        try {
          description = JSON.parse(`"${descMatch[1]}"`);
        } catch {
          description = descMatch[1].replace(/\\n/g, "\n");
        }
      }

      // Extract title
      let title = "";
      const titleMatch = html.match(/"title":"(.*?)"/) || html.match(/<title>(.*?) - YouTube<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].replace(/\\"/g, '"');
      }

      // Extract author / channel
      let channelTitle = "";
      const authorMatch = html.match(/"author":"(.*?)"/) || html.match(/"ownerChannelName":"(.*?)"/);
      if (authorMatch) {
        channelTitle = authorMatch[1];
      }

      // Fallback to oEmbed for clean title/author if needed
      if (!title || !channelTitle || !durationSeconds) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
          );
          if (oembedRes.ok) {
            const oed = await oembedRes.json();
            if (!title) title = oed.title;
            if (!channelTitle) channelTitle = oed.author_name;
          }
        } catch {}
      }

      const finalDuration = durationSeconds > 0 ? durationSeconds : 3600;
      const chapters = parseChaptersFromDescription(description, finalDuration);

      return {
        videoId,
        title: title || `YouTube Course: ${videoId}`,
        channelTitle: channelTitle || "Educational Creator",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        durationSeconds: finalDuration,
        description,
        chapters,
      };
    }
  } catch (err) {
    console.warn("Direct YouTube watch page scrape failed, falling back to oEmbed:", err);
  }

  // Fallback to free public oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch video metadata from oEmbed (status ${res.status})`);
    }
    const data = await res.json();
    return {
      videoId,
      title: data.title || `YouTube Course: ${videoId}`,
      channelTitle: data.author_name || "Educational Creator",
      thumbnailUrl:
        data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: 3600,
      description: `Course generated from "${data.title}" by ${data.author_name}`,
    };
  } catch {
    return {
      videoId,
      title: `Learning Session: ${videoId}`,
      channelTitle: "YouTube Creator",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: 3600,
      description: "Interactive course curriculum synthesized from YouTube video.",
    };
  }
}

export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    // Attempt standard timedtext fetch from YouTube page context
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!pageRes.ok) return null;
    const pageHtml = await pageRes.text();

    // Check for captions player response in page
    const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!playerResponseMatch) return null;

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }

    // Prefer English captions (en or en-US) or first track
    const selectedTrack =
      captionTracks.find((t: { languageCode: string }) =>
        t.languageCode.startsWith("en")
      ) || captionTracks[0];

    const timedTextRes = await fetch(selectedTrack.baseUrl);
    if (!timedTextRes.ok) return null;
    const xml = await timedTextRes.text();

    const segments: TranscriptSegment[] = [];
    const textRegex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
      const rawText = match[3]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();

      if (rawText) {
        segments.push({
          start: parseFloat(match[1]),
          duration: parseFloat(match[2]),
          text: rawText,
        });
      }
    }

    return segments.length > 0 ? segments : null;
  } catch (err) {
    console.warn(`Could not extract automatic transcript for video ${videoId}:`, err);
    return null;
  }
}

