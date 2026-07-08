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
