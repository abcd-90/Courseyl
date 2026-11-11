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
    const videoMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);

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
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
  }
  return `${s}s`;
}

export function formatClockTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function parseClockToSeconds(timeStr: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n) || n < 0)) return -1;
  if (parts.length === 3) {
    if (parts[1] >= 60 || parts[2] >= 60) return -1;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    if (parts[1] >= 60) return -1;
    return parts[0] * 60 + parts[1];
  }
  return -1;
}

function cleanYouTubeText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\u0022/g, '"')
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function finalizeChapterRanges(
  rawList: { seconds: number; title: string }[],
  totalDuration: number
): VideoChapter[] {
  if (rawList.length === 0) return [];

  // Sort ascending and deduplicate identical timestamps (keeping richer title)
  const sorted = [...rawList].sort((a, b) => a.seconds - b.seconds);
  const deduped: { seconds: number; title: string }[] = [];
  for (const item of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.seconds === item.seconds) {
      if (item.title.length > prev.title.length) {
        prev.title = item.title;
      }
      continue;
    }
    deduped.push({ seconds: item.seconds, title: item.title });
  }

  const lastSeconds = deduped[deduped.length - 1].seconds;
  const effectiveDuration =
    totalDuration > 0
      ? totalDuration > lastSeconds
        ? totalDuration
        : lastSeconds + 60
      : lastSeconds + 300;

  const chapters: VideoChapter[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const cur = deduped[i];
    const next = deduped[i + 1];
    const end = next ? next.seconds : effectiveDuration;
    if (end <= cur.seconds) continue;
    chapters.push({
      title: cur.title,
      startSeconds: cur.seconds,
      endSeconds: end,
      durationSeconds: Math.max(10, end - cur.seconds),
    });
  }

  return chapters;
}

export function parseChaptersFromDescription(description: string, totalDuration: number): VideoChapter[] {
  if (!description) return [];

  const lines = description.split(/\r?\n/);
  const startRegex =
    /^(?:(?:\d{1,3}[.)]|[-*•▶⏩⏰⭐️🎯📌🔹👉]+)\s*)*(?:\[|\()?\s*(\d{1,3}:\d{2}(?::\d{2})?)\s*(?:\]|\))?\s*[-–—:|]*\s*(.+)$/;
  const endRegex =
    /^(.+?)\s*[-–—|:]+\s*(?:\[|\()?\s*(\d{1,3}:\d{2}(?::\d{2})?)\s*(?:\]|\))?\s*$/;

  const rawList: { seconds: number; title: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^https?:\/\//i.test(trimmed)) continue;

    let timeStr = "";
    let rawTitle = "";

    const startMatch = trimmed.match(startRegex);
    if (startMatch) {
      timeStr = startMatch[1];
      rawTitle = startMatch[2];
    } else {
      const endMatch = trimmed.match(endRegex);
      if (endMatch && !/https?:\/\//i.test(endMatch[1])) {
        rawTitle = endMatch[1];
        timeStr = endMatch[2];
      }
    }

    if (!timeStr || !rawTitle) continue;
    const seconds = parseClockToSeconds(timeStr);
    if (seconds < 0) continue;

    // Ignore false positives beyond video length if known
    if (totalDuration > 0 && seconds >= totalDuration) continue;

    const title = cleanYouTubeText(rawTitle).replace(/^[–—\-:|•\s]+/, "").trim();
    if (title.length >= 2) {
      rawList.push({ seconds, title });
    }
  }

  return finalizeChapterRanges(rawList, totalDuration);
}

function collectChaptersFromObject(
  node: unknown,
  rawList: { seconds: number; title: string }[]
): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectChaptersFromObject(item, rawList);
    return;
  }

  const record = node as Record<string, unknown>;

  if (record.chapterRenderer && typeof record.chapterRenderer === "object") {
    const cr = record.chapterRenderer as Record<string, unknown>;
    const titleObj = cr.title as Record<string, unknown> | undefined;
    const titleText =
      (titleObj?.simpleText as string) ||
      (Array.isArray(titleObj?.runs)
        ? (titleObj.runs as { text?: string }[]).map((r) => r.text || "").join("")
        : "");
    const startMs = Number(cr.timeRangeStartMillis);
    if (titleText && !isNaN(startMs) && startMs >= 0) {
      rawList.push({
        title: cleanYouTubeText(titleText),
        seconds: Math.floor(startMs / 1000),
      });
    }
  }

  if (record.macroMarkersListItemRenderer && typeof record.macroMarkersListItemRenderer === "object") {
    const mm = record.macroMarkersListItemRenderer as Record<string, unknown>;
    const titleObj = mm.title as Record<string, unknown> | undefined;
    const timeObj = mm.timeDescription as Record<string, unknown> | undefined;
    const titleText =
      (titleObj?.simpleText as string) ||
      (Array.isArray(titleObj?.runs)
        ? (titleObj.runs as { text?: string }[]).map((r) => r.text || "").join("")
        : "");
    const timeStr =
      (timeObj?.simpleText as string) ||
      (Array.isArray(timeObj?.runs)
        ? (timeObj.runs as { text?: string }[]).map((r) => r.text || "").join("")
        : "");
    const seconds = parseClockToSeconds(timeStr);
    if (titleText && seconds >= 0) {
      rawList.push({
        title: cleanYouTubeText(titleText),
        seconds,
      });
    }
  }

  for (const val of Object.values(record)) {
    if (val && typeof val === "object") {
      collectChaptersFromObject(val, rawList);
    }
  }
}

export function extractChaptersFromInitialData(htmlOrObject: string | unknown, totalDuration: number): VideoChapter[] {
  const rawList: { title: string; seconds: number }[] = [];
  try {
    if (typeof htmlOrObject !== "string") {
      collectChaptersFromObject(htmlOrObject, rawList);
    } else {
      const dataMatch = htmlOrObject.match(/(?:var\s+)?ytInitialData\s*=\s*(\{.+?\});(?:var\s|<\/script>)/);
      if (dataMatch) {
        try {
          const parsed = JSON.parse(dataMatch[1]);
          collectChaptersFromObject(parsed, rawList);
        } catch {
          // fall through to regex fallback
        }
      }

      if (rawList.length === 0) {
        const regex = /"chapterRenderer"\s*:\s*\{"title"\s*:\s*\{"simpleText"\s*:\s*"((?:[^"\\]|\\.)*)"\}[^}]*"timeRangeStartMillis"\s*:\s*(\d+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(htmlOrObject)) !== null) {
          const title = cleanYouTubeText(match[1]);
          const seconds = Math.floor(parseInt(match[2], 10) / 1000);
          if (title && !isNaN(seconds)) {
            rawList.push({ title, seconds });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to extract chapters from initial data:", err);
  }
  return finalizeChapterRanges(rawList, totalDuration);
}

interface InnertubePlayerInfo {
  durationSeconds: number;
  description: string;
  title: string;
  author: string;
  captionTracks?: { languageCode: string; baseUrl: string }[];
}

function findNestedProperty<T>(node: unknown, matchFn: (key: string, val: unknown) => boolean): T | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findNestedProperty<T>(item, matchFn);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (matchFn(k, v)) return v as T;
    if (v && typeof v === "object") {
      const found = findNestedProperty<T>(v, matchFn);
      if (found !== null) return found;
    }
  }
  return null;
}

async function fetchPlayerViaInnertube(
  videoId: string,
  innertubeApiKey?: string,
  visitorData?: string
): Promise<InnertubePlayerInfo | null> {
  if (!innertubeApiKey) return null;

  const clients = [
    {
      client: {
        clientName: "ANDROID",
        clientVersion: "20.10.38",
        osName: "Android",
        osVersion: "14",
        androidSdkVersion: 34,
      },
      ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
    },
    {
      client: {
        clientName: "IOS",
        clientVersion: "20.10.4",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iPhone",
        osVersion: "18.3.2.22D82",
      },
      ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X)",
    },
  ];

  for (const cfg of clients) {
    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(innertubeApiKey)}&prettyPrint=false`,
        {
          method: "POST",
          signal: AbortSignal.timeout(7000),
          headers: {
            "Content-Type": "application/json",
            "User-Agent": cfg.ua,
            ...(visitorData ? { "X-Goog-Visitor-Id": visitorData } : {}),
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                ...cfg.client,
                hl: "en",
                gl: "US",
                ...(visitorData ? { visitorData } : {}),
              },
            },
          }),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const vd = data?.videoDetails;
      const len = parseInt(vd?.lengthSeconds || "0", 10) || parseInt(data?.microformat?.playerMicroformatRenderer?.lengthSeconds || "0", 10) || 0;
      const desc = vd?.shortDescription || "";
      const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (len > 0 || desc) {
        return {
          durationSeconds: len,
          description: desc,
          title: vd?.title || "",
          author: vd?.author || "",
          captionTracks: Array.isArray(captionTracks) ? captionTracks : undefined,
        };
      }
    } catch (err) {
      console.warn(`Innertube player (${cfg.client.clientName}) fetch failed:`, err);
    }
  }

  return null;
}

async function fetchNextViaInnertube(videoId: string): Promise<{
  description: string;
  title: string;
  chapters: VideoChapter[];
}> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
      method: "POST",
      signal: AbortSignal.timeout(7000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20241101.01.00",
            hl: "en",
            gl: "US",
          },
        },
      }),
    });

    if (!res.ok) return { description: "", title: "", chapters: [] };
    const nextJson = await res.json();

    const attrDesc = findNestedProperty<{ content?: string }>(
      nextJson,
      (k, v) => k === "attributedDescription" && typeof (v as { content?: string })?.content === "string"
    );
    const primaryRenderer = findNestedProperty<{ title?: { runs?: { text?: string }[]; simpleText?: string } }>(
      nextJson,
      (k) => k === "videoPrimaryInfoRenderer"
    );

    const title =
      primaryRenderer?.title?.simpleText ||
      primaryRenderer?.title?.runs?.map((r) => r.text || "").join("") ||
      "";
    const description = attrDesc?.content || "";
    const chapters = extractChaptersFromInitialData(nextJson, 0);

    return { description, title, chapters };
  } catch (err) {
    console.warn("Innertube /next fetch failed:", err);
    return { description: "", title: "", chapters: [] };
  }
}

async function fetchDurationViaSearch(videoId: string): Promise<{
  durationSeconds: number;
  title: string;
  author: string;
}> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      signal: AbortSignal.timeout(7000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `"${videoId}"`,
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20241101.01.00",
            hl: "en",
            gl: "US",
          },
        },
      }),
    });

    if (!res.ok) return { durationSeconds: 0, title: "", author: "" };
    const searchJson = await res.json();
    const renderer = findNestedProperty<{
      videoId?: string;
      lengthText?: { simpleText?: string };
      title?: { runs?: { text?: string }[]; simpleText?: string };
      ownerText?: { runs?: { text?: string }[] };
    }>(
      searchJson,
      (k, v) => k === "videoRenderer" && (v as { videoId?: string })?.videoId === videoId
    );

    if (!renderer) return { durationSeconds: 0, title: "", author: "" };
    const durationSeconds = parseClockToSeconds(renderer.lengthText?.simpleText || "");
    const title =
      renderer.title?.simpleText ||
      renderer.title?.runs?.map((r) => r.text || "").join("") ||
      "";
    const author = renderer.ownerText?.runs?.map((r) => r.text || "").join("") || "";

    return {
      durationSeconds: durationSeconds > 0 ? durationSeconds : 0,
      title,
      author,
    };
  } catch (err) {
    console.warn("Innertube /search fallback failed:", err);
    return { durationSeconds: 0, title: "", author: "" };
  }
}

async function resolveBestThumbnail(videoId: string, oembedThumbnail?: string): Promise<string> {
  const maxResUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  try {
    const headRes = await fetch(maxResUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(2500),
    });
    if (headRes.ok) {
      return maxResUrl;
    }
  } catch {
    // Fallback cleanly if maxresdefault check times out or fails
  }
  return oembedThumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  let durationSeconds = 0;
  let description = "";
  let scrapedTitle = "";
  let scrapedAuthor = "";
  let chapters: VideoChapter[] = [];

  // 1. YouTube Data API v3 (if key is configured)
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (res.ok) {
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          const parsedDur = parseISO8601Duration(item.contentDetails.duration);
          if (parsedDur > 0) {
            const apiDesc = item.snippet.description || "";
            return {
              videoId,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              thumbnailUrl:
                item.snippet.thumbnails?.maxres?.url ||
                item.snippet.thumbnails?.high?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              durationSeconds: parsedDur,
              description: apiDesc,
              chapters: parseChaptersFromDescription(apiDesc, parsedDur),
            };
          }
        }
      }
    } catch (err) {
      console.warn("YouTube Data API fetch failed, falling back to direct ingestion:", err);
    }
  }

  // 2. Fetch official oEmbed metadata in parallel with Watch Page HTML
  let oembedTitle = "";
  let oembedAuthor = "";
  let oembedThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const oembedPromise = fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    { signal: AbortSignal.timeout(6000) }
  )
    .then(async (r) => (r.ok ? r.json() : null))
    .catch(() => null);

  let watchHtml = "";
  let innertubeApiKey = "";
  let visitorData = "";

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (pageRes.ok) {
      watchHtml = await pageRes.text();
      innertubeApiKey = watchHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || "";
      visitorData = watchHtml.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] || "";

      const playerMatch = watchHtml.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var\s|<\/script>)/);
      if (playerMatch) {
        try {
          const player = JSON.parse(playerMatch[1]);
          if (player.videoDetails) {
            durationSeconds = parseInt(player.videoDetails.lengthSeconds, 10) || 0;
            description = player.videoDetails.shortDescription || "";
            scrapedTitle = player.videoDetails.title || "";
            scrapedAuthor = player.videoDetails.author || "";
          }
          if (!durationSeconds && player.microformat?.playerMicroformatRenderer?.lengthSeconds) {
            durationSeconds = parseInt(player.microformat.playerMicroformatRenderer.lengthSeconds, 10) || 0;
          }
        } catch (e) {
          console.warn("ytInitialPlayerResponse parse error:", e);
        }
      }

      if (!durationSeconds) {
        const lenMatch = watchHtml.match(/"lengthSeconds":"(\d+)"/);
        const durMsMatch = watchHtml.match(/"approxDurationMs":"(\d+)"/);
        const metaDurMatch = watchHtml.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i);
        if (lenMatch) {
          durationSeconds = parseInt(lenMatch[1], 10);
        } else if (durMsMatch) {
          durationSeconds = Math.floor(parseInt(durMsMatch[1], 10) / 1000);
        } else if (metaDurMatch) {
          durationSeconds = parseISO8601Duration(metaDurMatch[1]);
        }
      }

      if (!description) {
        const dataMatch = watchHtml.match(/(?:var\s+)?ytInitialData\s*=\s*(\{.+?\});(?:var\s|<\/script>)/);
        if (dataMatch) {
          try {
            const initialData = JSON.parse(dataMatch[1]);
            const attrDesc = findNestedProperty<{ content?: string }>(
              initialData,
              (k, v) => k === "attributedDescription" && typeof (v as { content?: string })?.content === "string"
            );
            if (attrDesc?.content) {
              description = attrDesc.content;
            }
          } catch {
            // ignore
          }
        }
      }

      if (!description) {
        const descMatch = watchHtml.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
        if (descMatch) {
          try {
            description = JSON.parse(`"${descMatch[1]}"`);
          } catch {
            description = descMatch[1].replace(/\\n/g, "\n");
          }
        }
      }
    }
  } catch (err) {
    console.warn("Watch page direct fetch failed:", err);
  }

  // 3. Innertube ANDROID / IOS Player bypass (crucial when Watch Page returns LOGIN_REQUIRED bot wall)
  if (!durationSeconds || !description) {
    const playerInfo = await fetchPlayerViaInnertube(videoId, innertubeApiKey, visitorData);
    if (playerInfo) {
      if (!durationSeconds && playerInfo.durationSeconds > 0) {
        durationSeconds = playerInfo.durationSeconds;
      }
      if (playerInfo.description && playerInfo.description.length > description.length) {
        description = playerInfo.description;
      }
      if (!scrapedTitle && playerInfo.title) scrapedTitle = playerInfo.title;
      if (!scrapedAuthor && playerInfo.author) scrapedAuthor = playerInfo.author;
    }
  }

  // 4. Innertube /next & /search backups when description, chapters, or duration are still missing
  if (!description || chapters.length === 0) {
    const nextInfo = await fetchNextViaInnertube(videoId);
    if (nextInfo.description && nextInfo.description.length > description.length) {
      description = nextInfo.description;
    }
    if (!scrapedTitle && nextInfo.title) scrapedTitle = nextInfo.title;
    if (nextInfo.chapters.length > 0) {
      chapters = nextInfo.chapters;
    }
  }

  if (!durationSeconds) {
    const searchInfo = await fetchDurationViaSearch(videoId);
    if (searchInfo.durationSeconds > 0) {
      durationSeconds = searchInfo.durationSeconds;
    }
    if (!scrapedTitle && searchInfo.title) scrapedTitle = searchInfo.title;
    if (!scrapedAuthor && searchInfo.author) scrapedAuthor = searchInfo.author;
  }

  // 5. Reconcile description chapters vs ytInitialData chapters using resolved durationSeconds
  if (description) {
    const parsedDescChapters = parseChaptersFromDescription(description, durationSeconds);
    if (parsedDescChapters.length > chapters.length) {
      chapters = parsedDescChapters;
    }
  }
  if (chapters.length === 0 && watchHtml) {
    chapters = extractChaptersFromInitialData(watchHtml, durationSeconds);
  }
  if (chapters.length > 0 && durationSeconds > 0) {
    chapters = finalizeChapterRanges(
      chapters.map((c) => ({ seconds: c.startSeconds, title: c.title })),
      durationSeconds
    );
  }

  const oData = await oembedPromise;
  if (oData?.title) oembedTitle = oData.title;
  if (oData?.author_name) oembedAuthor = oData.author_name;
  if (oData?.thumbnail_url) oembedThumbnail = oData.thumbnail_url;

  const cleanTitle = cleanYouTubeText(oembedTitle || scrapedTitle || `YouTube Course: ${videoId}`);
  const finalAuthor = cleanYouTubeText(oembedAuthor || scrapedAuthor || "Educational Creator");

  if (chapters.length > 0) {
    const lastChapterEnd = chapters[chapters.length - 1].endSeconds;
    if (lastChapterEnd > durationSeconds) {
      durationSeconds = lastChapterEnd;
    }
  }

  const finalDuration = durationSeconds > 0 ? durationSeconds : 3600;
  const thumbnailUrl = await resolveBestThumbnail(videoId, oembedThumbnail);

  return {
    videoId,
    title: cleanTitle,
    channelTitle: finalAuthor,
    thumbnailUrl,
    durationSeconds: finalDuration,
    description: description || `Comprehensive course synthesized from "${cleanTitle}" by ${finalAuthor}.`,
    chapters,
  };
}

export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    let captionTracks: { languageCode: string; baseUrl: string }[] | undefined;

    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var\s|<\/script>)/);
      if (playerResponseMatch) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        } catch {
          // ignore
        }
      }

      if (!captionTracks || captionTracks.length === 0) {
        const apiKey = pageHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
        const visitorData = pageHtml.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
        const playerInfo = await fetchPlayerViaInnertube(videoId, apiKey, visitorData);
        captionTracks = playerInfo?.captionTracks;
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }

    const selectedTrack =
      captionTracks.find((t) => t.languageCode.startsWith("en")) || captionTracks[0];

    const timedTextRes = await fetch(selectedTrack.baseUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
      },
    });
    if (!timedTextRes.ok) return null;
    const xml = await timedTextRes.text();

    const segments: TranscriptSegment[] = [];
    const textRegex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
      const rawText = cleanYouTubeText(match[3]).replace(/\n/g, " ").trim();
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

