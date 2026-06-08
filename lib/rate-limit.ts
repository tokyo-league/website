export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const defaultStore = new Map<string, RateLimitEntry>();

export const adminRouteRateLimit: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 120,
};

export const loginRouteRateLimit: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,
};

export const authRouteRateLimit: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

export const securityRouteRateLimit: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 120,
};

export function createRateLimitStore() {
  return new Map<string, RateLimitEntry>();
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now(),
  store = defaultStore,
): RateLimitResult {
  cleanupExpiredEntries(store, now);

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + config.windowMs;
    store.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetAt: current.resetAt,
    retryAfterSeconds: 0,
  };
}

export function getRateLimitKey(scope: "admin" | "auth" | "login" | "security", ipAddress: string) {
  return `${scope}:${ipAddress || "unknown"}`;
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>, now: number) {
  if (store.size < 500) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}
