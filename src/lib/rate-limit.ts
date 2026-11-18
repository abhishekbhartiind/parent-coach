/**
 * Sliding-window rate limiter (in-memory).
 *
 * Scope note: state is per server instance. That is the right trade-off for a
 * no-database app; behind multiple instances, swap this class for a shared
 * store implementation of the same `check` contract.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      const retryAfterMs = recent[0] + this.windowMs - now;
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.evictIfNeeded(windowStart);
    return { allowed: true, remaining: this.maxRequests - recent.length, retryAfterSeconds: 0 };
  }

  /** Bound memory: drop expired keys first, then the oldest keys. */
  private evictIfNeeded(windowStart: number): void {
    if (this.hits.size <= this.maxKeys) return;
    for (const [key, times] of this.hits) {
      if (times[times.length - 1] <= windowStart) this.hits.delete(key);
    }
    while (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest === undefined) break;
      this.hits.delete(oldest);
    }
  }
}
