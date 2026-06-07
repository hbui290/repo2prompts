import assert from "node:assert/strict";
import test from "node:test";

import { checkRateLimit, createRateLimiter } from "./rate-limit";

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

