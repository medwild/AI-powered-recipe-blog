#!/usr/bin/env python3
"""Check dark-mode support in CSS and recipe page top structure."""
import json, re
from playwright.sync_api import sync_playwright

URL = "https://www.chefaugustin.com/recipes/easy-chicken-rice-bowls-for-two"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/nix/store/7xr3qnq93srn4dgak7qw74dw836wpp1y-chromium-138.0.7204.49/bin/chromium", args=["--no-sandbox","--disable-dev-shm-usage"])
    # 1) CSS scan for dark mode
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("https://www.chefaugustin.com/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(9000)
    css_texts = page.evaluate("""() => {
      const out = [];
      for (const s of document.querySelectorAll('link[rel=stylesheet], style')) {
        out.push(s.textContent || '');
      }
      return out.join('\\n');
    }""")
    print("CSS bytes scanned:", len(css_texts))
    for pat in ["prefers-color-scheme", "class=\"dark", "\.dark", "darkMode", "dark-mode", "color-scheme"]:
        hits = [m.start() for m in re.finditer(re.escape(pat), css_texts)]
        print(f"  pattern {pat!r}: {len(hits)} hits")
    # any style with @media (prefers-color-scheme
    media = re.findall(r"@media[^{]*prefers-color-scheme[^{]*\{", css_texts)
    print("  prefers-color-scheme media blocks:", len(media))
    m = re.search(r"@media[^}]*prefers-color-scheme[^}]*\}", css_texts)
    if m:
        print("  sample:", m.group(0)[:200])

    # check html tag + theme-related scripts on live page
    html_info = page.evaluate("""() => ({
      htmlClass: document.documentElement.className,
      htmlStyle: document.documentElement.getAttribute('style'),
      themeScript: [...document.scripts].filter(s => /theme|dark|color-scheme/i.test(s.textContent || '')).map(s => (s.textContent||'').slice(0,200)),
    })""")
    print("HTML:", json.dumps(html_info)[:400])

    # 2) recipe page top structure (desktop): what sits above H1 at 1301px?
    page.goto(URL, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(9000)
    top = page.evaluate("""() => {
      const vh = window.innerHeight;
      const out = [];
      for (const el of document.querySelectorAll('main img, main div, main h1, main h2, main a, main p')) {
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.width > 50) {
          out.push({tag: el.tagName, cls: String(el.className).slice(0,45), top: Math.round(r.top), h: Math.round(r.height),
                    text: (el.textContent||'').trim().slice(0,50)});
        }
      }
      return out.slice(0, 20);
    }""")
    print("RECIPE DESKTOP ABOVE-FOLD DOM:")
    for t in top:
        print(" ", t)

    # hero image dimensions on recipe page
    hero = page.evaluate("""() => {
      const imgs = [...document.querySelectorAll('main img')].map(i => {
        const r = i.getBoundingClientRect();
        return {src: (i.currentSrc||i.src||'').split('/').slice(-1)[0], w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), loaded: i.complete && i.naturalWidth > 0};
      });
      return imgs.slice(0, 5);
    }""")
    print("RECIPE IMGS:", json.dumps(hero))

    # mobile home: what's the first recipe card position + hero structure
    m = browser.new_page(viewport={"width": 390, "height": 844})
    m.goto("https://www.chefaugustin.com/", wait_until="domcontentloaded", timeout=45000)
    m.wait_for_timeout(9000)
    mob = m.evaluate("""() => {
      const out = [];
      for (const el of document.querySelectorAll('main > *, main section, main div')) {
        const r = el.getBoundingClientRect();
        if (r.top < 1500 && r.width > 300) out.push({tag: el.tagName, cls: String(el.className).slice(0,50), top: Math.round(r.top), h: Math.round(r.height)});
      }
      const cards = [...document.querySelectorAll('a[href*="/recipes/"]')].map(a => {
        const r = a.getBoundingClientRect();
        return {text: (a.textContent||'').trim().slice(0,30), top: Math.round(r.top), h: Math.round(r.height)};
      }).slice(0, 4);
      const heroImg = document.querySelector('main img, header img, [class*=hero] img');
      let heroInfo = null;
      if (heroImg) { const r = heroImg.getBoundingClientRect(); heroInfo = {top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), src: (heroImg.currentSrc||heroImg.src||'').slice(-60)}; }
      return {sections: out.slice(0, 14), cards, heroImg: heroInfo, navH: (document.querySelector('header, nav')?.getBoundingClientRect().height)};
    }""")
    print("MOBILE HOME STRUCTURE:", json.dumps(mob)[:1200])
    browser.close()
