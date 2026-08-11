#!/usr/bin/env python3
"""
Deep DOM audit for one real page (post-challenge) + raw HTML capture of
additional recipe pages via in-page fetch (cookies solve the challenge).

Dumps: paint entries, LCP element, link tags, script tags, img tags,
@font-face blocks + font-display, inline styles, and saves raw HTML of
N additional recipe URLs.

Usage: python deep_audit.py <url> <out_dir> <additional_urls_json>
"""
import asyncio
import json
import re
import sys
from urllib.parse import urljoin

from playwright.async_api import async_playwright

URL = sys.argv[1]
OUT_DIR = sys.argv[2]
EXTRA = sys.argv[3] if len(sys.argv) > 3 else None

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)


def is_challenge(page):
    try:
        return page.evaluate(
            "() => !!document.querySelector('.container h1') && document.body.innerText.includes('Checking your browser')"
        )
    except Exception:
        return True


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900}, user_agent=UA)
        page = await context.new_page()

        await page.goto(URL, wait_until="domcontentloaded", timeout=90000)
        for _ in range(40):
            try:
                if not await is_challenge(page):
                    break
            except Exception:
                pass
            await page.wait_for_timeout(500)
        try:
            await page.wait_for_load_state("networkidle", timeout=45000)
        except Exception:
            pass
        await page.wait_for_timeout(1500)

        audit = await page.evaluate(
            """() => {
      const out = {};
      out.paint = performance.getEntriesByType('paint').map(e => ({ name: e.name, start: Math.round(e.startTime) }));
      out.url = location.href;
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcpE = lcpEntries[lcpEntries.length - 1];
      if (lcpE) {
        const el = lcpE.element || null;
        out.lcp = { time: Math.round(lcpE.startTime), size: lcpE.size, tag: el ? el.tagName : null, id: el ? el.id : null, cls: el ? el.className : null, src: el && el.currentSrc ? el.currentSrc : null, srcset: el ? el.getAttribute('srcset') : null, dims: el ? [el.getAttribute('width'), el.getAttribute('height')] : null };
      } else out.lcp = null;
      out.links = [...document.querySelectorAll('link')].map(l => ({ rel: l.rel, href: l.href, as: l.getAttribute('as'), type: l.type, media: l.media, crossorigin: l.crossOrigin, fetchpriority: l.getAttribute('fetchpriority') }));
      out.scripts = [...document.querySelectorAll('script')].map(s => ({ src: s.src, async: s.async, defer: s.defer, inline: !s.src, len: s.src ? 0 : s.textContent.length }));
      out.imgs = [...document.querySelectorAll('img')].map(i => ({ src: i.currentSrc || i.src, srcset: i.getAttribute('srcset'), sizes: i.getAttribute('sizes'), width: i.getAttribute('width'), height: i.getAttribute('height'), loading: i.getAttribute('loading'), fetchpriority: i.getAttribute('fetchpriority'), alt: i.alt, format: (i.currentSrc || i.src).split('.').pop().split('?')[0].toLowerCase() }));
      out.styles = [...document.querySelectorAll('style')].map(s => s.textContent.length);
      out.fontfaces = [...document.fonts].map(f => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
      const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n');
      out.font_display = [...css.matchAll(/@font-face\\s*{([^}]*)}/g)].map(m => {
        const block = m[1];
        const get = (k) => { const mm = block.match(new RegExp(k + '\\\\s*:\\\\s*([^;]+);')); return mm ? mm[1].trim() : null; };
        return { family: get('font-family'), src: get('src') ? get('src').slice(0, 120) : null, display: get('font-display'), weight: get('font-weight') };
      });
      out.html_len = document.documentElement.outerHTML.length;
      return out;
    }"""
        )

        extra = []
        if EXTRA:
            extra = json.load(open(EXTRA))
        for u in extra:
            try:
                r = await page.evaluate(
                    """async (u) => {
                      const res = await fetch(u, { credentials: 'same-origin' });
                      const t = await res.text();
                      return { status: res.status, len: t.length, body: t };
                    }""",
                    u,
                )
                name = re.sub(r"[^a-z0-9]+", "-", u.split("/")[-1].lower())
                with open(f"{OUT_DIR}/{name}.html", "w") as f:
                    f.write(r["body"])
                print(f"  saved {name}.html ({r['len']}B, status {r['status']})", flush=True)
            except Exception as e:
                print(f"  FAILED fetch {u}: {e}", flush=True)

        with open(f"{OUT_DIR}/deep_audit_{OUT_DIR.split('/')[-1]}.json", "w") as f:
            json.dump(audit, f, indent=1)
        print("audit:", json.dumps(audit, indent=1)[:6000])
        await browser.close()


asyncio.run(main())
