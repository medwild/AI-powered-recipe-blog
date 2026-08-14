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
    ("recipe", re.compile(r"^/recipes(?:/|$)")),
    ("article", re.compile(r"^/(?:guides|idees)(?:/|$)")),
    ("static", re.compile(r"^/?(?:about|privacy|terms)?$")),
]
# CoverageState Google (URL Inspection API — valeurs humaines observées 2026-08-14 :
# "Submitted and indexed" → indexée ; "Discovered - currently not indexed" → non indexée.
# L'API renvoie ces libellés, pas l'enum "PageWithIndex" des docs.)
INDEXED_STATES = {"Submitted and indexed", "Crawled and indexed", "PageWithIndex"}
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
    if state in INDEXED_STATES:
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
