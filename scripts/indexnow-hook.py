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
