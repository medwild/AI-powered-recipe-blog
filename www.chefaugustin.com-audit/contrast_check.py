#!/usr/bin/env python3
"""Resolve lab/oklch colors to sRGB via canvas and compute contrast; inspect fixed bottom bar + theme toggle."""
import json
from playwright.sync_api import sync_playwright

def contrast(rgb1, rgb2):
    def lum(rgb):
        c = [x / 255 for x in rgb]
        c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    l1, l2 = lum(rgb1), lum(rgb2)
    if l1 < l2: l1, l2 = l2, l1
    return round((l1 + 0.05) / (l2 + 0.05), 2)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/nix/store/7xr3qnq93srn4dgak7qw74dw836wpp1y-chromium-138.0.7204.49/bin/chromium", args=["--no-sandbox","--disable-dev-shm-usage"])
    results = {}
    for pname, url in [("home", "https://www.chefaugustin.com/"),
                       ("recipe", "https://www.chefaugustin.com/recipes/easy-chicken-rice-bowls-for-two")]:
        for scheme in ["light", "dark"]:
            page = browser.new_page(viewport={"width": 390, "height": 844}, color_scheme=scheme)
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(9000)
            data = page.evaluate("""() => {
              const cv = document.createElement('canvas'); cv.width = cv.height = 1;
              const cx = cv.getContext('2d', {willReadFrequently: true});
              const resolve = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = c; cx.fillRect(0,0,1,1); return [...cx.getImageData(0,0,1,1).data.slice(0,3)]; };
              const out = {htmlClass: document.documentElement.className, htmlStyle: document.documentElement.getAttribute('style'), checks: [], themeToggles: []};
              const bgOf = (el) => { let n = el; while (n) { const b = getComputedStyle(n).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b; n = n.parentElement; } return 'rgb(255,255,255)'; };
              const els = [...document.querySelectorAll('h1,h2,h3,p,button,a,span')].filter(e => {
                const r = e.getBoundingClientRect(); return r.width > 20 && r.top < 1000 && r.top > 0;
              }).slice(0, 14);
              for (const e of els) {
                try {
                  const fg = getComputedStyle(e).color, bg = bgOf(e);
                  out.checks.push({tag: e.tagName, text: (e.textContent||'').trim().slice(0,35), fg, bg, fgrgb: resolve(fg), bgrgb: resolve(bg), fs: getComputedStyle(e).fontSize});
                } catch (err) {}
              }
              // theme toggle?
              for (const b of document.querySelectorAll('button, [role=switch], [aria-label]')) {
                const lbl = (b.getAttribute('aria-label')||'') + ' ' + (b.textContent||'').trim();
                if (/theme|dark|light|mode/i.test(lbl)) out.themeToggles.push({cls: String(b.className).slice(0,50), label: lbl.slice(0,40)});
              }
              // fixed bottom bar
              for (const el of document.querySelectorAll('*')) {
                const s = getComputedStyle(el);
                if (s.position === 'fixed' && parseFloat(s.bottom) === 0 && el.getBoundingClientRect().height > 20) {
                  const r = el.getBoundingClientRect();
                  out.bottomBar = {cls: String(el.className).slice(0,60), h: Math.round(r.height), text: (el.textContent||'').trim().slice(0,60)};
                  break;
                }
              }
              return out;
            }""")
            results[f"{pname}_{scheme}"] = data
            page.close()
    for k, v in results.items():
        print("==", k)
        print("  html:", v["htmlClass"][:80], "|", v["htmlStyle"])
        print("  toggles:", json.dumps(v.get("themeToggles", [])))
        print("  bottomBar:", json.dumps(v.get("bottomBar")))
        for c in v.get("checks", [])[:14]:
            try:
                ratio = contrast(c["fgrgb"], c["bgrgb"])
                print(f"   {c['tag']:4} {c['fs']:>6}  ratio {ratio:5}  fg {c['fg']} on {c['bg'][:30]:30}  {c['text']}")
            except Exception:
                print("   ERR", c)
    browser.close()
