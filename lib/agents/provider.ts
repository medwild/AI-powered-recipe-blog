// lib/agents/provider.ts
// LLM Provider abstraction — replaces the IS_DEEPSEEK toggle with
// an explicit provider pattern. Add new providers by implementing
// the LlmProvider interface.
//
// Usage:
//   import { getProvider, runTextAndParseJson } from "@/lib/agents/provider"
//   const result = await runTextAndParseJson<MyType>(systemPrompt, userPrompt, opts)

import { extractJson } from "./json-utils"

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

export class AnthropicProvider implements LlmProvider {
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor() {
    this.baseUrl = "https://api.anthropic.com/v1/messages"
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? ""
    // Guard against stale shell env vars (e.g., ANTHROPIC_MODEL=deepseek-v4-pro
    // when actually configured for Anthropic). Fall back to the latest Claude model
    // if the configured model name doesn't look like a Claude model.
    const configured = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"
    this.defaultModel = configured.toLowerCase().startsWith("claude-") ? configured : "claude-sonnet-4-6"
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
 * LLM_PROVIDER env var ("anthropic" | "deepseek"), defaulting to "deepseek".
 * Anthropic is available as a secondary provider via LLM_PROVIDER=anthropic
 * or by setting ANTHROPIC_API_KEY without a DeepSeek-specific config.
 */
export function getProvider(): LlmProvider {
  if (_provider) return _provider

  const explicitProvider = process.env.LLM_PROVIDER?.toLowerCase()
  const hasBaseUrl = !!process.env.ANTHROPIC_BASE_URL
  const configuredModel = (process.env.ANTHROPIC_MODEL || "").toLowerCase()

  console.log(`[provider] Selection — LLM_PROVIDER=${explicitProvider ?? "unset"} ANTHROPIC_MODEL=${configuredModel || "unset"} hasBaseUrl=${hasBaseUrl} ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING"}`)

  // Resolve provider — explicit LLM_PROVIDER wins. Otherwise infer from
  // ANTHROPIC_MODEL (deepseek-* → DeepSeek, claude-* → Anthropic).
  // DeepSeek is the default — Anthropic is available as secondary.
  const resolve = explicitProvider
    || (configuredModel.startsWith("deepseek") ? "deepseek" : null)
    || (configuredModel.startsWith("claude-") ? "anthropic" : null)

  // Reject unrecognized explicit provider values
  if (explicitProvider && resolve !== "deepseek" && resolve !== "anthropic") {
    throw new Error(
      `Unsupported LLM_PROVIDER: "${explicitProvider}". ` +
      `Supported values: "anthropic", "deepseek".`
    )
  }

  if (resolve === "deepseek") {
    console.log("[provider] → DeepSeekProvider")
    _provider = new DeepSeekProvider()
  } else if (resolve === "anthropic") {
    console.log("[provider] → AnthropicProvider")
    _provider = new AnthropicProvider()
  } else if (hasBaseUrl) {
    // ANTHROPIC_BASE_URL set → DeepSeek-compatible proxy
    console.log("[provider] → DeepSeekProvider (from base URL)")
    _provider = new DeepSeekProvider()
  } else if (process.env.ANTHROPIC_API_KEY) {
    // ANTHROPIC_API_KEY set → explicit Anthropic intent
    console.log("[provider] → AnthropicProvider (from API key)")
    _provider = new AnthropicProvider()
  } else {
    console.log("[provider] → DeepSeekProvider (default)")
    _provider = new DeepSeekProvider()
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
  "No JSON found", "No JSON object", "Failed to parse JSON", "aborted",
  "returned no response", "returned no text content", "timed out", "timeout",
  "403", "408", "429", "500", "502", "503", "504",
  "overloaded_error",
]

export function isRecoverable(msg: string): boolean {
  return RECOVERABLE_PATTERNS.some(p => msg.includes(p))
}

/**
 * Calls the configured provider and extracts structured JSON from the response.
 * Retries up to twice on recoverable errors (network, rate-limit, timeout, JSON
 * parse). Three total attempts with escalating delay (5s → 10s). DeepSeek v4 Pro
 * sometimes produces malformed JSON for large outputs — retries virtually
 * always succeed.
 */
export async function runTextAndParseJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: LlmProviderOptions,
): Promise<T> {
  const provider = getProvider()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await provider.runText(systemPrompt, userPrompt, options)
      return extractJson<T>(raw)
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err))
      lastError = normalized
      const msg = normalized.message

      // Non-recoverable errors: fail immediately
      if (!isRecoverable(msg)) throw lastError

      if (attempt < 3) {
        const delay = attempt * 5_000 // 5s, then 10s
        console.warn(`[provider] Attempt ${attempt} failed: ${msg} — retrying in ${delay / 1000}s`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      // Last attempt also failed — log raw output and give up
      console.error(`[provider] All 3 attempts failed. Last error: ${msg}`)
    }
  }

  throw lastError ?? new Error("runTextAndParseJson: all attempts failed")
}

// ---------------------------------------------------------------------------
// Structured Output (Anthropic native)
// ---------------------------------------------------------------------------

/**
 * Calls Claude with structured output (output_config.format).
 * The API guarantees schema-compliant JSON — no parsing or retry needed.
 * Falls back to runTextAndParseJson on non-Anthropic providers.
 */
export async function runWithStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, unknown>,
  options?: LlmProviderOptions,
): Promise<T> {
  const provider = getProvider()

  // Non-Anthropic providers: fall back to text + JSON parse
  if (!(provider instanceof AnthropicProvider)) {
    console.log("[provider] Structured output not supported by current provider — falling back to text+parse")
    return runTextAndParseJson<T>(systemPrompt, userPrompt, options)
  }

  const timeoutMs = options?.timeout ?? 300_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? ""
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for structured output")

    const body = {
      model: options?.model ?? "claude-opus-4-8",
      max_tokens: options?.maxTokens ?? 32000,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{ role: "user" as const, content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: jsonSchema,
        },
      },
      thinking: { type: "adaptive" as const, budget_tokens: 4000 },
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const status = res.status
      const text = await res.text()

      // Fallback to Sonnet 5 on rate limit / overload / server error
      if ((status === 429 || status === 529 || status >= 500) && options?.model !== "claude-sonnet-5") {
        console.warn(`[provider] Opus 4.8 returned ${status} — falling back to claude-sonnet-5`)
        return runWithStructuredOutput<T>(systemPrompt, userPrompt, jsonSchema, {
          ...options,
          model: "claude-sonnet-5",
        })
      }

      throw new Error(`Anthropic API error (${status}): ${text.substring(0, 500)}`)
    }

    const data = await res.json()
    const contentBlocks: Array<Record<string, unknown>> = Array.isArray(data?.content)
      ? data.content as Array<Record<string, unknown>>
      : []
    const textBlock = contentBlocks.find((b) => b.type === "text")
    const out = typeof textBlock?.text === "string" ? textBlock.text as string : ""

    if (out.trim().length === 0) {
      throw new Error("Anthropic structured output: no text content returned")
    }

    const parsed = JSON.parse(out) as T

    // Log cache + token usage
    const usage = data?.usage as Record<string, number> | undefined
    const cacheRead = usage?.cache_read_input_tokens ?? 0
    const cacheCreate = usage?.cache_creation_input_tokens ?? 0
    const inputTokens = usage?.input_tokens ?? 0
    const outputTokens = usage?.output_tokens ?? 0
    console.log(
      `[provider] Anthropic ${body.model} structured output — success ` +
      `(in:${inputTokens} out:${outputTokens} ${cacheRead > 0 ? `cache HIT(${cacheRead})` : `cache MISS(${cacheCreate})`})`,
    )

    return parsed
  } finally {
    clearTimeout(timer)
  }
}
