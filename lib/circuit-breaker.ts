/**
 * Circuit Breaker — Prevents cascading API failures in the AI pipeline.
 *
 * When an external API (NaraRouter, Cloudflare, Serper) experiences
 * consecutive failures, the circuit opens and subsequent calls are
 * rejected immediately — allowing fallback paths to activate without
 * wasting time on doomed retries.
 *
 * States:
 *   CLOSED    → Normal operation, calls pass through
 *   OPEN      → After N consecutive failures, calls rejected for cooldownMs
 *   HALF_OPEN → After cooldown, one probe call allowed; success → CLOSED, failure → OPEN
 *
 * Configuration per service:
 *   threshold  — consecutive failures before opening
 *   cooldownMs — time to stay OPEN before trying HALF_OPEN
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

export interface CircuitConfig {
  /** Consecutive failures before opening the circuit */
  threshold: number
  /** Milliseconds to stay open before transitioning to HALF_OPEN */
  cooldownMs: number
}

interface CircuitEntry {
  state: CircuitState
  failures: number
  lastFailureAt: number
  openedAt: number
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: CircuitConfig = {
  threshold: 3,
  cooldownMs: 30_000, // 30 seconds
}

const SERVICE_CONFIGS: Record<string, CircuitConfig> = {
  nararouter: { threshold: 3, cooldownMs: 30_000 },
  cloudflare: { threshold: 3, cooldownMs: 30_000 },
  serper: { threshold: 4, cooldownMs: 60_000 }, // Serper is more resilient
}

// ---------------------------------------------------------------------------
// State (in-memory — single Next.js instance)
// ---------------------------------------------------------------------------

const circuits = new Map<string, CircuitEntry>()

function getEntry(service: string): CircuitEntry {
  let entry = circuits.get(service)
  if (!entry) {
    entry = { state: "CLOSED", failures: 0, lastFailureAt: 0, openedAt: 0 }
    circuits.set(service, entry)
  }
  return entry
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a circuit is open for the given service.
 * If open, returns `true` — caller should skip the external call.
 * If HALF_OPEN, the first caller gets to probe; subsequent callers are blocked.
 */
export function isCircuitOpen(service: string): boolean {
  const entry = getEntry(service)
  const config = SERVICE_CONFIGS[service] ?? DEFAULT_CONFIG

  if (entry.state === "CLOSED") return false

  if (entry.state === "OPEN") {
    const elapsed = Date.now() - entry.openedAt
    if (elapsed >= config.cooldownMs) {
      entry.state = "HALF_OPEN"
      return false // Allow the probe
    }
    return true
  }

  // HALF_OPEN: only the first probe passes
  if (entry.state === "HALF_OPEN") {
    return false // Allow probe attempts in half-open
  }

  return false
}

/**
 * Record a successful call to the service.
 * Resets the circuit to CLOSED.
 */
export function recordSuccess(service: string): void {
  const entry = getEntry(service)
  entry.state = "CLOSED"
  entry.failures = 0
  entry.lastFailureAt = 0
  entry.openedAt = 0
}

/**
 * Record a failed call to the service.
 * Increments failure count and opens circuit if threshold reached.
 */
export function recordFailure(service: string): void {
  const entry = getEntry(service)
  const config = SERVICE_CONFIGS[service] ?? DEFAULT_CONFIG

  entry.failures++
  entry.lastFailureAt = Date.now()

  if (entry.failures >= config.threshold) {
    entry.state = "OPEN"
    entry.openedAt = Date.now()
    console.error(`[CircuitBreaker] ${service} circuit OPEN after ${entry.failures} consecutive failures — blocked for ${config.cooldownMs / 1000}s`)
  }
}

/**
 * Get the current state of all circuits (for health checks).
 */
export function getCircuitStates(): Record<string, { state: CircuitState; failures: number }> {
  const states: Record<string, { state: CircuitState; failures: number }> = {}
  for (const [service, entry] of circuits) {
    states[service] = { state: entry.state, failures: entry.failures }
  }
  return states
}

/**
 * Reset all circuits to CLOSED (for testing or manual recovery).
 */
export function resetAllCircuits(): void {
  circuits.clear()
}
