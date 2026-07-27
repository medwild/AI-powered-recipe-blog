import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const baseUrl = "https://router.flatkey.ai/v1/messages";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

  if (!apiKey) { console.log("❌ ANTHROPIC_API_KEY manquante"); process.exit(1); }

  console.log(`[test] FlatKey → ${model}`);
  console.log(`[test] URL  → ${baseUrl}`);
  console.log(`[test] Key  → ${apiKey.slice(0, 12)}...`);

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 50,
        system: "Réponds en français.",
        messages: [{ role: "user", content: "Dis juste bonjour." }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();

    if (res.ok) {
      const data = JSON.parse(text);
      const reply = data?.content?.[0]?.text ?? "(pas de texte)";
      const usage = data?.usage || {};
      console.log(`✅ HTTP ${res.status} — Réponse: "${reply.trim()}"`);
      console.log(`   tokens: in=${usage.input_tokens} out=${usage.output_tokens}`);
    } else {
      console.log(`❌ HTTP ${res.status} — ${text.slice(0, 500)}`);
    }
  } catch (err) {
    console.log(`❌ Erreur réseau: ${(err as Error).message}`);
  }
}

main();
