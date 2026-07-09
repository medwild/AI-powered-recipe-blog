// Cloudflare Workers AI client.
// - runText: chat/instruct models for content generation (returns string)
// - runImage: text-to-image models (returns a PNG Buffer)

import { isCircuitOpen, recordSuccess, recordFailure } from "@/lib/circuit-breaker"

// Cloudflare Workers AI models
// - Primary: Gemma 4 26B A4B (Google, 256k context, Intelligence 26/30).
//   ~290 neurones/recipe — fits comfortably in the 10K free daily quota.
//   Override via CLOUDFLARE_TEXT_MODEL.
// - Fallback: GPT-OSS 120B (higher quality, may hit Cloudflare 408 on long generations).
// - Image: FLUX-1-Schnell — superior image quality to SDXL
const TEXT_MODEL =
  process.env.CLOUDFLARE_TEXT_MODEL ?? "@cf/google/gemma-4-26b-a4b-it"
export const TEXT_MODEL_FALLBACK = "@cf/openai/gpt-oss-120b"
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell"

function cfConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set to use Cloudflare Workers AI.",
    )
  }
  return { accountId, apiToken }
}

// Timeout commun pour la génération de texte (300s = 5 min)
// Le modèle 120B a besoin de temps pour les articles complexes (Writer, Editor).
// Le fallback automatique bénéficie aussi de cette durée.
const TEXT_TIMEOUT_MS = 300_000

export async function runText(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string; maxTokens?: number; timeout?: number },
): Promise<string> {
  // Circuit breaker — skip call if Cloudflare is in failure state
  if (isCircuitOpen("cloudflare")) {
    throw new Error("Cloudflare circuit OPEN — skipping call, use fallback")
  }

  const { accountId, apiToken } = cfConfig()
  const model = options?.model ?? TEXT_MODEL
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`

  const timeoutMs = options?.timeout ?? TEXT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: options?.maxTokens ?? 3072,
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      recordFailure("cloudflare")
      throw new Error(`Cloudflare text run failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // New OpenAI-compatible format (choices[0].message.content)
    // Fallback: legacy format (result.response) or reasoning_content
    const out =
      data?.result?.choices?.[0]?.message?.content ??
      data?.result?.choices?.[0]?.message?.reasoning_content ??
      data?.result?.response

    if (typeof out !== "string" || out.trim().length === 0) {
      recordFailure("cloudflare")
      throw new Error(
        "Cloudflare text run returned no response. " +
          `Result keys: ${Object.keys(data?.result ?? {}).join(", ")}`,
      )
    }
    // Structured log: provider + model used — grep-friendly for production monitoring
    console.log(`[provider] Cloudflare ${model} — success`)
    recordSuccess("cloudflare")
    return out
  } catch (err) {
    const msg = (err as Error).message
    if (!msg.includes("circuit OPEN")) {
      recordFailure("cloudflare")
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Calls runText() and extracts structured JSON from the response.
 *
 * Resilience strategy:
 * 1. Try primary (fast) model
 * 2. On recoverable failure, retry primary model once (handles intermittent issues)
 * 3. On second failure, fall back to 120B model (higher quality, slower)
 * 4. Network/auth errors skip retries and throw immediately
 */
export async function runTextAndParseJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; model?: string },
): Promise<T> {
  // Helpers
  // NOTE: keep in sync with helpers.ts isRecoverableError() and nararouter.ts isRecoverable()
  const isRecoverable = (msg: string): boolean =>
    msg.includes("No JSON object") ||
    msg.includes("Failed to parse JSON") ||
    msg.includes("aborted") ||
    msg.includes("returned no response") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("403") ||
    msg.includes("408") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")

  // ---- Attempt 1: primary model ----
  try {
    const raw = await runText(systemPrompt, userPrompt, options)
    return extractJson<T>(raw)
  } catch (err1) {
    const msg1 = (err1 as Error).message
    if (!isRecoverable(msg1)) throw err1

    console.warn(
      `[Cloudflare] Primary model (${TEXT_MODEL}) attempt 1 failed: ${msg1}`,
    )

    // ---- Attempt 2: retry primary model after a short delay ----
    // Cloudflare Workers AI sometimes returns 408 (Request timeout) under load.
    // A brief pause lets their infrastructure recover between retries.
    await new Promise((r) => setTimeout(r, 5_000))

    try {
      const raw = await runText(systemPrompt, userPrompt, options)
      return extractJson<T>(raw)
    } catch (err2) {
      const msg2 = (err2 as Error).message
      if (!isRecoverable(msg2)) throw err2

      // ---- Attempt 3: fallback to 120B after a longer delay ----
      console.warn(
        `[Cloudflare] Primary model retry also failed: ${msg2}. ` +
        `Falling back to ${TEXT_MODEL_FALLBACK} after 10s delay.`,
      )
      await new Promise((r) => setTimeout(r, 10_000))
      const raw = await runText(systemPrompt, userPrompt, {
        ...options,
        model: TEXT_MODEL_FALLBACK,
      })
      return extractJson<T>(raw)
    }
  }
}

// Timeout: 90s for image generation (FLUX-1-Schnell is slower)
// The try/catch in generate-recipe.ts handles failure gracefully.
const IMAGE_TIMEOUT_MS = 90_000

export async function runImage(prompt: string): Promise<Buffer> {
  const { accountId, apiToken } = cfConfig()
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${IMAGE_MODEL}`

  const isRecoverable = (msg: string): boolean =>
    msg.includes("408") || msg.includes("429") ||
    msg.includes("500") || msg.includes("502") ||
    msg.includes("503") || msg.includes("504") ||
    msg.includes("timed out") || msg.includes("timeout") ||
    msg.includes("aborted")

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, num_steps: 4 }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Cloudflare image run failed (${res.status}): ${text}`)
      }

      const contentType = res.headers.get("content-type") ?? ""

      // FLUX-1-Schnell returns JSON with the image as base64
      // (legacy format: raw binary — in case the model changes)
      if (contentType.includes("json")) {
        const json = await res.json()
        const b64 = json?.result?.image
        if (typeof b64 !== "string") {
          throw new Error(
            "Cloudflare image: no result.image in JSON response. " +
              `Result keys: ${Object.keys(json?.result ?? {}).join(", ")}`,
          )
        }
        return Buffer.from(b64, "base64")
      }

      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      lastError = err as Error
      const msg = (err as Error).message
      if (attempt < 3 && isRecoverable(msg)) {
        console.warn(`[Cloudflare] Image attempt ${attempt}/3 failed: ${msg} — retrying in ${attempt * 5}s`)
        await new Promise((r) => setTimeout(r, attempt * 5000))
      } else {
        throw lastError
      }
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError ?? new Error("Cloudflare image generation failed after 3 attempts")
}

/**
 * Attempt to repair a malformed JSON string produced by an LLM.
 *
 * Phase 1 — Control characters: LLMs produce unescaped control characters
 * (\n, \r, \t) inside JSON strings, which invalidates the JSON. We track
 * whether we're inside a string and escape those.
 *
 * Phase 2 — Structural: DeepSeek v4 Pro sometimes generates trailing commas,
 * missing commas between array elements, or truncates mid-JSON when hitting
 * max_tokens. Apply mechanical fixes after control-character repair.
 */
function repairJson(badJson: string): string {
  // ── Phase 1: Control character repair ──────────────────────────────────
  const output: string[] = []
  let inStr = false

  for (let i = 0; i < badJson.length; i++) {
    const ch = badJson[i]

    if (inStr) {
      if (ch === '\\' && i + 1 < badJson.length) {
        // Existing escape sequence — preserve as-is
        output.push(ch, badJson[++i])
      } else if (ch === '"') {
        inStr = false
        output.push(ch)
      } else if (ch === '\n') {
        output.push('\\n')
      } else if (ch === '\r') {
        output.push('\\r')
      } else if (ch === '\t') {
        output.push('\\t')
      } else if (ch.charCodeAt(0) < 0x20) {
        output.push(' ')
      } else {
        output.push(ch)
      }
    } else {
      if (ch === '"') inStr = true
      output.push(ch)
    }
  }

  let repaired = output.join('')

  // ── Phase 2: Structural repair ─────────────────────────────────────────
  // These are ordered — each fix may enable the next.

  // 2a. Trailing commas before ] or } (LLMs often add these)
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // 2b. Missing commas between array elements: "val1" "val2" → "val1", "val2"
  //     (only on same line — don't touch multi-line cases which are harder)
  repaired = repaired.replace(/"\s+"/g, '", "')
  repaired = repaired.replace(/\]\s+"/g, '], "')
  repaired = repaired.replace(/"\s+\[/g, '", [')
  repaired = repaired.replace(/}\s+"/g, '}, "')
  repaired = repaired.replace(/"\s+{/g, '", {')
  repaired = repaired.replace(/]\s+{/g, '], {')
  repaired = repaired.replace(/}\s+{/g, '}, {')
  repaired = repaired.replace(/]\s+\[/g, '], [')
  repaired = repaired.replace(/}\s+\[/g, '}, [')

  // 2c. Numbers/booleans followed by strings without comma
  repaired = repaired.replace(/(\d)\s+"/g, '$1, "')
  repaired = repaired.replace(/(true|false|null)\s+"/g, '$1, "')

  // 2d. Truncation — missing closing bracket/brace.
  //     If the JSON starts with { but has more { than }, add missing }.
  //     Same for [ and ].
  const openBraces = (repaired.match(/{/g) ?? []).length
  const closeBraces = (repaired.match(/}/g) ?? []).length
  const openBrackets = (repaired.match(/\[/g) ?? []).length
  const closeBrackets = (repaired.match(/\]/g) ?? []).length

  // Close unbalanced braces (up to 3 missing)
  for (let b = 0; b < Math.min(openBraces - closeBraces, 3); b++) {
    repaired += '}'
  }
  // Close unbalanced brackets (up to 3 missing)
  for (let b = 0; b < Math.min(openBrackets - closeBrackets, 3); b++) {
    repaired += ']'
  }

  // 2e. Truncated string at end — close with empty string + closing brackets
  //     If the last non-whitespace char is inside a string (odd quote count),
  //     close the string before adding brackets.
  const quoteCount = (repaired.match(/"/g) ?? []).length
  if (quoteCount % 2 !== 0) {
    repaired += '"'
  }

  return repaired
}

/**
 * Parse a JSON object out of an LLM response that may include prose / fences.
 *
 * The function first attempts a strict parse. On failure (common with LLMs
 * that produce unescaped control characters), it attempts automatic repair
 * before retrying the parse.
 */
export function extractJson<T>(raw: string): T {
  // 1. Extract content potentially wrapped in markdown fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw

  // 2. Detect JSON type: array [...] or object {...}
  const isArray = candidate.trimStart().startsWith("[")
  const start = isArray ? candidate.indexOf("[") : candidate.indexOf("{")
  const end = isArray ? candidate.lastIndexOf("]") : candidate.lastIndexOf("}")
  if (start === -1 || end === -1) {
    if (process.env.DEBUG === "true") {
      console.error(
        `[DEBUG extractJson] No JSON found. Raw output (first 2000 chars):\n${raw.substring(0, 2000)}`,
      )
    }
    throw new Error("No JSON found in model output.")
  }

  const jsonStr = candidate.slice(start, end + 1)

  // 3. Attempt strict parse
  try {
    return JSON.parse(jsonStr) as T
  } catch {
    // 4. On failure, repair control characters then retry
    const repaired = repairJson(jsonStr)
    try {
      return JSON.parse(repaired) as T
    } catch (parseErr) {
      throw new Error(
        `Failed to parse JSON from model output even after repair: ${(parseErr as Error).message}`,
      )
    }
  }
}
