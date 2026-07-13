// lib/agents/provider.ts
// LLM Provider abstraction — replaces the IS_DEEPSEEK toggle with
// an explicit provider pattern. Add new providers by implementing
// the LlmProvider interface.
//
// Usage:
//   import { getProvider, runTextAndParseJson } from "@/lib/agents/provider"
//   const result = await runTextAndParseJson<MyType>(systemPrompt, userPrompt, opts)

import { extractJson } from "./cloudflare"

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface LlmProviderOptions {
  temperature?: number
  maxTokens?: number
  model?: string
  timeout?: number
}

export interface LlmProvider {
  /** Sends a prompt to the LLM and returns raw text. */
  runText(systemPrompt: string, userPrompt: string, options?: LlmProviderOptions): Promise<string>
}

// ---------------------------------------------------------------------------
// Anthropic Provider (Native)
// ---------------------------------------------------------------------------

class AnthropicProvider implements LlmProvider {
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor() {
    this.baseUrl = "https://api.anthropic.com/v1/messages"
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? ""
    this.defaultModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"
  }

  async runText(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmProviderOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY must be set.")
    }

    const timeoutMs = options?.timeout ?? 300_000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const body = {
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? 3072,
        system: [
          {
            type: "text" as const,
            text: systemPrompt,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [{ role: "user" as const, content: userPrompt }],
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      }

      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Anthropic API error (${res.status}): ${text}`)
      }

      const data = await res.json()
      const contentBlocks: Array<Record<string, unknown>> = Array.isArray(data?.content)
        ? data.content as Array<Record<string, unknown>>
        : []
      const textBlock = contentBlocks.find(b => b.type === "text")
      const out = typeof textBlock?.text === "string" ? textBlock.text as string : ""

      if (out.trim().length === 0) {
        throw new Error("Anthropic returned no text content.")
      }

      // Log cache status
      const cacheRead = data?.usage?.cache_read_input_tokens ?? 0
      const cacheCreate = data?.usage?.cache_creation_input_tokens ?? 0
      const cacheLabel = cacheRead > 0
        ? `cache HIT (${cacheRead} tokens read)`
        : cacheCreate > 0
          ? `cache MISS (${cacheCreate} tokens written)`
          : "cache n/a"
      console.log(`[provider] Anthropic ${options?.model ?? this.defaultModel} — success (${cacheLabel})`)

      return out
    } finally {
      clearTimeout(timer)
    }
  }
}

// ---------------------------------------------------------------------------
// DeepSeek Provider (Anthropic-compatible proxy)
// ---------------------------------------------------------------------------

class DeepSeekProvider implements LlmProvider {
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor() {
    this.baseUrl = (process.env.ANTHROPIC_BASE_URL ?? "https://api.deepseek.com") + "/v1/messages"
    this.apiKey = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.ANTHROPIC_API_KEY ?? ""
    this.defaultModel = process.env.ANTHROPIC_MODEL || "deepseek-v4-pro"
  }

  async runText(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmProviderOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY must be set.")
    }

    const timeoutMs = options?.timeout ?? 300_000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // DeepSeek doesn't support prompt caching — pass system as string
      const body = {
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? 3072,
        system: systemPrompt,
        messages: [{ role: "user" as const, content: userPrompt }],
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      }

      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`DeepSeek API error (${res.status}): ${text}`)
      }

      const data = await res.json()
      // DeepSeek may return thinking blocks before text blocks
      const contentBlocks: Array<Record<string, unknown>> = Array.isArray(data?.content)
        ? data.content as Array<Record<string, unknown>>
        : []
      const textBlock = contentBlocks.find(b => b.type === "text")
      const out = typeof textBlock?.text === "string" ? textBlock.text as string : ""

      if (out.trim().length === 0) {
        throw new Error(`DeepSeek returned no text content. Content blocks: ${contentBlocks.map(b => b.type).join(", ") || "none"}`)
      }

      console.log(`[provider] DeepSeek ${options?.model ?? this.defaultModel} — success`)
      return out
    } finally {
      clearTimeout(timer)
    }
  }
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

let _provider: LlmProvider | null = null

/**
 * Returns the configured LLM provider. Selection is based on
 * LLM_PROVIDER env var ("anthropic" | "deepseek"), defaulting to "anthropic"
 * unless ANTHROPIC_BASE_URL is set (which implies DeepSeek proxy).
 */
export function getProvider(): LlmProvider {
  if (_provider) return _provider

  const explicitProvider = process.env.LLM_PROVIDER?.toLowerCase()
  const hasBaseUrl = !!process.env.ANTHROPIC_BASE_URL

  if (explicitProvider === "deepseek" || (hasBaseUrl && explicitProvider !== "anthropic")) {
    _provider = new DeepSeekProvider()
  } else {
    _provider = new AnthropicProvider()
  }

  return _provider
}

/**
 * Resets the cached provider (useful for testing).
 */
export function resetProvider(): void {
  _provider = null
}

// ---------------------------------------------------------------------------
// Convenience: text + JSON parsing (replaces runTextAndParseJson in anthropic.ts)
// ---------------------------------------------------------------------------

const RECOVERABLE_PATTERNS = [
  "No JSON object", "Failed to parse JSON", "aborted",
  "returned no response", "timed out", "timeout",
  "403", "408", "429", "500", "502", "503", "504",
  "overloaded_error",
]

function isRecoverable(msg: string): boolean {
  return RECOVERABLE_PATTERNS.some(p => msg.includes(p))
}

/**
 * Calls the configured provider and extracts structured JSON from the response.
 * Retries once on recoverable errors (network, rate-limit, timeout).
 */
export async function runTextAndParseJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: LlmProviderOptions,
): Promise<T> {
  const provider = getProvider()

  try {
    const raw = await provider.runText(systemPrompt, userPrompt, options)
    return extractJson<T>(raw)
  } catch (err1) {
    const msg1 = (err1 as Error).message
    if (!isRecoverable(msg1)) throw err1

    console.warn(`[provider] Attempt 1 failed: ${msg1}`)

    // Retry after 5s delay
    await new Promise((r) => setTimeout(r, 5_000))

    const raw = await provider.runText(systemPrompt, userPrompt, options)
    return extractJson<T>(raw)
  }
}
