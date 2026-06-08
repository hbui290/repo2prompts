import assert from "node:assert/strict";
import test from "node:test";

import {
  checkDatabaseRateLimit,
  checkRateLimit,
  createRateLimiter,
  hashRateLimitKey,
} from "./rate-limit";

test("allows requests until the configured maximum is reached", () => {
  const limiter = createRateLimiter({
    maxRequests: 2,
    windowMs: 1_000,
    now: () => 100,
  });

  assert.equal(checkRateLimit(limiter, "client-a").limited, false);
  assert.equal(checkRateLimit(limiter, "client-a").limited, false);
  assert.equal(checkRateLimit(limiter, "client-a").limited, true);
});

test("resets the counter after the window expires", () => {
  let currentTime = 0;
  const limiter = createRateLimiter({
    maxRequests: 1,
    windowMs: 100,
    now: () => currentTime,
  });

  assert.equal(checkRateLimit(limiter, "client-a").limited, false);
  assert.equal(checkRateLimit(limiter, "client-a").limited, true);

  currentTime = 101;

  assert.equal(checkRateLimit(limiter, "client-a").limited, false);
});

test("tracks different clients independently", () => {
  const limiter = createRateLimiter({
    maxRequests: 1,
    windowMs: 1_000,
    now: () => 100,
  });

  assert.equal(checkRateLimit(limiter, "client-a").limited, false);
  assert.equal(checkRateLimit(limiter, "client-b").limited, false);
});

test("hashes database limiter keys instead of storing raw client identifiers", async () => {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const result = await checkDatabaseRateLimit({
    key: "192.0.2.44",
    route: "/api/briefs",
    maxRequests: 10,
    windowMs: 600_000,
    now: () => 1_700_000_000_000,
    databaseFetch: async (path, init) => {
      calls.push({ path, init });
      return new Response(path.includes("select=count") ? "[{\"count\":0}]" : "{}", {
        status: 200,
      });
    },
  });

  assert.equal(result.limited, false);
  assert.notEqual(hashRateLimitKey("192.0.2.44"), "192.0.2.44");
  assert.doesNotMatch(JSON.stringify(calls), /192\.0\.2\.44/u);
});

test("database limiter fallback open allows requests when storage fails", async () => {
  const result = await checkDatabaseRateLimit({
    key: "client-a",
    route: "/api/briefs",
    maxRequests: 1,
    windowMs: 600_000,
    now: () => 1_700_000_000_000,
    failureMode: "open",
    databaseFetch: async () => {
      throw new Error("database offline");
    },
  });

  assert.equal(result.limited, false);
  assert.equal(result.storageFailed, true);
});

test("database limiter treats failed writes as storage failure", async () => {
  const result = await checkDatabaseRateLimit({
    key: "client-a",
    route: "/api/briefs",
    maxRequests: 2,
    windowMs: 600_000,
    now: () => 1_700_000_000_000,
    failureMode: "closed",
    databaseFetch: async (path) =>
      path.startsWith("rate_limit_events?")
        ? new Response("[]", { status: 200 })
        : new Response("insert failed", { status: 500 }),
  });

  assert.equal(result.limited, true);
  assert.equal(result.remaining, 0);
  assert.equal(result.storageFailed, true);
});
