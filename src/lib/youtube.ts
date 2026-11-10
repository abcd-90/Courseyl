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
  const regex = /(?:\[|\()?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\]|\))?\s*[-–—:]?\s*(.+)/;
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

  const effectiveDuration =
    totalDuration > 0
      ? totalDuration
      : rawList[rawList.length - 1].seconds + 300;

  const chapters: VideoChapter[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const cur = rawList[i];
    const next = rawList[i + 1];
    const end = next ? next.seconds : effectiveDuration;
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

export function extractChaptersFromInitialData(html: string, totalDuration: number): VideoChapter[] {
  const chapters: VideoChapter[] = [];
  try {
    const regex = /"chapterRenderer"\s*:\s*\{"title"\s*:\s*\{"simpleText"\s*:\s*"([^"]+)"\}[^}]*"timeRangeStartMillis"\s*:\s*(\d+)/g;
    let match: RegExpExecArray | null;
    const rawList: { title: string; seconds: number }[] = [];
    while ((match = regex.exec(html)) !== null) {
      const title = match[1];
      const seconds = Math.floor(parseInt(match[2], 10) / 1000);
      rawList.push({ title, seconds });
    }

    if (rawList.length > 0) {
      rawList.sort((a, b) => a.seconds - b.seconds);
      const effectiveDuration =
        totalDuration > 0
          ? totalDuration
          : rawList[rawList.length - 1].seconds + 300;

      for (let i = 0; i < rawList.length; i++) {
        const cur = rawList[i];
        const next = rawList[i + 1];
        const end = next ? next.seconds : effectiveDuration;
        chapters.push({
          title: cur.title,
          startSeconds: cur.seconds,
          endSeconds: end,
          durationSeconds: Math.max(10, end - cur.seconds),
        });
      }
    }
  } catch (err) {
    console.warn("Failed to extract chapterRenderer from ytInitialData:", err);
  }
  return chapters;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  // 1. YouTube Data API v3 (if key is configured)
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
              `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            durationSeconds,
            description,
            chapters,
          };
        }
      }
    } catch (err) {
      console.warn("YouTube Data API fetch failed, falling back to direct ingestion:", err);
    }
  }

  // 2. Fetch clean official oEmbed metadata first (Guaranteed reliable title, creator, thumbnail)
  let oembedTitle = "";
  let oembedAuthor = "";
  let oembedThumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oRes = await fetch(oembedUrl);
    if (oRes.ok) {
      const oData = await oRes.json();
      if (oData.title) oembedTitle = oData.title;
      if (oData.author_name) oembedAuthor = oData.author_name;
      if (oData.thumbnail_url) oembedThumbnail = oData.thumbnail_url;
    }
  } catch (err) {
    console.warn("oEmbed fetch warning:", err);
  }

  // 3. Live Watch Page Ingestion (Extract exact lengthSeconds, shortDescription, and chapters)
  let durationSeconds = 0;
  let description = "";
  let scrapedTitle = "";
  let scrapedAuthor = "";
  let chapters: VideoChapter[] = [];

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract ytInitialPlayerResponse accurately
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/);
      if (playerMatch) {
        try {
          const player = JSON.parse(playerMatch[1]);
          if (player.videoDetails) {
            durationSeconds = parseInt(player.videoDetails.lengthSeconds, 10) || 0;
            description = player.videoDetails.shortDescription || "";
            scrapedTitle = player.videoDetails.title || "";
            scrapedAuthor = player.videoDetails.author || "";
          }
        } catch (e) {
          console.warn("ytInitialPlayerResponse parse error:", e);
        }
      }

      // Fallback for duration in seconds
      if (!durationSeconds) {
        const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (lenMatch) {
          durationSeconds = parseInt(lenMatch[1], 10);
        } else {
          const durMsMatch = html.match(/"approxDurationMs":"(\d+)"/);
          if (durMsMatch) {
            durationSeconds = Math.floor(parseInt(durMsMatch[1], 10) / 1000);
          }
        }
      }

      // Fallback for description
      if (!description) {
        const descMatch = html.match(/"shortDescription":"(.*?)"/);
        if (descMatch) {
          try {
            description = JSON.parse(`"${descMatch[1]}"`);
          } catch {
            description = descMatch[1].replace(/\\n/g, "\n");
          }
        }
      }

      // Parse chapters from description
      if (description) {
        chapters = parseChaptersFromDescription(description, durationSeconds);
      }

      // If no chapters in description, attempt ytInitialData extraction
      if (chapters.length === 0) {
        chapters = extractChaptersFromInitialData(html, durationSeconds);
      }
    }
  } catch (err) {
    console.warn("Watch page direct fetch failed:", err);
  }

  // 4. Resolve clean final metadata
  let rawTitle = oembedTitle || scrapedTitle || `YouTube Course: ${videoId}`;
  // Clean HTML escape sequences
  const cleanTitle = rawTitle
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  const finalAuthor = oembedAuthor || scrapedAuthor || "Educational Creator";

  // If chapters extend beyond durationSeconds, adjust durationSeconds
  if (chapters.length > 0) {
    const lastChapterEnd = chapters[chapters.length - 1].endSeconds;
    if (lastChapterEnd > durationSeconds) {
      durationSeconds = lastChapterEnd;
    }
  }

  const finalDuration = durationSeconds > 0 ? durationSeconds : 3600;

  return {
    videoId,
    title: cleanTitle,
    channelTitle: finalAuthor,
    thumbnailUrl: oembedThumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    durationSeconds: finalDuration,
    description: description || `Comprehensive course synthesized from "${cleanTitle}" by ${finalAuthor}.`,
    chapters,
  };
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

