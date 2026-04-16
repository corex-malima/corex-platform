const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const history = (buckets.get(key) ?? []).filter((stamp) => stamp > windowStart);

  if (history.length >= limit) {
    buckets.set(key, history);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((history[0] + windowMs - now) / 1000)),
      remaining: 0,
    };
  }

  history.push(now);
  buckets.set(key, history);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, limit - history.length),
  };
}
