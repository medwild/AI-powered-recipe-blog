# Phase Indexation Multi-Moteurs — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 100 % des 93 URLs du sitemap indexées sur Google ET Bing, avec suivi reproductible (audit + rapport) et IndexNow pour Bing.

**Architecture:** Un script Python d'audit (`scripts/indexation-audit.py`) qui lit le sitemap prod, classe les URLs (recipe/article/static), interroge l'état Google via `gsc_inspect.py` (plugin claude-seo) et l'état Bing via l'API BWT, puis écrit un rapport markdown + JSON. Re-crawl Google = clics UI GSC guidés par le rapport (pas d'API requestIndexing — inexistant). IndexNow : clé + fichier `public/` + hook post-push étendu.

**Tech Stack:** Python 3 (venv plugin `~/.local/share/claude-seo/.venv/bin/python`), urllib (stdlib), google-api-python-client + google-auth (venv), requests (venv), bash (hook), Next.js `public/` (fichier clé).

**Spec:** `docs/superpowers/specs/2026-08-14-indexation-design.md`

## Global Constraints

- **Python à utiliser** : `~/.local/share/claude-seo/.venv/bin/python` (le `python3` système n'existe pas). Toute exécution passe par ce venv.
- **Plugin scripts** : résoudre le chemin le plus récent par glob `~/.claude/plugins/cache/agricidaniel-claude-seo/claude-seo/*/scripts` (actuellement `2.2.4`) — jamais hardcoder une version.
- **Pas de requestIndexing API** : vérifié (discovery doc 14/08) — l'API n'expose que `urlInspection.index.inspect`. Le re-crawl Google est humain (UI GSC).
- **GSC property** : `sc-domain:chefaugustin.com` ; **Site** : `https://www.chefaugustin.com` (www).
- **Secrets** : clé API BWT → `~/.config/claude-seo/backlinks-api.json` (`bing_api_key`), JAMAIS dans le repo. Clé IndexNow → `public/{clé}.txt` committé (public par design) + `.env.local` (jamais committé).
- **Rapports** : dossier `repports/` (existe).
- **Hook post-push** : `scripts/hook-ping-sitemap.sh`, log `~/.claude/logs/ping-sitemap.log`.
- **Vérif syntaxe** : `python3 -m py_compile` (via venv) pour les scripts Python, `bash -n` pour le hook.
- **Règle 8 (secrets)** : aucun `console.log`/print de clé ; la clé IndexNow et la clé BWT ne sortent pas en clair dans les commits/logs (la clé IndexNow est publique par design, le fichier `.env.local` ne se commit pas).

---

### Task 1: `scripts/indexation-audit.py` — audit Google + rapport (Phase A)

**Files:**
- Create: `scripts/indexation-audit.py`

**Interfaces:**
- Consumes: plugin `gsc_inspect.py` → `batch_inspect(urls, site_url, delay=1.0) -> {"results": [{"url", "verdict", "index_status": {"coverage_state", "last_crawl_time", ...}, "canonical", "error"}], "summary": {...}}` (DAILY_LIMIT=2000, progress sur stderr, sleep `delay` entre requêtes)
- Produces: `repports/indexation-YYYY-MM-DD.md`, `repports/indexation-last.json` — consommé par Task 2 (hook IndexNow lit le même sitemap), Task 3 (ajoute la colonne Bing), Task 4 (liens GSC UI).

- [ ] **Step 1: Écrire le script complet**

```python
#!/usr/bin/env python3
"""
Audit indexation multi-moteurs — 2026-08-14.

Usage :
  ~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py [--limit N]

- Fetch du sitemap prod → URLs classées par type
- Google : batch inspect via gsc_inspect.py (plugin claude-seo)
- Bing : statut via API BWT (section activée à la Task 3, clé API requise)
- Sortie : repports/indexation-YYYY-MM-DD.md + repports/indexation-last.json
"""
import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SITEMAP_URL = "https://www.chefaugustin.com/sitemap.xml"
SITE_URL = "sc-domain:chefaugustin.com"
SITE_HOST = "https://www.chefaugustin.com"
REPORTS_DIR = Path(__file__).resolve().parent.parent / "repports"
PLUGIN_ROOT = Path.home() / ".claude/plugins/cache/agricidaniel-claude-seo/claude-seo"

_LOC_RE = re.compile(r"<loc>(.*?)</loc>")
TYPE_PATTERNS = [
    ("recipe", re.compile(r"^/recipes/")),
    ("article", re.compile(r"^/(guides|idees)/")),
    ("static", re.compile(r"^/?(about|privacy|terms)?$")),
]
# CoverageState Google = "indexé"
INDEXED_STATE = "PageWithIndex"
# lien UI GSC : ouvre l'URL Inspection de la page (pour les clics Request Indexing)
def gsc_inspect_link(url: str) -> str:
    return (
        "https://search.google.com/search-console/inspect?resource_id="
        + urllib.parse.quote(SITE_URL, safe="")
        + "&url="
        + urllib.parse.quote(url, safe="")
    )


def classify_url(path: str) -> str:
    for label, pattern in TYPE_PATTERNS:
        if pattern.search(path):
            return label
    return "static"


def fetch_sitemap_urls() -> list[str]:
    req = urllib.request.Request(SITEMAP_URL, headers={"User-Agent": "Mozilla/5.0 (indexation-audit)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode()
    urls = _LOC_RE.findall(body)
    if not urls:
        raise RuntimeError(f"Sitemap vide ou illisible : {SITEMAP_URL}")
    return urls


def inspect_google(urls: list[str], limit: int | None, delay: float = 1.0) -> list[dict]:
    if limit:
        urls = urls[:limit]
    sys.path.insert(0, str(sorted(PLUGIN_ROOT.glob("*/scripts"))[-1]))
    import gsc_inspect  # noqa: E402

    result = gsc_inspect.batch_inspect(urls, SITE_URL, delay=delay)
    print(f"[google] {result['total']} inspectées — summary: {result['summary']}", file=sys.stderr)
    return result["results"]


def google_status(item: dict) -> str:
    """→ 'indexed' | 'not_indexed' | 'unknown'"""
    if item.get("error"):
        return "unknown"
    state = (item.get("index_status") or {}).get("coverage_state")
    if state == INDEXED_STATE:
        return "indexed"
    if state:
        return "not_indexed"
    return "unknown"


def bing_status(url: str) -> str | None:
    """None = pas configuré (Task 3). 'indexed' | 'not_indexed' | 'unknown' sinon."""
    return None


def write_report(urls: list[str], google_results: list[dict], bing_results: dict[str, str]) -> tuple[Path, Path]:
    rows = []
    for url in urls:
        g = next((r for r in google_results if r.get("url") == url), None)
        gs = google_status(g) if g else "unknown"
        bs = bing_results.get(url) or "—"
        rows.append(
            {
                "url": url,
                "type": classify_url(urllib.parse.urlparse(url).path),
                "google": gs,
                "google_detail": (g or {}).get("index_status") or {},
                "bing": bs,
            }
        )

    by_type: dict[str, list[dict]] = {}
    for r in rows:
        by_type.setdefault(r["type"], []).append(r)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    md_path = REPORTS_DIR / f"indexation-{today}.md"
    json_path = REPORTS_DIR / "indexation-last.json"

    lines = [f"# Rapport indexation — {today}", "", "| Type | Total | ✅ indexée | ❌ non indexée | ❓ inconnu |", "|---|---|---|---|---|"]
    for t in ("recipe", "article", "static"):
        rs = by_type.get(t, [])
        total = len(rs)
        ok = sum(1 for r in rs if r["google"] == "indexed")
        ko = sum(1 for r in rs if r["google"] == "not_indexed")
        unk = sum(1 for r in rs if r["google"] == "unknown")
        lines.append(f"| {t} | {total} | {ok} | {ko} | {unk} |")
    lines.append("")
    lines.append("## URLs non indexées (Google) — cliquer Request Indexing dans GSC")
    for r in rows:
        if r["google"] != "indexed":
            lines.append(f"- [{r['url']}]({r['url']}) — {r['google']} · [GSC UI]({gsc_inspect_link(r['url'])}) · Bing: {r['bing']}")
    lines.append("")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    json_path.write_text(
        json.dumps({"date": today, "rows": rows}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return md_path, json_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit indexation Google + Bing")
    parser.add_argument("--limit", type=int, help="Limiter l'inspection Google à N URLs (test)")
    args = parser.parse_args()

    urls = fetch_sitemap_urls()
    print(f"[audit] {len(urls)} URLs dans le sitemap")
    for label in ("recipe", "article", "static"):
        n = sum(1 for u in urls if classify_url(urllib.parse.urlparse(u).path) == label)
        print(f"[audit]   {label}: {n}")

    google_results = inspect_google(urls, args.limit)
    bing_results = {u: s for u, s in ((u, bing_status(u)) for u in urls) if s}
    md_path, json_path = write_report(urls, google_results, bing_results)
    print(f"[audit] rapport : {md_path}")
    print(f"[audit] json   : {json_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `~/.local/share/claude-seo/.venv/bin/python -m py_compile scripts/indexation-audit.py`
Expected: exit 0, aucun message.

- [ ] **Step 3: Smoke test — 3 URLs**

Run: `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py --limit 3`
Expected:
- `[audit] 93 URLs dans le sitemap` puis `recipe: 66`, `article: 23`, `static: 4`
- `[google] 3 inspectées — summary: {...}` (pass ≥ 2 attendu)
- `[audit] rapport : repports/indexation-2026-08-14.md` + json
- Vérifier que le rapport a 3 lignes dont `whole30-chicken-skillet-tomatoes-garlic` en ✅ ou ❌ selon l'état réel (ne pas inventer)

- [ ] **Step 4: Audit complet (93 URLs)**

Run: `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py`
Expected: 93 inspectées (~2-3 min avec le delay de 1 s), résumé cohérent. Le rapport complet `repports/indexation-2026-08-14.md` liste toutes les non-indexées avec liens GSC UI.

- [ ] **Step 5: Vérifier l'honnêteté du rapport**

Run: `grep -c "GSC UI" repports/indexation-2026-08-14.md` puis lire la section "URLs non indexées"
Expected: le compte `ok` de chaque type + les lignes ❌ correspondent à l'état réel (pas de faux ✅ : une URL avec `error` doit être ❓, pas ✅). Lire le JSON si doute.

- [ ] **Step 6: Commit**

```bash
git add scripts/indexation-audit.py
git commit -m "feat(indexation): script d'audit Google — sitemap → inspect batch → rapport markdown+JSON

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: IndexNow — clé, fichier public, hook étendu (Phase C)

**Files:**
- Create: `public/<INDEXNOW_KEY>.txt` (clé générée)
- Create: `scripts/indexnow-hook.py`
- Modify: `.env.local` (append `INDEXNOW_KEY=...` et `INDEXNOW_KEY_LOCATION=...`)
- Modify: `scripts/hook-ping-sitemap.sh` (append bloc IndexNow)

**Interfaces:**
- Consumes: plugin `indexnow_submit.py` → `submit(host, key, key_location, urls) -> {"ok", "status_code", "submitted", ...}` (POST `https://api.indexnow.org/indexnow`, batch ≤ 10000, clé 8-128 chars) et `verify_key_published(host, key, key_location)`
- Produces: hook étendu qui pousse les 93 URLs du sitemap à IndexNow après chaque push ; `.env.local` lu par `scripts/indexnow-hook.py`.

- [ ] **Step 1: Générer la clé et créer le fichier public**

Run: `KEY=$(openssl rand -hex 24) && echo "$KEY" > /tmp/indexnow-key.txt && echo "KEY=$KEY"`
Expected: 48 caractères hex. **Ne pas afficher la clé dans le repo/commit** — elle va dans `.env.local` (non committé) et dans le nom du fichier `public/`.

```bash
KEY=$(cat /tmp/indexnow-key.txt)
cp /tmp/indexnow-key.txt "public/${KEY}.txt"
chmod 644 "public/${KEY}.txt"
grep -q "^INDEXNOW_KEY=" .env.local || echo -e "INDEXNOW_KEY=${KEY}\nINDEXNOW_KEY_LOCATION=https://www.chefaugustin.com/${KEY}.txt" >> .env.local
```
Expected: `public/<48-hex>.txt` contient la clé ; `.env.local` a les 2 lignes.

- [ ] **Step 2: Écrire `scripts/indexnow-hook.py`**

```python
#!/usr/bin/env python3
"""
Soumission IndexNow post-push — 2026-08-14.

Lit .env.local (INDEXNOW_KEY / INDEXNOW_KEY_LOCATION), fetch le sitemap prod,
soumet toutes les URLs via indexnow_submit.py (plugin claude-seo).
Non-bloquant : exit 0 même en cas d'échec (le push ne doit pas casser).
"""
import re
import sys
import urllib.request
from pathlib import Path

SITEMAP_URL = "https://www.chefaugustin.com/sitemap.xml"
ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env.local"
PLUGIN_ROOT = Path.home() / ".claude/plugins/cache/agricidaniel-claude-seo/claude-seo"
_LOC_RE = re.compile(r"<loc>(.*?)</loc>")


def load_env(path: Path) -> dict[str, str]:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> int:
    env = load_env(ENV_PATH)
    key = env.get("INDEXNOW_KEY")
    key_location = env.get("INDEXNOW_KEY_LOCATION")
    if not key or not key_location:
        print("[indexnow] INDEXNOW_KEY / INDEXNOW_KEY_LOCATION absents de .env.local — skip")
        return 0

    req = urllib.request.Request(SITEMAP_URL, headers={"User-Agent": "Mozilla/5.0 (indexnow-hook)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        urls = _LOC_RE.findall(resp.read().decode())
    if not urls:
        print("[indexnow] sitemap vide — skip")
        return 0

    sys.path.insert(0, str(sorted(PLUGIN_ROOT.glob("*/scripts"))[-1]))
    import indexnow_submit  # noqa: E402

    result = indexnow_submit.submit(
        host="chefaugustin.com", key=key, key_location=key_location, urls=urls
    )
    status = "OK" if result.get("ok") else "FAIL"
    print(f"[indexnow] {status} — {result.get('submitted', 0)} URLs → {result.get('endpoint')}")
    if not result.get("ok"):
        print(f"[indexnow] détail: {result.get('error')} {result.get('response_body_preview', '')[:120]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Étendre `scripts/hook-ping-sitemap.sh`**

Après le bloc existant `ping-sitemap` (qui se termine par `fi`), ajouter :

```bash
# IndexNow : soumission des URLs du sitemap (Bing/Seznam/Naver/Yandex/Yep)
if [ -x "$VENV_PY" ] && [ -f "${PWD}/scripts/indexnow-hook.py" ]; then
  "$VENV_PY" "${PWD}/scripts/indexnow-hook.py" >> "$LOG_DIR/ping-sitemap.log" 2>&1
  echo "indexnow ping → $LOG_DIR/ping-sitemap.log"
fi
```

Expected: `bash -n scripts/hook-ping-sitemap.sh` passe (exit 0).

- [ ] **Step 4: Commit + push (déploie le fichier clé + le hook)**

```bash
git add public/*.txt scripts/indexnow-hook.py scripts/hook-ping-sitemap.sh
git commit -m "feat(indexnow): clé + fichier public + hook post-push (soumission sitemap après chaque push)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```
Expected: le hook s'exécute (log `~/.claude/logs/ping-sitemap.log`) — l'entrée `[indexnow] OK — 93 URLs` doit y apparaître (attendre ~1 min après le push, le hook dort 30 s pour le redeploy).

- [ ] **Step 5: Vérifier la clé servie en prod + pré-flight IndexNow**

Run: `curl -s "https://www.chefaugustin.com/$(grep INDEXNOW_KEY .env.local | head -1 | cut -d= -f2).txt" | head -1`
Expected: la clé (48 hex) — jusqu'à 3 min après le push (redeploy Hostinger).

Run (pré-flight officiel du plugin) :
`~/.local/share/claude-seo/.venv/bin/python ~/.claude/plugins/cache/agricidaniel-claude-seo/claude-seo/2.2.4/scripts/indexnow_submit.py --host chefaugustin.com --verify-only`
Expected: `Key verification: OK` (la clé est lue depuis `.env.local` ? NON — les env vars ne sont pas chargées par le shell. Passer `--key` et `--key-location` en arguments explicites, lus depuis `.env.local` via `grep`, OU `export INDEXNOW_KEY=$(grep ...)` d'abord. Le plus simple : les 2 exports dans la même commande.)

- [ ] **Step 6: Vérifier le log du hook**

Run: `tail -20 ~/.claude/logs/ping-sitemap.log`
Expected: lignes `[ping] sitemap ...` (existant) et `[indexnow] OK — 93 URLs` (nouveau). Si FAIL : lire le détail, corriger, re-push.

---

### Task 3: Bing API — statut URLs + soumission sitemap (Phase C')

> **RULING (14/08, découverte API faite avant dispatch)** : sondage live avec la clé BWT → `GetUrlSubmissionStatus`, `GetUrlSubmissionStatusByPage`, `SubmitSitemap`, `GetSitemaps` renvoient tous « Endpoint not found » sur `ssl.bing.com/webmaster/api.svc/json` (seul `GetLinkCounts` existe). Repli spec appliqué : pas d'appel API Bing dans l'audit (colonne « — »), preuve par IndexNow + sitemap soumis (fait par l'utilisateur dans l'UI BWT). Clé configurée (`~/.config/claude-seo/backlinks-api.json`). Étapes 1-6 de cette tâche : couvertes (key, discovery, sitemap UI). Reste : aucune modification de code (le stub `bing_status` → None est déjà correct).

**Files:**
- Create: `~/.config/claude-seo/backlinks-api.json` (HORS repo — clé API BWT fournie par l'utilisateur) — **fait**
- Modify: `scripts/indexation-audit.py` (fonction `bing_status` réelle) — **annulé (repli)**

**Interfaces:**
- Consumes: clé API BWT (fournie par l'utilisateur, page API Access), base `https://ssl.bing.com/webmaster/api.svc/json` + param `apikey` (pattern du plugin `bing_webmaster.py`)
- Produces: colonne Bing remplie dans le rapport d'audit ; sitemap soumis à Bing.

- [ ] **Step 1: (Utilisateur) Récupérer la clé API BWT**

L'utilisateur : BWT → API Access → copier la clé. **Blocage externe : cette étape attend la clé.**

- [ ] **Step 2: Configurer la clé dans le plugin**

```bash
mkdir -p ~/.config/claude-seo
# si backlinks-api.json n'existe pas :
echo '{"bing_api_key": "CLÉ_ICI"}' > ~/.config/claude-seo/backlinks-api.json
# sinon : ajouter la clé au fichier existant (jq si présent, sinon édition manuelle)
chmod 600 ~/.config/claude-seo/backlinks-api.json
```
Expected: `~/.config/claude-seo/backlinks-api.json` contient `bing_api_key` ; jamais dans le repo (vérifier `git status` sans ce fichier).

- [ ] **Step 3: Découverte — forme réelle de GetUrlSubmissionStatus**

Run (1 URL test) :
```bash
KEY=$(grep -oP '"bing_api_key":\s*"\K[^"]+' ~/.config/claude-seo/backlinks-api.json)
curl -s "https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionStatus?siteUrl=https%3A%2F%2Fwww.chefaugustin.com&url=https%3A%2F%2Fwww.chefaugustin.com%2F&apikey=${KEY}"
```
Expected: réponse JSON — **noter la forme exacte** (ex. `{"d": {...}}` ou `{"UrlStatus": "Indexed", ...}`). Si 404/erreur, tester `https://www.chefaugustin.com` sans scheme en siteUrl, et `GetUrlSubmissionStatusByPage`. **C'est la vérification qui détermine le parsing — ne pas inventer les champs.**

- [ ] **Step 4: Implémenter `bing_status()` dans l'audit**

Remplacer le stub par le vrai appel (en utilisant la forme découverte au Step 3) :

```python
def bing_status(url: str) -> str | None:
    """'indexed' | 'not_indexed' | 'unknown' | None si pas de clé configurée."""
    import json
    from pathlib import Path
    import urllib.parse
    import urllib.request

    cfg_path = Path.home() / ".config/claude-seo/backlinks-api.json"
    if not cfg_path.exists():
        return None
    cfg = json.loads(cfg_path.read_text())
    api_key = cfg.get("bing_api_key")
    if not api_key:
        return None
    params = urllib.parse.urlencode(
        {
            "siteUrl": SITE_HOST,
            "url": url,
            "apikey": api_key,
        }
    )
    try:
        req = urllib.request.Request(
            f"https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionStatus?{params}",
            headers={"User-Agent": "Mozilla/5.0 (indexation-audit)"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        # ADAPTER au format réel découvert au Step 3 (ex: data.get("UrlStatus"))
        return "unknown"
    except Exception as exc:  # noqa: BLE001 — réseau/API → inconnu, pas bloquant
        print(f"[bing] {url}: {exc}", file=sys.stderr)
        return "unknown"
```

⚠️ Le retour final du mapping (`indexed`/`not_indexed`) est **adapté au format observé au Step 3** — la spec exige la confirmation avant le parsing final.

- [ ] **Step 5: Vérifier sur 1 URL puis re-audit complet**

Run: `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py --limit 1`
Expected: le rapport contient une ligne avec colonne Bing ≠ "—" (indexed/not_indexed/unknown).

Run (complet) : `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py`
Expected: toutes les lignes du rapport ont une valeur Bing ; résumé honnête.

- [ ] **Step 6: Soumettre le sitemap à Bing via API**

Run:
```bash
KEY=$(grep -oP '"bing_api_key":\s*"\K[^"]+' ~/.config/claude-seo/backlinks-api.json)
curl -s "https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap?siteUrl=https%3A%2F%2Fwww.chefaugustin.com&sitemapUrl=https%3A%2F%2Fwww.chefaugustin.com%2Fsitemap.xml&apikey=${KEY}"
```
Expected: réponse indiquant la soumission (vérifier aussi dans l'UI BWT → Sitemaps). Si l'endpoint échoue : le sitemap est déjà découvert via robots.txt (déjà en place) — le noter, ne pas bloquer.

- [ ] **Step 7: Commit (audit seulement — la clé est hors repo)**

```bash
git add scripts/indexation-audit.py
git commit -m "feat(indexation): statut URLs Bing via API BWT dans l'audit + sitemap soumis

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Re-crawl Google — clics UI GSC (Phase B, humain)

**Files:**
- Aucun fichier (action utilisateur guidée par le rapport)

**Interfaces:**
- Consumes: `repports/indexation-2026-08-14.md` — section "URLs non indexées (Google)" avec liens GSC UI

- [ ] **Step 1: (Utilisateur) Cliquer Request Indexing**

Ouvrir chaque lien `[GSC UI]` du rapport → bouton **Request Indexing** dans l'URL Inspection → attendre le retour "Google a bien reçu votre demande".
Expected: chaque URL non indexée du rapport a reçu un Request Indexing (5-10 clics typiques).

- [ ] **Step 2: Re-audit après 5-7 jours**

Run: `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py`
Expected: le nombre de ❌ diminue ; les pages passées en Request Indexing sont ✅ ou encore "pending" (ne pas conclure trop tôt — Google recrawl en 3-14 jours).

- [ ] **Step 3: Itérer si nécessaire**

Si des URLs restent non indexées après 14 jours : vérifier robots.txt/canonical/noindex sur ces pages (via le rapport `google_detail`), corriger, re-push (le hook ping aidera), re-cliquer.

---

### Task 5: Phase D — suivi et décision cron

**Files:**
- Aucun fichier (décision opérationnelle)

- [ ] **Step 1: État final**

Run: `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py`
Expected: ~0 pages non indexées côté Google (après les itérations Task 4) ; Bing colonne remplie.

- [ ] **Step 2: Décision cron (avec l'utilisateur)**

Option A : cron hebdo (ex. dimanche 09:15) :
`15 9 * * 0 ~/.local/share/claude-seo/.venv/bin/python /home/user/ai-blog-builder/scripts/indexation-audit.py >> ~/.claude/logs/indexation-audit.log 2>&1`
Option B : on-demand (recommandé si le contenu ne change pas chaque semaine).
Expected: choix acté avec l'utilisateur, pas de cron silencieux.

---

## Self-Review (faites pendant la rédaction)

- **Spec coverage** : §4.1 audit ✅ (Task 1) · §4.2 clics UI ✅ (Task 4) · §4.3 IndexNow ✅ (Task 2) · §4.4 Bing ✅ (Task 3) · §5 flux ✅ · §6 erreurs ✅ (stubs honnêtes, non-bloquant) · §7 critères ✅ (Task 1 Step 4/5, Task 3 Step 5, Task 5) · §8 hors périmètre respecté (pas de cron sans décision, pas d'Indexing API).
- **Placeholders** : aucun "TBD" — les 2 seuls points d'adaptation (format GetUrlSubmissionStatus, endpoint SubmitSitemap) sont des étapes de découverte explicites avec vérification obligatoire avant parsing (règle d'exactitude : ne pas inventer).
- **Consistance types** : `classify_url` / `google_status` / `bing_status` / `write_report` — mêmes signatures entre Task 1 et Task 3 ; `indexnow-hook.py` réutilise `indexnow_submit.submit(host, key, key_location, urls)` (signature vérifiée dans le plugin) ; `gsc_inspect.batch_inspect(urls, site_url, delay)` (vérifié).
