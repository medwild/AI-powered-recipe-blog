/**
 * Convert a human-readable duration string ("15 min", "1h 30 min")
 * to ISO 8601 duration format ("PT15M", "PT1H30M").
 */
export function toIsoDuration(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const hours = text.match(/(\d+)\s*h/)?.[1]
  const minutes = text.match(/(\d+)\s*min/)?.[1]
  if (!hours && !minutes) return undefined
  const h = hours ? parseInt(hours) : 0
  const m = minutes ? parseInt(minutes) : 0
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}`
}

/**
 * Convert ISO 8601 duration ("PT15M", "PT1H30M") to human-readable ("15 min", "1h 30 min").
 * Returns the original string if it doesn't match ISO format (defense-in-depth).
 */
export function fromIsoDuration(iso: string | null | undefined): string | null {
  if (!iso) return null
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)
  if (!match) return iso // not ISO — return as-is (already human-readable or malformed)
  const hours = match[1] ? parseInt(match[1]) : 0
  const minutes = match[2] ? parseInt(match[2]) : 0
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes} min`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes} min`
  return iso
}

/**
 * Parse ISO 8601 duration to total minutes. Returns null if unparseable.
 * Used for comparison logic (e.g., badge thresholds).
 */
export function parseDurationMinutes(iso: string | null | undefined): number | null {
  if (!iso) return null
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)
  if (!match) return null
  const hours = match[1] ? parseInt(match[1]) : 0
  const minutes = match[2] ? parseInt(match[2]) : 0
  return hours * 60 + minutes
}
