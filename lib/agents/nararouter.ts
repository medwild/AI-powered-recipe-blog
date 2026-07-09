// NaraRouter AI client — OpenAI-compatible API via https://router.bynara.id
// - runText: Mistral Medium 3.5 (128B, 256k ctx, Intel #2 mondial)
// - runTextAndParseJson: same + JSON extraction + retry logic
//
// Falls back to Cloudflare Workers AI if NARAROUTER_API_KEY is not set.

import { runText as cfRunText, runTextAndParseJson as cfRunTextAndParseJson, TEXT_MODEL_FALLBACK } from "./cloudflare"
import { runTextAndParseJson as anthropicRunTextAndParseJson } from "./anthropic"
import { isCircuitOpen, recordSuccess, recordFailure } from "@/lib/circuit-breaker"

const BASE_URL = "https://router.bynara.id/v1"
const TEXT_MODEL = process.env.NARAROUTER_TEXT_MODEL ?? "mistral-medium-3.5"
const API_KEY = process.env.NARAROUTER_API_KEY

const TEXT_TIMEOUT_MS = 300_000 // 5 min

function isNaraConfigured(): boolean {
  return !!API_KEY
}

export async function runText(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string; maxTokens?: number; timeout?: number },
): Promise<string> {
  // Route directly to Cloudflare if model starts with @cf/
  if (options?.model?.startsWith("@cf/")) {
    return cfRunText(systemPrompt, userPrompt, options)
  }

  // Fallback to Cloudflare if NaraRouter not configured
  if (!isNaraConfigured()) {
    return cfRunText(systemPrompt, userPrompt, options)
  }

  // Circuit breaker — skip call if NaraRouter is in failure state
  if (isCircuitOpen("nararouter")) {
    throw new Error("NaraRouter circuit OPEN — skipping call, use fallback")
  }

  const model = options?.model ?? TEXT_MODEL
  const url = `${BASE_URL}/chat/completions`

  const timeoutMs = options?.timeout ?? TEXT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
      recordFailure("nararouter")
      throw new Error(`NaraRouter text run failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // Standard OpenAI format: choices[0].message.content
    const out = data?.choices?.[0]?.message?.content

    if (typeof out !== "string" || out.trim().length === 0) {
      recordFailure("nararouter")
      throw new Error(
        "NaraRouter text run returned no response. " +
          `Response keys: ${Object.keys(data ?? {}).join(", ")}`,
      )
    }
    // Structured log: provider + model used — grep-friendly for production monitoring
    console.log(`[provider] NaraRouter ${model} — success`)
    recordSuccess("nararouter")
    return out
  } catch (err) {
    // Only record failure for actual API errors, not circuit-open or abort
    const msg = (err as Error).message
    if (!msg.includes("circuit OPEN")) {
      recordFailure("nararouter")
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

import { extractJson } from "./cloudflare"

// Recoverable errors — safe to retry
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

/**
 * Calls runText() and extracts structured JSON from the response.
 *
 * Resilience strategy (3 attempts):
 * 1. Primary attempt with configured model
 * 2. Retry after 5s delay (handles transient network/rate-limit issues)
 * 3. Fall back to Cloudflare Workers AI (GPT-OSS 120B) if NaraRouter fails
 */
export async function runTextAndParseJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; model?: string; timeout?: number },
): Promise<T> {
  // Route to Claude if explicitly requested
  if (options?.model === "claude") {
    return anthropicRunTextAndParseJson<T>(systemPrompt, userPrompt, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }

  // Route directly to Cloudflare if model starts with @cf/
  if (options?.model?.startsWith("@cf/")) {
    return cfRunTextAndParseJson<T>(systemPrompt, userPrompt, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      model: options.model,
    })
  }

  // ---- Attempt 1: NaraRouter primary model ----
  try {
    const raw = await runText(systemPrompt, userPrompt, options)
    return extractJson<T>(raw)
  } catch (err1) {
    const msg1 = (err1 as Error).message
    if (!isRecoverable(msg1)) throw err1

    console.warn(`[NaraRouter] Attempt 1 failed: ${msg1}`)

    // ---- Attempt 2: retry after delay ----
    await new Promise((r) => setTimeout(r, 5_000))

    try {
      const raw = await runText(systemPrompt, userPrompt, options)
      return extractJson<T>(raw)
    } catch (err2) {
      const msg2 = (err2 as Error).message
      if (!isRecoverable(msg2)) throw err2

      // ---- Attempt 3: fallback to Cloudflare ----
      console.warn(
        `[NaraRouter] Attempt 2 also failed: ${msg2}. ` +
        `Falling back to Cloudflare ${TEXT_MODEL_FALLBACK} after 10s delay.`,
      )
      await new Promise((r) => setTimeout(r, 10_000))

      const raw = await cfRunText(systemPrompt, userPrompt, {
        ...options,
        model: TEXT_MODEL_FALLBACK,
      })
      return extractJson<T>(raw)
    }
  }
}
