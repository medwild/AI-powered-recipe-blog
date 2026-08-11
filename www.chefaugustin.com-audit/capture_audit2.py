#!/usr/bin/env python3
"""Capture + analyze chefaugustin.com, waiting out the bot-protection JS challenge."""
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
CHALLENGE_MARKERS = ["checking your browser", "challenge", "cloudflare", "hostinger"]

def is_challenged(page):
    try:
        info = page.evaluate("""() => ({
          title: document.title,
          h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '',
        })""")
        low = (info["title"] + " " + info["h1"]).lower()
        return any(m in low for m in CHALLENGE_MARKERS)
    except Exception:
        return True

def wait_out_challenge(page, max_wait=45):
    """Poll until challenge clears; reload when a challenge cookie may have been set."""
    deadline = time.time() + max_wait
    last_reload = 0
    while time.time() < deadline:
        if not is_challenged(page):
            return True
        # every ~8s, reload (challenge usually sets cookie on first pass)
        if time.time() - last_reload > 8:
            last_reload = time.time()
            try:
                page.reload(wait_until="domcontentloaded", timeout=30000)
            except Exception:
                pass
        page.wait_for_timeout(1500)
    return not is_challenged(page)

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
    if s.startswith("rgb("): return tuple(int(x) for x in s[4:-1].split(",")[:3])
    if s.startswith("rgba("): return tuple(int(x) for x in s[5:-1].split(",")[:3])
    if s.startswith("#") and len(s) == 7: return tuple(int(s[i:i+2], 16) for i in (1, 3, 5))
    if s.startswith("#") and len(s) == 4: return tuple(int(s[i]*2, 16) for i in (1, 2, 3))
    return None

def analyze(page, ctx):
    return page.evaluate("""(ctx) => {
      const out = {overflow: false, scrollWidth: 0, clientWidth: 0, tapTargetsSmall: [],
                   tinyText: [], fontInfo: {}, viewportMeta: null, h1: null,
                   aboveFold: {h1: null, ctas: [], cards: 0, imgs: 0}, headings: [],
                   links: 0, nav: null, heroImg: null, video: false};
      const de = document.documentElement, body = document.body;
      out.scrollWidth = de.scrollWidth; out.clientWidth = de.clientWidth;
      out.overflow = de.scrollWidth > de.clientWidth + 1;
      const vp = document.querySelector('meta[name="viewport"]');
      out.viewportMeta = vp ? vp.content : null;
      const cs = getComputedStyle(body);
      out.fontInfo = {baseFontSize: cs.fontSize, baseFontFamily: cs.fontFamily.split(',')[0],
                      bodyColor: cs.color, bgColor: cs.backgroundColor};
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
      document.querySelectorAll('h1,h2,h3,h4').forEach(h => {
        const r = h.getBoundingClientRect();
        out.headings.push({tag: h.tagName, text: h.textContent.trim().slice(0,60), top: Math.round(r.top), inFold: inFold(h)});
      });
      const ctas = [...document.querySelectorAll('a,button')].filter(a => {
        const t = (a.textContent||'').trim();
        return /jump|recipe|start|browse|view|explore|see all|sign|subscribe|newsletter|pin/i.test(t) && t.length < 60;
      });
      ctas.forEach(c => { if (inFold(c)) out.aboveFold.ctas.push({text: c.textContent.trim().slice(0,40), top: Math.round(c.getBoundingClientRect().top)}); });
      out.aboveFold.cards = [...document.querySelectorAll('a[href*="/recipes/"]')].filter(inFold).length;
      out.aboveFold.imgs = [...document.querySelectorAll('img')].filter(inFold).length;
      if (ctx.mobile) {
        [...document.querySelectorAll('a,button')].forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.top > vh) return;
          if ((r.width < 44 || r.height < 44) && /btn|button|pill|chip|icon|nav|menu|close/i.test(el.className)) {
            out.tapTargetsSmall.push({tag: el.tagName, cls: String(el.className).slice(0,60), text: (el.textContent||'').trim().slice(0,20), w: Math.round(r.width), h: Math.round(r.height)});
          }
        });
      }
      [...document.querySelectorAll('p,span,a,li,label')].forEach(el => {
        const c = getComputedStyle(el);
        const fs = parseFloat(c.fontSize);
        const r = el.getBoundingClientRect();
        if (fs < 12 && r.width > 0 && r.top < vh) out.tinyText.push({tag: el.tagName, cls: String(el.className).slice(0,50), fs: fs, text: (el.textContent||'').trim().slice(0,40)});
      });
      out.links = document.querySelectorAll('a').length;
      out.video = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
      const nav = document.querySelector('nav, header');
      if (nav) { const r = nav.getBoundingClientRect(); out.nav = {tag: nav.tagName, h: Math.round(r.height), top: Math.round(r.top)}; }
      const hero = document.querySelector('header img, main img, [class*="hero"] img');
      if (hero) { const r = hero.getBoundingClientRect(); out.heroImg = {src: (hero.currentSrc||hero.src||'').slice(0,100), w: Math.round(r.width), h: Math.round(r.height), inFold: inFold(hero)}; }
      return out;
    }""", ctx)

def run():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/nix/store/7xr3qnq93srn4dgak7qw74dw836wpp1y-chromium-138.0.7204.49/bin/chromium", args=["--no-sandbox","--disable-dev-shm-usage"])
        for pname, url in PAGES.items():
            for vname, vp in VIEWPORTS.items():
                kwargs = {"viewport": vp, "device_scale_factor": 2 if vname == "mobile" else 1}
                if vname == "mobile":
                    kwargs["user_agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                c = browser.new_context(**kwargs)
                page = c.new_page()
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=45000)
                except Exception as e:
                    print(f"WARN goto {pname}/{vname}: {e}", file=sys.stderr)
                page.wait_for_timeout(9000)  # challenge resolves ~5s after load
                ok = wait_out_challenge(page, max_wait=30)
                page.wait_for_timeout(2500)
                shot = os.path.join(OUT, f"{pname}_{vname}.png")
                page.screenshot(path=shot)
                data = analyze(page, {"mobile": vname == "mobile"})
                data["challengeCleared"] = ok
                if ok and vname == "mobile":
                    data["contrast"] = []
                    for el in page.query_selector_all("h1,h2,h3,p,button,a")[:10]:
                        try:
                            fg = parse_color(el.evaluate("e => getComputedStyle(e).color"))
                            bg = parse_color(el.evaluate("""e => { let n=e; while(n){const b=getComputedStyle(n).backgroundColor; if(b && b!=='rgba(0, 0, 0, 0)') return b; n=n.parentElement;} return 'rgb(255,255,255)'; }"""))
                            if fg and bg:
                                data["contrast"].append({"tag": el.evaluate("e=>e.tagName"), "text": el.evaluate("e=>(e.textContent||'').trim().slice(0,40)"),
                                                         "fg": str(fg), "bg": str(bg), "ratio": round(compute_contrast(fg, bg), 2)})
                        except Exception:
                            pass
                results[f"{pname}_{vname}"] = {"url": url, "viewport": vp, "shot": shot, "data": data, "challengeCleared": ok}
                c.close()
        # dark mode
        for pname in ["home", "recipe"]:
            c = browser.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark")
            page = c.new_page()
            try:
                page.goto(PAGES[pname], wait_until="domcontentloaded", timeout=45000)
            except Exception:
                pass
            page.wait_for_timeout(9000)
            ok = wait_out_challenge(page, max_wait=30)
            page.wait_for_timeout(2500)
            page.screenshot(path=os.path.join(OUT, f"{pname}_desktop_dark.png"))
            dark = page.evaluate("""() => {
              const out = {darkActive: false, bg: null, bodyColor: null, samples: []};
              out.darkActive = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const cs = getComputedStyle(document.body);
              out.bg = cs.backgroundColor; out.bodyColor = cs.color;
              for (const el of document.querySelectorAll('header, main, article, section, div')) {
                const s = getComputedStyle(el);
                if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                  const r = el.getBoundingClientRect();
                  if (r.width > 200 && r.height > 30) out.samples.push({cls: String(el.className).slice(0,40), bg: s.backgroundColor, color: s.color});
                }
              }
              return out;
            }""")
            dark["challengeCleared"] = ok
            results[f"{pname}_desktop_dark"] = {"url": PAGES[pname], "shot": os.path.join(OUT, f"{pname}_desktop_dark.png"), "data": dark}
            c.close()
        browser.close()
    with open("/home/user/ai-blog-builder/www.chefaugustin.com-audit/visual-data.json", "w") as f:
        json.dump(results, f, indent=1, default=str)
    for k, v in results.items():
        d = v.get("data", {})
        print(f"== {k} (challengeCleared={v.get('challengeCleared')}) ==")
        print(json.dumps({kk: d[kk] for kk in d if kk != 'contrast'}, default=str)[:1100])
        if d.get("contrast"):
            print("  contrast:", json.dumps(d["contrast"])[:700])

if __name__ == "__main__":
    run()
