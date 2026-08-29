const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

export function checkRateLimit(key: string, limit = 5): { success: boolean; remaining: number } {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(key) || 0;

  if (now - lastRequest < RATE_LIMIT_WINDOW_MS / limit) {
    return { success: false, remaining: 0 };
  }

  rateLimitMap.set(key, now);
  return { success: true, remaining: limit - 1 };
}
