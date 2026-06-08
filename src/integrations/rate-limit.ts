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
  storageFailed?: boolean;
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

async function configuredDatabaseFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = process.env.DATABASE_REST_URL?.trim().replace(/\/+$/u, "");
  const key = process.env.DATABASE_SERVICE_KEY?.trim();
  if (!url || !key) throw new Error("Database rate limiter is not configured.");
  return fetch(`${url}/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

export async function checkConfiguredRateLimit(
  limiter: RateLimiter,
  request: Request,
  route: string,
): Promise<RateLimitResult> {
  const key = requestKey(request);
  if (process.env.RATE_LIMIT_BACKEND !== "database") {
    return checkRateLimit(limiter, key);
  }
  return checkDatabaseRateLimit({
    key,
    route,
    maxRequests: limiter.maxRequests,
    windowMs: limiter.windowMs,
    failureMode: process.env.RATE_LIMIT_DB_FAILURE_MODE === "closed" ? "closed" : "open",
    databaseFetch: configuredDatabaseFetch,
  });
}

export function hashRateLimitKey(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (Math.imul(31, hash) + key.charCodeAt(index)) | 0;
  }
  return `rl_${Math.abs(hash).toString(16)}`;
}

export type DatabaseRateLimitOptions = {
  key: string;
  route: string;
  maxRequests: number;
  windowMs: number;
  now?: () => number;
  failureMode?: "open" | "closed";
  databaseFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

function countFromRows(rows: unknown): number {
  if (!Array.isArray(rows)) return 0;
  const first = rows[0] as { count?: unknown } | undefined;
  return typeof first?.count === "number"
    ? first.count
    : typeof first?.count === "string"
      ? Number.parseInt(first.count, 10)
      : rows.length;
}

export async function checkDatabaseRateLimit(
  options: DatabaseRateLimitOptions,
): Promise<RateLimitResult> {
  const now = options.now?.() ?? Date.now();
  const keyHash = hashRateLimitKey(options.key);
  const since = new Date(now - options.windowMs).toISOString();
  const resetAt = now + options.windowMs;

  try {
    const countQuery = new URLSearchParams({
      select: "id",
      route: `eq.${options.route}`,
      key_hash: `eq.${keyHash}`,
      created_at: `gte.${since}`,
      limit: String(options.maxRequests),
    });
    const countResponse = await options.databaseFetch(`rate_limit_events?${countQuery}`);
    if (!countResponse.ok) throw new Error("rate limit count failed");

    const count = countFromRows(await countResponse.json());
    if (count >= options.maxRequests) {
      return { limited: true, remaining: 0, resetAt };
    }

    const insertResponse = await options.databaseFetch("rate_limit_events", {
      method: "POST",
      body: JSON.stringify({
        key_hash: keyHash,
        route: options.route,
        created_at: new Date(now).toISOString(),
      }),
    });
    if (!insertResponse.ok) throw new Error("rate limit insert failed");

    return {
      limited: false,
      remaining: Math.max(options.maxRequests - count - 1, 0),
      resetAt,
    };
  } catch {
    const closed = options.failureMode === "closed";
    return {
      limited: closed,
      remaining: closed ? 0 : options.maxRequests,
      resetAt,
      storageFailed: true,
    };
  }
}
