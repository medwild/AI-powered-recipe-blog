#!/usr/bin/env python3
"""
Ping sitemap + soumission GSC — 2026-08-08 (fix indexation auto).

Usage :
  CLAUDE_SEO_PYTHON=<python> python3 scripts/ping-sitemap.py [--property sc-domain:chefaugustin.com]

- Ping HTTP du sitemap (vérifie 200 + lastmod frais)
- Soumission via l'API GSC Sitemaps (service account du plugin claude-seo)
  — légal, aucun usage restreint (contrairement à l'Indexing API réservé
    JobPosting/VideoObject/BroadcastEvent)

Le sitemap est force-dynamic avec lastmod = updatedAt → soumettre après
chaque deploy incite Google à recrawler les URLs modifiées.
"""
import json
import os
import sys
import urllib.request
import urllib.error

CONFIG_PATH = os.path.expanduser("~/.config/claude-seo/google-api.json")
SITEMAP_URL = "https://www.chefaugustin.com/sitemap.xml"
SCOPE = "https://www.googleapis.com/auth/webmasters"


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def get_service_account_credentials(scopes: list):
    """Réutilise la logique du plugin claude-seo (google_auth.py)."""
    from google.oauth2 import service_account

    config = load_config()
    sa_path = os.path.expanduser(config.get("service_account_path") or "")
    if not sa_path or not os.path.exists(sa_path):
        raise FileNotFoundError(f"Service account introuvable : {sa_path}")
    return service_account.Credentials.from_service_account_file(
        sa_path, scopes=scopes
    )


def ping_sitemap():
    try:
        req = urllib.request.Request(SITEMAP_URL, headers={"User-Agent": "Mozilla/5.0 (sitemap-ping)"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            n = body.count("<loc>")
            lastmod = body.count("<lastmod>")
            print(f"[ping] sitemap {resp.status} — {n} URLs, {lastmod} lastmod")
            return n > 0
    except urllib.error.HTTPError as e:
        print(f"[ping] ERREUR HTTP {e.code}")
        return False
    except Exception as e:
        print(f"[ping] ERREUR {e}")
        return False


def submit_to_gsc(credentials, property_name):
    from googleapiclient.discovery import build
    service = build("webmasters", "v3", credentials=credentials)

    # GSC sitemaps API : feedpath = URL complète du sitemap (doc : ex. "http://www.example.com/sitemap.xml")
    feed_path = SITEMAP_URL
    try:
        # API GSC sitemaps : submit() — idempotent, aucun usage restreint
        result = service.sitemaps().submit(
            siteUrl=property_name, feedpath=feed_path
        ).execute()
        print(f"[gsc] soumission OK : {json.dumps(result, default=str)[:200]}")
        return True
    except Exception as e:
        print(f"[gsc] soumission échec : {e}")
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Ping sitemap + soumission GSC")
    parser.add_argument("--property", default="sc-domain:chefaugustin.com")
    args = parser.parse_args()

    if not ping_sitemap():
        print("Sitemap injoignable — abandon")
        sys.exit(1)

    try:
        creds = get_service_account_credentials([SCOPE])
        if submit_to_gsc(creds, args.property):
            print("✅ Sitemap soumis à GSC — Google recrawlera les URLs modifiées")
            sys.exit(0)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Échec auth/soumission : {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
