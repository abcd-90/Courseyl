export type WatchRange = [number, number];

export function parseWatchRanges(raw: string | null | undefined): WatchRange[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (pair): pair is WatchRange =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          typeof pair[0] === "number" &&
          typeof pair[1] === "number" &&
          Number.isFinite(pair[0]) &&
          Number.isFinite(pair[1])
      )
      .map(([a, b]) => {
        const start = Math.max(0, Math.floor(Math.min(a, b)));
        const end = Math.max(start, Math.floor(Math.max(a, b)));
        return [start, end] as WatchRange;
      });
  } catch {
    return [];
  }
}

export function mergeWatchRanges(
  existingRaw: string | null | undefined,
  incomingSeconds: number[] | number,
  maxLessonSeconds: number,
  fallbackLastSecond = 0
): {
  ranges: WatchRange[];
  rangesJson: string;
  totalWatchedSeconds: number;
  lastSecond: number;
} {
  const cap = Math.max(1, Math.floor(maxLessonSeconds));
  const combined: WatchRange[] = [...parseWatchRanges(existingRaw)];
  let maxObserved = Math.max(0, Math.min(cap, Math.floor(fallbackLastSecond)));

  if (Array.isArray(incomingSeconds)) {
    const cleaned = Array.from(
      new Set(
        incomingSeconds
          .map((s) => Math.floor(Number(s)))
          .filter((s) => Number.isFinite(s) && s >= 0 && s <= cap)
      )
    ).sort((a, b) => a - b);

    if (cleaned.length > 0) {
      maxObserved = Math.max(maxObserved, cleaned[cleaned.length - 1]);
      let runStart = cleaned[0];
      let runEnd = cleaned[0];
      for (let i = 1; i < cleaned.length; i++) {
        if (cleaned[i] <= runEnd + 1) {
          runEnd = cleaned[i];
        } else {
          combined.push([runStart, runEnd]);
          runStart = cleaned[i];
          runEnd = cleaned[i];
        }
      }
      combined.push([runStart, runEnd]);
    }
  } else if (typeof incomingSeconds === "number" && Number.isFinite(incomingSeconds) && incomingSeconds > 0) {
    const endSec = maxObserved > 0 ? maxObserved : Math.min(cap, Math.floor(incomingSeconds));
    const startSec = Math.max(0, endSec - Math.floor(incomingSeconds) + 1);
    combined.push([startSec, endSec]);
  }

  combined.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: WatchRange[] = [];
  for (const range of combined) {
    if (merged.length === 0) {
      merged.push([range[0], range[1]]);
    } else {
      const last = merged[merged.length - 1];
      if (range[0] <= last[1] + 1) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        merged.push([range[0], range[1]]);
      }
    }
  }

  const totalWatchedSeconds = Math.min(
    cap,
    merged.reduce((sum, [start, end]) => sum + (end - start + 1), 0)
  );

  return {
    ranges: merged,
    rangesJson: JSON.stringify(merged),
    totalWatchedSeconds,
    lastSecond: maxObserved,
  };
}

