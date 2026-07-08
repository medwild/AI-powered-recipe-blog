/**
 * Ideogram v4 Turbo — image generation client.
 *
 * Best-in-class food photography: accurate text rendering, natural lighting,
 * 2:3 aspect ratio support (Pinterest standard).
 *
 * Falls back to Cloudflare Workers AI (FLUX-1-Schnell) if IDEOGRAM_API_KEY
 * is not set or if Ideogram returns a non-retryable error.
 */

import { runImage as cfRunImage } from "./cloudflare"

const BASE_URL = "https://api.ideogram.ai/v1"
const MODEL = process.env.IDEOGRAM_MODEL || "V_4_TURBO"
const API_KEY = process.env.IDEOGRAM_API_KEY

function isConfigured(): boolean {
  return !!API_KEY
}

export async function runImage(prompt: string): Promise<Buffer> {
  // Fallback to Cloudflare if Ideogram not configured
  if (!isConfigured()) {
    console.log("[provider] Ideogram not configured — falling back to Cloudflare FLUX")
    return cfRunImage(prompt)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

  try {
    const res = await fetch(`${BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Api-Key": API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model: MODEL,
        aspect_ratio: "2:3",
        resolution: "RESOLUTION_1024_1536", // 1024x1536 — Pinterest 2:3
        magic_prompt_option: "AUTO",
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      // Non-retryable errors (4xx except 429) → fallback to Cloudflare
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.warn(`[Ideogram] Non-retryable error (${res.status}): ${text} — falling back to Cloudflare`)
        return cfRunImage(prompt)
      }
      throw new Error(`Ideogram image generation failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // Ideogram returns { data: [{ url: "..." }] }
    const imageUrl = data?.data?.[0]?.url
    if (!imageUrl || typeof imageUrl !== "string") {
      console.warn("[Ideogram] No image URL in response — falling back to Cloudflare")
      return cfRunImage(prompt)
    }

    // Download the image buffer
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      throw new Error(`Failed to download image from Ideogram CDN (${imgRes.status})`)
    }

    const arrayBuffer = await imgRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`[provider] Ideogram ${MODEL} — success (${buffer.length} bytes)`)
    return buffer
  } catch (err) {
    const msg = (err as Error).message
    // Retryable errors → throw (Inngest will retry)
    if (
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("aborted") ||
      msg.includes("timeout")
    ) {
      throw err
    }
    // Non-retryable → fallback to Cloudflare
    console.warn(`[Ideogram] Falling back to Cloudflare after: ${msg}`)
    return cfRunImage(prompt)
  } finally {
    clearTimeout(timer)
  }
}
