// Centralized utility for ensuring course thumbnails never render broken/placeholder images

const KNOWN_BROKEN_IDS = new Set([
  "urbkF3zPpxw",
  "y_b3tJ9_1e8",
  "bK_xK3pLq18",
  "5eP_l_w3kio",
]);

export function getCleanThumbnailUrl(
  rawThumbnail?: string | null,
  slug?: string | null,
  youtubeId?: string | null
): string {
  // 1. Check if rawThumbnail is provided and valid
  if (rawThumbnail && typeof rawThumbnail === "string" && rawThumbnail.trim().length > 10) {
    const isBroken = Array.from(KNOWN_BROKEN_IDS).some((badId) => rawThumbnail.includes(badId));
    if (!isBroken) {
      return rawThumbnail.trim();
    }
  }

  // 2. Check if valid youtubeId is available
  if (youtubeId && typeof youtubeId === "string" && !KNOWN_BROKEN_IDS.has(youtubeId.trim())) {
    return `https://i.ytimg.com/vi/${youtubeId.trim()}/hqdefault.jpg`;
  }

  // 3. Smart slug mapping fallback for all system courses
  const s = (slug || "").toLowerCase();
  if (s.includes("python-tutorial") || s.includes("hindi") || s.includes("codewithharry")) {
    return "https://i.ytimg.com/vi/UrsmFxEIp5k/hqdefault.jpg";
  }
  if (s.includes("agentic") || s.includes("krish") || s.includes("langchain")) {
    return "https://i.ytimg.com/vi/eynUbHweaQM/hqdefault.jpg";
  }
  if (s.includes("full-stack") || s.includes("fastapi") || s.includes("engineering")) {
    return "https://i.ytimg.com/vi/i_LwzRVP7bg/hqdefault.jpg";
  }
  if (s.includes("backend") || s.includes("redis") || s.includes("docker")) {
    return "https://i.ytimg.com/vi/Oe421EPjeBE/hqdefault.jpg";
  }
  if (s.includes("excel")) {
    return "https://i.ytimg.com/vi/Vl0H-qTclOg/hqdefault.jpg";
  }
  if (s.includes("python-for-ai") || s.includes("ebbelaar")) {
    return "https://i.ytimg.com/vi/ygXn5nV5qFc/maxresdefault.jpg";
  }
  if (s.includes("cs50") || s.includes("harvard")) {
    return "https://i.ytimg.com/vi/nLRL_NcnK-4/hqdefault.jpg";
  }
  if (s.includes("hacking") || s.includes("cyber")) {
    return "https://i.ytimg.com/vi/3Kq1MIfTWCE/hqdefault.jpg";
  }
  if (s.includes("system-design")) {
    return "https://i.ytimg.com/vi/m8Icp_Cid5o/hqdefault.jpg";
  }
  if (s.includes("generative") || s.includes("sagar")) {
    return "https://i.ytimg.com/vi/3iFMc6ELt7k/hqdefault.jpg";
  }
  if (s.includes("best-python") || s.includes("mayank")) {
    return "https://i.ytimg.com/vi/J9BI0jGOds8/hqdefault.jpg";
  }

  return "https://i.ytimg.com/vi/3iFMc6ELt7k/hqdefault.jpg";
}
