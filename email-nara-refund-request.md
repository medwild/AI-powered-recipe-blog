# Refund Request — Nara Router (PAYG)

> Version courte (< 1000 chars) pour formulaire de support. Remplace `[...]` avant envoi.

---

**Subject:** Refund request — service unusable for heavy requests

**Body:**

I loaded PAYG credits to generate articles via your API (6KB system prompt, JSON schema, up to 32K output tokens). Since `[date]`, every heavy request fails after ~45s with "upstream_error: model service temporarily unavailable", on all models tested: claude-opus-4.8, claude-sonnet-5, glm-5.2-alibaba. Your dashboard confirms: Status Failed, 502 Exhausted, attempts=3, failed_over=false, 0 tokens billed. Three problems: (1) failures are masked as HTTP 200 `{"error":{"type":"upstream_error"}}` — clients cannot detect errors; (2) no failover occurs despite advertised routing; (3) small requests succeed while heavy ones systematically fail — the advertised workload (1M context, 32K tokens) cannot be delivered. My production pipeline has been blocked since `[date]`, with over a dozen failed calls. I request a full refund of the credits loaded (`[amount]`). I can provide the failed request IDs if needed.

---

**Caractères (body seul, sans placeholders):** ~870 — vérifier avec `wc -c` avant envoi.

## Honnêteté — à garder en tête

- Le dashboard montrait **0 token / coût —** sur les échecs → Nara n'a probablement **pas facturé** les appels échoués.
- Leur défense plausible : « vous n'avez rien payé pour ces appels ».
- Notre levier le plus solide reste : **masquage HTTP 200 + absence de failover** (le service de routing vendu n'est pas livré) + **temps perdu réel**.
