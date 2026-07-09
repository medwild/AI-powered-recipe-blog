// Anthropic API client — Claude Sonnet 4.6 via direct fetch()
// - runText: text generation with prompt caching on system prompt
// - runTextAndParseJson: same + JSON extraction + retry logic
//
// Prompt caching: system prompts are marked with cache_control: ephemeral
// (TTL 5 min). Cache reads cost 0.1x input ($0.30/M vs $3.00/M).
// Minimum cacheable prefix: 1024 tokens (Sonnet 4.6).

import { extractJson } from "./cloudflare"

const BASE_URL = process.env.ANTHROPIC_BASE_URL
  ? `${process.env.ANTHROPIC_BASE_URL}/v1/messages`
  : "https://api.anthropic.com/v1/messages"
const TEXT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"
const ANTHROPIC_VERSION = "2023-06-01"
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
const IS_DEEPSEEK = !!process.env.ANTHROPIC_BASE_URL

const TEXT_TIMEOUT_MS = 300_000 // 5 min

function isAnthropicConfigured(): boolean {
  return !!API_KEY
}

export async function runText(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; model?: string; timeout?: number },
): Promise<string> {
  if (!isAnthropicConfigured()) {
    throw new Error(
      "ANTHROPIC_API_KEY must be set to use Claude Sonnet 4.6.",
    )
  }

  const timeoutMs = options?.timeout ?? TEXT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const modelId = options?.model ?? TEXT_MODEL
    const body: Record<string, unknown> = {
      model: modelId,
      max_tokens: options?.maxTokens ?? 3072,
      system: IS_DEEPSEEK
        ? systemPrompt
        : [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
      messages: [
        { role: "user", content: userPrompt },
      ],
    }

    if (options?.temperature != null) {
      body.temperature = options.temperature
    }

    const headers: Record<string, string> = {
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    }

    if (IS_DEEPSEEK) {
      headers["Authorization"] = `Bearer ${API_KEY!}`
    } else {
      headers["x-api-key"] = API_KEY!
    }

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Anthropic text run failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // Anthropic Messages API: find first text block in content array.
    // DeepSeek v4 Pro returns thinking blocks before text blocks,
    // so content[0] may be a thinking block with no .text field.
    const contentBlocks: Array<Record<string, unknown>> = Array.isArray(data?.content)
      ? data.content as Array<Record<string, unknown>>
      : []
    const textBlock = contentBlocks.find(b => b.type === "text")
    const out = typeof textBlock?.text === "string" ? textBlock.text as string : ""

    if (out.trim().length === 0) {
      throw new Error(
        "Anthropic text run returned no response. " +
          `Response keys: ${Object.keys(data ?? {}).join(", ")}. ` +
          `Content blocks: ${contentBlocks.map(b => b.type).join(", ") || "none"}`,
      )
    }

    // Log cache status for monitoring
    const cacheRead = data?.usage?.cache_read_input_tokens ?? 0
    const cacheCreate = data?.usage?.cache_creation_input_tokens ?? 0
    const cacheLabel =
      cacheRead > 0
        ? `cache HIT (${cacheRead} tokens read)`
        : cacheCreate > 0
          ? `cache MISS (${cacheCreate} tokens written)`
          : "cache n/a"

    console.log(`[provider] Anthropic ${modelId} — success (${cacheLabel})`)
    return out
  } finally {
    clearTimeout(timer)
  }
}

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
  msg.includes("504") ||
  msg.includes("overloaded_error")

/**
 * Calls runText() and extracts structured JSON from the response.
 *
 * Resilience strategy (2 attempts):
 * 1. Primary attempt with Claude Sonnet 4.6
 * 2. Retry after 5s delay (handles transient network/rate-limit issues)
 *
 * No third fallback — the Inngest orchestrator handles global retries
 * if Anthropic is completely unavailable.
 */
export async function runTextAndParseJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; model?: string; timeout?: number },
): Promise<T> {
  // ---- Attempt 1: Anthropic primary ----
  try {
    const raw = await runText(systemPrompt, userPrompt, options)
    return extractJson<T>(raw)
  } catch (err1) {
    const msg1 = (err1 as Error).message
    if (!isRecoverable(msg1)) throw err1

    console.warn(`[Anthropic] Attempt 1 failed: ${msg1}`)

    // ---- Attempt 2: retry after delay ----
    await new Promise((r) => setTimeout(r, 5_000))

    const raw = await runText(systemPrompt, userPrompt, options)
    return extractJson<T>(raw)
  }
}
