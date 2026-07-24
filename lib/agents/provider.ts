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
  /** Whether this provider supports native structured output (JSON schema enforcement). */
  supportsStructuredOutput?: boolean
}

// ---------------------------------------------------------------------------
// Anthropic Provider (Native)
// ---------------------------------------------------------------------------

export class AnthropicProvider implements LlmProvider {
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor() {
    // ANTHROPIC_BASE_URL allows pointing to Anthropic-compatible proxies
    // (e.g., ZenMux: https://zenmux.ai/api/anthropic)
    this.baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages"
    this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || ""
    const configured = process.env.ANTHROPIC_MODEL || "claude-sonnet-5"
    // ZenMux prefixes models with "anthropic/" — accept any model name
    this.defaultModel = configured
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
// Cloudflare Workers AI Provider (OpenAI-compatible)
// ---------------------------------------------------------------------------
// Free tier: 10,000 Neurons/day. Models: GLM-5.2, Kimi K2.6, GPT-OSS-120B, etc.
// Endpoint uses OpenAI chat/completions format — no native structured output,
// so runWithStructuredOutput falls back to runTextAndParseJson automatically.
// ---------------------------------------------------------------------------

const CLOUDFLARE_MODEL_MAP: Record<string, string> = {
  "glm-5.2": "@cf/zai-org/glm-5.2",
  "glm-5": "@cf/zai-org/glm-5.2",
  "kimi-k2.6": "@cf/moonshotai/kimi-k2.6",
  "kimi-k2": "@cf/moonshotai/kimi-k2.6",
  "gpt-oss-120b": "@cf/openai/gpt-oss-120b",
  "gpt-oss-20b": "@cf/openai/gpt-oss-20b",
  "nemotron": "@cf/nvidia/nemotron-3-120b-a12b",
  "gemma-4": "@cf/google/gemma-4-26b-a4b-it",
  "llama-4-scout": "@cf/meta/llama-4-scout-17b-16e-instruct",
  "llama4": "@cf/meta/llama-4-scout-17b-16e-instruct",
}

function resolveCloudflareModel(short: string): string {
  return CLOUDFLARE_MODEL_MAP[short.toLowerCase()] ?? short
}

class CloudflareProvider implements LlmProvider {
  private baseUrl: string
  private apiToken: string
  private defaultModel: string

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? ""
    if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID must be set for Cloudflare provider.")
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN ?? ""
    if (!this.apiToken) throw new Error("CLOUDFLARE_API_TOKEN must be set for Cloudflare provider.")
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`
    const raw = process.env.CLOUDFLARE_MODEL || "glm-5.2"
    this.defaultModel = resolveCloudflareModel(raw)
  }

  async runText(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmProviderOptions,
  ): Promise<string> {
    const timeoutMs = options?.timeout ?? 180_000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // Reject non-Cloudflare model names (e.g. stale ANTHROPIC_MODEL in env)
      const requested = options?.model ?? this.defaultModel
      const model = requested.startsWith("@cf/") ? requested : this.defaultModel
      const body = {
        model,
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ],
        max_tokens: options?.maxTokens ?? 32000,
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      }

      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Cloudflare API error (${res.status}): ${text.substring(0, 500)}`)
      }

      const data = await res.json() as Record<string, unknown>
      const choices = data?.choices as Array<Record<string, unknown>> | undefined
      const message = choices?.[0]?.message as Record<string, unknown> | undefined
      const out = typeof message?.content === "string" ? message.content as string : ""

      if (out.trim().length === 0) {
        throw new Error(`Cloudflare returned no content. Model: ${model}`)
      }

      const usage = data?.usage as Record<string, number> | undefined
      console.log(
        `[provider] Cloudflare ${model} — success ` +
        `(in:${usage?.prompt_tokens ?? "?"} out:${usage?.completion_tokens ?? "?"})`,
      )

      return out
    } finally {
      clearTimeout(timer)
    }
  }
}

// ---------------------------------------------------------------------------
// Gemini Provider (Google AI — free tier: ~1M tokens/day)
// ---------------------------------------------------------------------------
// Endpoint uses Gemini's native generateContent API with responseSchema
// for structured output. No JSON parsing hacks needed.
// ---------------------------------------------------------------------------

class GeminiProvider implements LlmProvider {
  supportsStructuredOutput = true
  private keys: Array<{ key: string; exhausted: boolean }> = []
  private defaultModel: string

  constructor() {
    const seen = new Set<string>()
    for (const [envName, envVal] of Object.entries(process.env)) {
      if (envName.startsWith("GEMINI_API_KEY") && envVal && !seen.has(envVal)) {
        seen.add(envVal)
        this.keys.push({ key: envVal, exhausted: false })
      }
    }
    if (this.keys.length === 0) throw new Error("At least one GEMINI_API_KEY must be set.")
    console.log(`[provider] Gemini — ${this.keys.length} key(s) loaded`)
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview"
  }
  /** Weighted random key selection — avoids predictable round-robin patterns. */
  private pickKey(): string {
    const active = this.keys.filter(k => !k.exhausted)
    if (active.length === 0) throw new Error("All Gemini API keys exhausted.")
    const idx = Math.floor(Math.random() * active.length * 1.5) % active.length
    return active[idx].key
  }
  private markExhausted(usedKey: string, reason: string): void {
    const entry = this.keys.find(k => k.key === usedKey)
    if (entry && !entry.exhausted) {
      entry.exhausted = true
      const rem = this.keys.filter(k => !k.exhausted).length
      console.warn(`[provider] Gemini key exhausted (${reason}). ${rem}/${this.keys.length} keys left.`)
    }
  }
  private endpoint(model: string, apiKey: string): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  }
  /** Fetch with key rotation — retries on 429 with a different key. */
  private async fetchWithRotation(model: string, body: Record<string, unknown>, timeoutMs: number): Promise<Response> {
    let lastRes: Response | null = null
    const maxAttempts = Math.min(3, this.keys.length)
    for (let a = 0; a < maxAttempts; a++) {
      const apiKey = this.pickKey()
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const res = await fetch(this.endpoint(model, apiKey), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: ctrl.signal,
        })
        if (res.status === 429) { this.markExhausted(apiKey, "quota"); lastRes = res; continue }
        return res
      } finally { clearTimeout(timer) }
    }
    return lastRes!
  }

  async runText(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmProviderOptions,
  ): Promise<string> {
    const timeoutMs = options?.timeout ?? 180_000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const body: Record<string, unknown> = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          { role: "user", parts: [{ text: userPrompt }] },
        ],
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? 32000,
          ...(options?.temperature != null ? { temperature: options.temperature } : {}),
        },
      }

      const reqModel = options?.model ?? this.defaultModel
      const model = reqModel.startsWith("gemini-") ? reqModel : this.defaultModel
      const res = await this.fetchWithRotation(model, body, timeoutMs)

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Gemini API error (${res.status}): ${text.substring(0, 500)}`)
      }

      const data = await res.json() as Record<string, unknown>
      const candidates = data?.candidates as Array<Record<string, unknown>> | undefined
      const content = candidates?.[0]?.content as { parts?: Array<{ text?: string }> } | undefined
      const out = content?.parts?.map(p => p.text ?? "").join("") ?? ""

      if (out.trim().length === 0) {
        throw new Error(`Gemini returned no content. Model: ${model}`)
      }

      const usage = data?.usageMetadata as Record<string, number> | undefined
      console.log(
        `[provider] Gemini ${model} — success ` +
        `(in:${usage?.promptTokenCount ?? "?"} out:${usage?.candidatesTokenCount ?? "?"})`,
      )

      return out
    } finally {
      clearTimeout(timer)  // eslint-disable-line no-unsafe-finally
    }
  }

  /** Strip JSON Schema keywords that Gemini doesn't support. */
  private cleanSchema(schema: Record<string, unknown>): Record<string, unknown> {
    const cleaned = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
    delete cleaned.additionalProperties
    if (cleaned.properties) {
      const props = cleaned.properties as Record<string, Record<string, unknown>>
      for (const key of Object.keys(props)) {
        if (props[key]!.additionalProperties !== undefined) delete props[key]!.additionalProperties
      }
    }
    return cleaned
  }

  /** Native structured output via Gemini's responseSchema. */
  async runStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    jsonSchema: Record<string, unknown>,
    options?: LlmProviderOptions,
  ): Promise<T> {
    const timeoutMs = options?.timeout ?? 180_000

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 32000,
        responseMimeType: "application/json",
        responseSchema: this.cleanSchema(jsonSchema),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      },
    }

    const reqModel = options?.model ?? this.defaultModel
    const model = reqModel.startsWith("gemini-") ? reqModel : this.defaultModel
    const res = await this.fetchWithRotation(model, body, timeoutMs)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Gemini API error (${res.status}): ${text.substring(0, 500)}`)
    }

    const data = await res.json() as Record<string, unknown>
    const candidates = data?.candidates as Array<Record<string, unknown>> | undefined
    const content = candidates?.[0]?.content as { parts?: Array<{ text?: string }> } | undefined
    const out = content?.parts?.map(p => p.text ?? "").join("") ?? ""

    if (out.trim().length === 0) {
      throw new Error(`Gemini structured output: no content returned. Model: ${model}`)
    }

    const parsed = JSON.parse(out) as T
    const usage = data?.usageMetadata as Record<string, number> | undefined
    console.log(
      `[provider] Gemini ${model} structured — success ` +
      `(in:${usage?.promptTokenCount ?? "?"} out:${usage?.candidatesTokenCount ?? "?"})`,
    )

    return parsed
  }
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

let _provider: LlmProvider | null = null

/**
 * Returns the configured LLM provider. Selection is based on
 * LLM_PROVIDER env var ("anthropic" | "deepseek" | "cloudflare" | "gemini").
 */
export function getProvider(): LlmProvider {
  if (_provider) return _provider

  const explicitProvider = process.env.LLM_PROVIDER?.toLowerCase()
  const hasBaseUrl = !!process.env.ANTHROPIC_BASE_URL
  const configuredModel = (process.env.ANTHROPIC_MODEL || "").toLowerCase()

  console.log(`[provider] Selection — LLM_PROVIDER=${explicitProvider ?? "unset"} ANTHROPIC_MODEL=${configuredModel || "unset"} hasBaseUrl=${hasBaseUrl} ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING"}`)

  // Resolve provider — explicit LLM_PROVIDER wins. Otherwise infer from
  // ANTHROPIC_MODEL (deepseek-* → DeepSeek, claude-* → Anthropic).
  // DeepSeek is the default — Anthropic and Cloudflare are available as alternates.
  const resolve = explicitProvider
    || (configuredModel.startsWith("deepseek") ? "deepseek" : null)
    || (configuredModel.startsWith("claude-") ? "anthropic" : null)

  // Reject unrecognized explicit provider values
  const VALID = new Set(["deepseek", "anthropic", "cloudflare", "gemini"])
  if (explicitProvider && !VALID.has(resolve ?? "")) {
    throw new Error(
      `Unsupported LLM_PROVIDER: "${explicitProvider}". ` +
      `Supported values: "anthropic", "deepseek", "cloudflare".`
    )
  }

  if (resolve === "cloudflare") {
    console.log("[provider] → CloudflareProvider")
    _provider = new CloudflareProvider()
  } else if (resolve === "gemini") {
    console.log("[provider] → GeminiProvider")
    _provider = new GeminiProvider()
  } else if (resolve === "deepseek") {
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

  // Gemini native structured output — retry on transient errors
  if (provider instanceof GeminiProvider) {
    console.log("[provider] Gemini structured output (responseSchema)")
    let lastErr: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await provider.runStructured<T>(systemPrompt, userPrompt, jsonSchema, options)
      } catch (err) {
        lastErr = err as Error
        const msg = (err as Error).message
        if (!isRecoverable(msg) && !msg.includes("503") && !msg.includes("429") && !msg.includes("UNAVAILABLE")) throw lastErr
        if (attempt < 3) {
          const delay = attempt * 5_000
          console.warn(`[provider] Gemini attempt ${attempt} failed: ${msg.substring(0, 100)} — retrying in ${delay / 1000}s`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    throw lastErr ?? new Error("Gemini structured output: all attempts failed")
  }

  // Non-Anthropic providers: fall back to text + JSON parse.
  // Inject the JSON schema into the prompt — without it the model
  // has no idea what structure to produce (only Anthropic sends
  // the schema via output_config).
  if (!(provider instanceof AnthropicProvider)) {
    console.log("[provider] Structured output not supported by current provider — falling back to text+parse")
    const schemaPrompt = `\n\n---\nOUTPUT FORMAT — You MUST return valid JSON matching this schema exactly:\n${JSON.stringify(jsonSchema, null, 2)}\n\nReturn ONLY the JSON object, no markdown fences, no extra text.`
    return runTextAndParseJson<T>(systemPrompt, userPrompt + schemaPrompt, options)
  }

  const timeoutMs = options?.timeout ?? 300_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || ""
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is required for structured output")

    const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages"
    const isZenMux = baseUrl.includes("zenmux.ai")
    const defaultModel = isZenMux ? "anthropic/claude-sonnet-5" : "claude-sonnet-5"

    const body: Record<string, unknown> = {
      model: options?.model ?? defaultModel,
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
    }

    // ZenMux doesn't support the `thinking` parameter yet.
    // Anthropic native API supports adaptive thinking for latency control.
    if (!isZenMux) {
      body.thinking = { type: "adaptive", budget_tokens: 4000 }
    }

    const res = await fetch(baseUrl, {
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
      const currentModel = options?.model ?? defaultModel
      const fallbackModel = isZenMux
        ? "anthropic/claude-sonnet-5"
        : currentModel.includes("/")
          ? currentModel.replace(/\/[^/]+$/, "/claude-sonnet-5")
          : "claude-sonnet-5"
      const isAlreadyFallback = currentModel === fallbackModel || currentModel === "claude-sonnet-5"
      if ((status === 429 || status === 529 || status >= 500) && !isAlreadyFallback) {
        console.warn(`[provider] ${currentModel} returned ${status} — falling back to ${fallbackModel}`)
        return runWithStructuredOutput<T>(systemPrompt, userPrompt, jsonSchema, {
          ...options,
          model: fallbackModel,
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
