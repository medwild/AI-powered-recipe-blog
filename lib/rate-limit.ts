// lib/rate-limit.ts
// Rate limiter in-memory — reset au redémarrage du serveur
// Suffisant pour un projet solo en production Vercel (1 instance)

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup: remove expired entries to prevent memory leak.
// Runs every 5 minutes. In serverless (Vercel), the process is short-lived,
// but this prevents unbounded growth in long-running dev/staging instances.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60_000)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

export function checkRateLimit(
  key: string,
  options: { maxRequests?: number; windowMs?: number } = {},
): RateLimitResult {
  const { maxRequests = 3, windowMs = 60_000 } = options
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
  }
}
