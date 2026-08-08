# Scripts utilitaires

## ping-sitemap.py — indexation auto (2026-08-08)
Ping le sitemap + soumission GSC (Sitemaps API, service account du plugin
claude-seo — aucun usage restreint, contrairement à l'Indexing API).

```bash
~/.local/share/claude-seo/.venv/bin/python scripts/ping-sitemap.py
# [ping] sitemap 200 — 94 URLs, 94 lastmod
# ✅ Sitemap soumis à GSC — Google recrawlera les URLs modifiées
```

À lancer après chaque deploy (le sitemap est force-dynamic, lastmod = updatedAt
→ Google recrawle les URLs modifiées). Note : utiliser le venv du plugin
claude-seo (google-api-python-client installé là).
