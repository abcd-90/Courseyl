import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Good bots allowed for SEO, social link previews, and AI/LLM search assistants (on public pages only)
const ALLOWED_BOT_RE =
  /(googlebot|bingbot|duckduckbot|applebot|twitterbot|linkedinbot|whatsapp|discordbot|slackbot|facebookexternalhit|telegrambot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|perplexitybot|google-extended)/i;

// Known scrapers, site cloners, headless automation, and CLI fetchers
const BLOCKED_SCRAPER_RE =
  /(httrack|webcopier|teleport|sitesucker|offline\s*explorer|wget|curl\/|httpie|python-requests|python-urllib|aiohttp|httpx|scrapy|beautifulsoup|go-http-client|libwww-perl|mechanize|phantomjs|headlesschrome|playwright|puppeteer|selenium|colly|apify|firecrawl|bytespider|ccbot|semrushbot|ahrefsbot|mj12bot|dotbot|dataforseobot|petalbot)/i;

// Sensitive files & source-map probes that should never be served
const SENSITIVE_PATH_RE =
  /(\.map$|\.env|\.git|dev\.db|prisma\/|package(-lock)?\.json|tsconfig\.json|\.sql$|\.bak$|\.php$)/i;

// In-memory sliding window rate limiter (per IP)
const RATE_WINDOW_MS = 60_000;
const MAX_API_REQ_PER_MIN = 80;
const MAX_PAGE_REQ_PER_MIN = 150;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  // Periodic map pruning to prevent unbounded memory growth
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits.entries()) {
      if (v.resetAt <= now) ipHits.delete(k);
    }
  }

  const entry = ipHits.get(key);
  if (!entry || entry.resetAt <= now) {
    ipHits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Block source maps, .env, DB, and config probes immediately
  if (SENSITIVE_PATH_RE.test(pathname)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Always allow robots.txt, sitemap.xml, llms.txt, and Next.js internal/RSC prefetch
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/llms.txt"
  ) {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") || "";
  const host = request.headers.get("host") || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  const isApi = pathname.startsWith("/api/");

  // Allow SEO, social preview & AI/LLM assistants on public pages only (never /api/* or /admin)
  if (ALLOWED_BOT_RE.test(ua)) {
    if (isApi || pathname.startsWith("/admin")) {
      return new NextResponse("Access Denied", { status: 403 });
    }
    return NextResponse.next();
  }

  // 2. Block empty User-Agent (unless internal localhost) or known scraping tools
  if ((!ua.trim() && !isLocal) || BLOCKED_SCRAPER_RE.test(ua)) {
    return new NextResponse("Access Denied", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // 3. Require standard Accept header on non-API page navigations from external clients
  const accept = request.headers.get("accept") || "";
  if (!isApi && !isLocal && !accept) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // 4. Per-IP Rate Limiting to stop bulk crawlers & automated API dumpers
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!isLocal && ip !== "unknown") {
    const bucketKey = `${ip}:${isApi ? "api" : "page"}`;
    const limit = isApi ? MAX_API_REQ_PER_MIN : MAX_PAGE_REQ_PER_MIN;
    if (isRateLimited(bucketKey, limit)) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
          "Content-Type": "text/plain",
        },
      });
    }
  }

  const response = NextResponse.next();
  // Prevent caching of sensitive API responses by shared proxies/scrapers
  if (isApi) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets & images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)$).*)",
  ],
};
