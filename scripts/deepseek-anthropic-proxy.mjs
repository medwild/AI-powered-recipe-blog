/**
 * Micro-proxy: Anthropic Messages API → DeepSeek OpenAI API
 *
 * Claude Code speaks Anthropic (/v1/messages). DeepSeek speaks OpenAI
 * (/v1/chat/completions). This proxy translates between the two formats
 * so Claude Code can use DeepSeek with a sk- key.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=sk-... node scripts/deepseek-anthropic-proxy.mjs
 *
 * Then set in claude-settings.json:
 *   "apiBaseUrl": "http://localhost:3002/v1",
 *   "apiKey": "sk-...",
 *   "model": "deepseek-chat"
 */

const DEEPSEEK_BASE = "https://api.deepseek.com"
const PORT = parseInt(process.env.PORT || "3002", 10)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ""
const MODEL = process.env.MODEL || "deepseek-chat"

if (!DEEPSEEK_API_KEY) {
  console.error("ERROR: DEEPSEEK_API_KEY env var is required (should start with sk-)")
  process.exit(1)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Anthropic Messages API request body to OpenAI Chat Completions */
function anthropicToOpenAI(anthropicBody) {
  const messages = []

  // Anthropic system prompt (can be string or array of content blocks)
  if (anthropicBody.system) {
    if (typeof anthropicBody.system === "string") {
      messages.push({ role: "system", content: anthropicBody.system })
    } else if (Array.isArray(anthropicBody.system)) {
      for (const block of anthropicBody.system) {
        if (block.type === "text") {
          messages.push({ role: "system", content: block.text })
        }
      }
    }
  }

  // Anthropic messages array → OpenAI messages (compatible format)
  if (Array.isArray(anthropicBody.messages)) {
    for (const msg of anthropicBody.messages) {
      // Handle both string content and content-block-array content
      if (typeof msg.content === "string") {
        messages.push({ role: msg.role, content: msg.content })
      } else if (Array.isArray(msg.content)) {
        const textParts = msg.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
        messages.push({ role: msg.role, content: textParts.join("\n") })
      }
    }
  }

  const openaiBody = {
    model: anthropicBody.model || MODEL,
    messages,
  }

  if (anthropicBody.max_tokens) openaiBody.max_tokens = anthropicBody.max_tokens
  if (anthropicBody.temperature != null) openaiBody.temperature = anthropicBody.temperature
  if (anthropicBody.top_p != null) openaiBody.top_p = anthropicBody.top_p
  if (anthropicBody.stop_sequences) openaiBody.stop = anthropicBody.stop_sequences
  if (anthropicBody.stream) openaiBody.stream = true

  // Pass through tool definitions if present
  if (anthropicBody.tools) {
    openaiBody.tools = anthropicBody.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }))
    if (anthropicBody.tool_choice) {
      openaiBody.tool_choice = anthropicBody.tool_choice.type || anthropicBody.tool_choice
    }
  }

  return openaiBody
}

/** Convert OpenAI Chat Completion response back to Anthropic Messages format */
function openaiToAnthropic(openaiBody) {
  const choice = openaiBody.choices?.[0]
  if (!choice) {
    return {
      id: openaiBody.id || "msg_deepseek",
      type: "message",
      role: "assistant",
      model: openaiBody.model || MODEL,
      content: [{ type: "text", text: "" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    }
  }

  const message = choice.message || {}
  const content = []

  if (message.content) {
    content.push({ type: "text", text: message.content })
  }

  // Handle tool calls → Anthropic tool_use blocks
  if (message.tool_calls) {
    for (const tc of message.tool_calls) {
      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function?.name || "",
        input: typeof tc.function?.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function?.arguments || {},
      })
    }
  }

  const finishReason = choice.finish_reason || "stop"
  const stopReason =
    finishReason === "stop" ? "end_turn" :
    finishReason === "tool_calls" ? "tool_use" :
    finishReason === "length" ? "max_tokens" :
    "end_turn"

  return {
    id: openaiBody.id || "msg_deepseek",
    type: "message",
    role: "assistant",
    model: openaiBody.model || MODEL,
    content,
    stop_reason: stopReason,
    usage: {
      input_tokens: openaiBody.usage?.prompt_tokens || 0,
      output_tokens: openaiBody.usage?.completion_tokens || 0,
    },
  }
}

// ── HTTP Server ──────────────────────────────────────────────────────────────

import { createServer } from "node:http"

const server = createServer(async (req, res) => {
  // CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "*")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", target: DEEPSEEK_BASE, model: MODEL }))
    return
  }

  // Anthropic Messages API endpoint
  if (req.method === "POST" && req.url === "/v1/messages") {
    try {
      // Read request body
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const anthropicBody = JSON.parse(Buffer.concat(chunks).toString())

      console.log(`[proxy] → ${anthropicBody.model || MODEL} | messages: ${anthropicBody.messages?.length || 0} | max_tokens: ${anthropicBody.max_tokens || "default"}`)

      // Translate and forward
      const openaiBody = anthropicToOpenAI(anthropicBody)
      const deepseekUrl = `${DEEPSEEK_BASE}/v1/chat/completions`

      const deepseekRes = await fetch(deepseekUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiBody),
        signal: AbortSignal.timeout(300_000),
      })

      if (!deepseekRes.ok) {
        const errText = await deepseekRes.text()
        console.error(`[proxy] DeepSeek error ${deepseekRes.status}: ${errText.substring(0, 300)}`)
        res.writeHead(deepseekRes.status, { "Content-Type": "application/json" })
        res.end(JSON.stringify({
          error: { type: "api_error", message: `DeepSeek API error: ${errText.substring(0, 500)}` }
        }))
        return
      }

      const openaiResponse = await deepseekRes.json()
      const anthropicResponse = openaiToAnthropic(openaiResponse)

      console.log(`[proxy] ← tokens: ${anthropicResponse.usage.output_tokens} | stop: ${anthropicResponse.stop_reason}`)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(anthropicResponse))
    } catch (err) {
      console.error(`[proxy] ERROR: ${err.message}`)
      res.writeHead(502, { "Content-Type": "application/json" })
      res.end(JSON.stringify({
        error: { type: "api_error", message: `Proxy error: ${err.message}` }
      }))
    }
    return
  }

  // 404 for everything else
  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "not found" }))
})

server.listen(PORT, () => {
  console.log(`[proxy] DeepSeek Anthropic proxy running on http://localhost:${PORT}`)
  console.log(`[proxy] Target: ${DEEPSEEK_BASE}/v1/chat/completions`)
  console.log(`[proxy] Model: ${MODEL}`)
  console.log(`[proxy] Set claude-settings.json apiBaseUrl to http://localhost:${PORT}/v1`)
})