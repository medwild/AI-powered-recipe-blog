/**
 * Ideogram v4 Turbo — image generation client.
 *
 * Best-in-class food photography: accurate text rendering, natural lighting,
 * 2:3 aspect ratio support (Pinterest standard).
 */

const BASE_URL = "https://api.ideogram.ai/v1/ideogram-v4/generate"
const API_KEY = process.env.IDEOGRAM_API_KEY

function isConfigured(): boolean {
  return !!API_KEY
}

export async function runImage(prompt: string): Promise<Buffer> {
  if (!isConfigured()) {
    throw new Error("IDEOGRAM_API_KEY must be set for image generation.")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

  try {
    const formData = new FormData()
    formData.append("text_prompt", prompt)
    formData.append("aspect_ratio", "2x3")
    formData.append("rendering_speed", "TURBO")
    formData.append("style_type", "AUTO")

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Api-Key": API_KEY!,
      },
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ideogram image generation failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // Ideogram returns { data: [{ url: "..." }] }
    const imageUrl = data?.data?.[0]?.url
    if (imageUrl && typeof imageUrl === "string") {
      // Download the image buffer
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) {
        throw new Error(`Failed to download image from Ideogram CDN (${imgRes.status})`)
      }

      const arrayBuffer = await imgRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      console.log(`[provider] Ideogram V4 — success (${buffer.length} bytes)`)
      return buffer
    }

    // Fallback: try { url: "..." } (flat response)
    const flatUrl = data?.url
    if (flatUrl && typeof flatUrl === "string") {
      const imgRes = await fetch(flatUrl)
      if (!imgRes.ok) {
        throw new Error(`Failed to download image from Ideogram CDN (${imgRes.status})`)
      }

      const arrayBuffer = await imgRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      console.log(`[provider] Ideogram V4 — success (${buffer.length} bytes)`)
      return buffer
    }

    throw new Error(`Ideogram returned no image URL in response: ${JSON.stringify(data).substring(0, 300)}`)
  } catch (err) {
    const normalized = err instanceof Error ? err : new Error(String(err))
    const msg = normalized.message
    // Retryable errors (Inngest will retry)
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
    // Non-retryable — wrap and throw
    throw new Error(msg, { cause: err })
  } finally {
    clearTimeout(timer)
  }
}
