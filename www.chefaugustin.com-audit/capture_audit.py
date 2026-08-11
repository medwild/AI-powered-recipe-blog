#!/usr/bin/env python3
"""Capture + analyze chefaugustin.com pages at desktop 1440x900 and mobile 390x844."""
import json, os, sys, time
from playwright.sync_api import sync_playwright

OUT = "/home/user/ai-blog-builder/www.chefaugustin.com-audit/screenshots"
PAGES = {
    "home": "https://www.chefaugustin.com/",
    "recipe": "https://www.chefaugustin.com/recipes/easy-chicken-rice-bowls-for-two",
    "category": "https://www.chefaugustin.com/recipes/category/chicken",
    "cluster": "https://www.chefaugustin.com/recipes/cluster/one-pan-dinners-for-two",
}
VIEWPORTS = {"desktop": {"width": 1440, "height": 900}, "mobile": {"width": 390, "height": 844}}

def compute_contrast(rgb1, rgb2):
    def lum(rgb):
        c = [x / 255 for x in rgb]
        c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    l1, l2 = lum(rgb1), lum(rgb2)
    if l1 < l2: l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

def parse_color(s):
    s = s.strip()
    if s.startswith("rgb("):
        return tuple(int(x) for x in s[4:-1].split(",")[:3])
    if s.startswith("rgba("):
        return tuple(int(x) for x in s[5:-1].split(",")[:3])
    if s.startswith("#") and len(s) == 7:
        return tuple(int(s[i:i+2], 16) for i in (1, 3, 5))
    if s.startswith("#") and len(s) == 4:
        return tuple(int(s[i]*2, 16) for i in (1, 2, 3))
    return None

def analyze(page, ctx):
    """Run in-page analysis, return dict."""
    return page.evaluate("""(ctx) => {
      const out = {overflow: false, scrollWidth: 0, clientWidth: 0, tapTargetsSmall: [],
                   tinyText: [], fontInfo: {}, viewportMeta: null, h1: null,
                   aboveFold: {h1: null, ctas: [], cards: 0, imgs: 0}, headings: [],
                   links: 0, imgs: [], video: false};
      const de = document.documentElement, body = document.body;
      out.scrollWidth = de.scrollWidth; out.clientWidth = de.clientWidth;
      out.overflow = de.scrollWidth > de.clientWidth + 1;
      const vp = document.querySelector('meta[name="viewport"]');
      out.viewportMeta = vp ? vp.content : null;
      const cs = getComputedStyle(body);
      out.fontInfo = {baseFontSize: cs.fontSize, baseFontFamily: cs.fontFamily.split(',')[0],
                      bodyColor: cs.color, bgColor: cs.backgroundColor};
      // above the fold = within viewport height
      const vh = window.innerHeight;
      const inFold = (el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0 && r.width > 0; };
      const h1 = document.querySelector('h1');
      if (h1) {
        const r = h1.getBoundingClientRect();
        const c = getComputedStyle(h1);
        out.h1 = {text: h1.textContent.trim().slice(0,120), inFold: inFold(h1), fontSize: c.fontSize,
                  top: Math.round(r.top), color: c.color, fontWeight: c.fontWeight};
        out.aboveFold.h1 = out.h1;
      }
      // headings order
      document.querySelectorAll('h1,h2,h3,h4').forEach(h => {
        const r = h.getBoundingClientRect();
        out.headings.push({tag: h.tagName, text: h.textContent.trim().slice(0,60), top: Math.round(r.top), inFold: inFold(h)});
      });
      // CTAs: buttons + links with button-ish classes
      const ctas = [...document.querySelectorAll('a,button')].filter(a => {
        const t = (a.textContent||'').trim();
        return /jump|recipe|start|browse|view|explore|see|sign|subscribe|newsletter|pin/i.test(t) && t.length < 60;
      });
      ctas.forEach(c => { if (inFold(c)) out.aboveFold.ctas.push({text: c.textContent.trim().slice(0,40), top: Math.round(c.getBoundingClientRect().top)}); });
      // recipe card grid
      const cards = document.querySelectorAll('a[href*="/recipes/"]').length;
      out.aboveFold.cards = [...document.querySelectorAll('a[href*="/recipes/"]')].filter(inFold).length;
      out.aboveFold.imgs = [...document.querySelectorAll('img')].filter(inFold).length;
      // tap targets (mobile): links/buttons < 44px bounding box, excluding inline text links
      if (ctx.mobile) {
        [...document.querySelectorAll('a,button')].forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.top > vh) return;
          const c = getComputedStyle(el);
          if (c.display === 'inline' && !/button|pill|tag|chip/i.test(c.className || el.className)) return;
          if ((r.width < 44 || r.height < 44) && /btn|button|pill|chip|icon|nav|menu|close/i.test(el.className)) {
            out.tapTargetsSmall.push({tag: el.tagName, cls: String(el.className).slice(0,60), text: (el.textContent||'').trim().slice(0,20), w: Math.round(r.width), h: Math.round(r.height)});
          }
        });
      }
      // tiny text
      [...document.querySelectorAll('p,span,a,li,label')].forEach(el => {
        const c = getComputedStyle(el);
        const fs = parseFloat(c.fontSize);
        const r = el.getBoundingClientRect();
        if (fs < 12 && r.width > 0 && r.top < vh) out.tinyText.push({tag: el.tagName, cls: String(el.className).slice(0,50), fs: fs, text: (el.textContent||'').trim().slice(0,40)});
      });
      out.links = document.querySelectorAll('a').length;
      out.video = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
      return out;
    }""", ctx)

def run():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/nix/store/7xr3qnq93srn4dgak7qw74dw836wpp1y-chromium-138.0.7204.49/bin/chromium", args=["--no-sandbox","--disable-dev-shm-usage"])
        for pname, url in PAGES.items():
            for vname, vp in VIEWPORTS.items():
                c = browser.new_context(viewport=vp, device_scale_factor=1)
                if vname == "mobile":
                    c = browser.new_context(viewport=vp, device_scale_factor=2, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
                page = c.new_page()
                try:
                    page.goto(url, wait_until="networkidle", timeout=60000)
                except Exception as e:
                    print(f"WARN networkidle {pname}/{vname}: {e}", file=sys.stderr)
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    time.sleep(2)
                page.wait_for_timeout(1200)
                shot = os.path.join(OUT, f"{pname}_{vname}.png")
                page.screenshot(path=shot)
                data = analyze(page, {"mobile": vname == "mobile"})
                # contrast check for key text elements in view
                data["contrast"] = []
                sel = "h1, p, a, li, button"
                if vname == "mobile":
                    for el in page.query_selector_all("h1,h2,p,button")[:8]:
                        try:
                            c1 = el.evaluate("e => getComputedStyle(e).color")
                            bg = el.evaluate("e => { let n=e; while(n){const b=getComputedStyle(n).backgroundColor; if(b && b!=='rgba(0, 0, 0, 0)') return b; n=n.parentElement;} return 'rgb(255,255,255)'; }")
                            fg = parse_color(c1); bk = parse_color(bg)
                            if fg and bk:
                                cr = compute_contrast(fg, bk)
                                tag = el.evaluate("e => e.tagName")
                                txt = el.evaluate("e => (e.textContent||'').trim().slice(0,40)")
                                data["contrast"].append({"tag": tag, "text": txt, "fg": c1, "bg": bg, "ratio": round(cr, 2)})
                        except Exception:
                            pass
                results[f"{pname}_{vname}"] = {"url": url, "viewport": vp, "shot": shot, "data": data}
                c.close()
        # dark mode: mobile home + recipe, desktop home
        for pname in ["home", "recipe"]:
            c = browser.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark")
            page = c.new_page()
            page.goto(PAGES[pname], wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUT, f"{pname}_desktop_dark.png"))
            dark = page.evaluate("""() => {
              const out = {darkActive: false, bg: null, bodyColor: null, cards: []};
              const match = window.matchMedia('(prefers-color-scheme: dark)');
              out.darkActive = match.matches;
              const cs = getComputedStyle(document.body);
              out.bg = cs.backgroundColor; out.bodyColor = cs.color;
              return out;
            }""")
            # sample actual rendered bg colors of top elements
            samples = page.evaluate("""() => {
              const out = [];
              for (const el of document.querySelectorAll('header, main, article, section, div')) {
                const cs = getComputedStyle(el);
                if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                  const r = el.getBoundingClientRect();
                  if (r.width > 200 && r.height > 30) out.push({cls: String(el.className).slice(0,40), bg: cs.backgroundColor, color: cs.color});
                }
              }
              return out.slice(0, 12);
            }""")
            dark["samples"] = samples
            results[f"{pname}_desktop_dark"] = {"url": PAGES[pname], "shot": os.path.join(OUT, f"{pname}_desktop_dark.png"), "data": dark}
            c.close()
        browser.close()
    with open("/home/user/ai-blog-builder/www.chefaugustin.com-audit/visual-data.json", "w") as f:
        json.dump(results, f, indent=1, default=str)
    for k, v in results.items():
        d = v.get("data", {})
        print(f"== {k} ==")
        print(json.dumps({kk: d[kk] for kk in d if kk != 'contrast'}, default=str)[:1200])
        if d.get("contrast"):
            print("  contrast:", json.dumps(d["contrast"])[:800])

if __name__ == "__main__":
    run()
