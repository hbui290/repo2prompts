type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimiter = {
  entries: Map<string, RateLimitEntry>;
  maxRequests: number;
  windowMs: number;
  now: () => number;
};

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  resetAt: number;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createRateLimiter(options?: {
  maxRequests?: number;
  windowMs?: number;
  now?: () => number;
}): RateLimiter {
  return {
    entries: new Map(),
    maxRequests: options?.maxRequests ?? positiveInteger(process.env.RATE_LIMIT_MAX, 10),
    windowMs: options?.windowMs ?? positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 600_000),
    now: options?.now ?? Date.now,
  };
}

export function checkRateLimit(
  limiter: RateLimiter,
  key: string,
): RateLimitResult {
  const now = limiter.now();
  const existing = limiter.entries.get(key);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + limiter.windowMs };

  entry.count += 1;
  limiter.entries.set(key, entry);

  return {
    limited: entry.count > limiter.maxRequests,
    remaining: Math.max(limiter.maxRequests - entry.count, 0),
    resetAt: entry.resetAt,
  };
}

export function requestKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

