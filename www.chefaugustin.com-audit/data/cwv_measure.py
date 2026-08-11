#!/usr/bin/env python3
"""
Lab Core Web Vitals measurement for chefaugustin.com via Playwright/Chromium.

Measures LCP (PerformanceObserver LCP), CLS (layout-shift), FCP, TTFB,
TBT + long tasks, and INP approximation (max event delay+duration from
synthetic trusted clicks on non-navigating interactive elements),
plus full resource-transfer accounting (bytes by type / by host).

Usage: python cwv_measure.py <url> <out.json> [recipe_url]
"""
import asyncio
import json
import sys
import time

from playwright.async_api import async_playwright

URL = sys.argv[1]
OUT = sys.argv[2]
RECIPE_URL = sys.argv[3] if len(sys.argv) > 3 else None

MOBILE_UA = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36"
)
DESKTOP_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)

INIT_JS = """
window.__perf = { lcp: 0, cls: 0, fcp: 0, longtasks: [], events: [] };
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.entryType === 'largest-contentful-paint') window.__perf.lcp = e.startTime;
      if (e.entryType === 'first-contentful-paint' && !window.__perf.fcp) window.__perf.fcp = e.startTime;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (!e.hadRecentInput) window.__perf.cls += e.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.interactionId) window.__perf.events.push({ type: e.name, start: Math.round(e.startTime), dur: Math.round(e.duration), delay: Math.round(e.processingStart - e.startTime), id: e.interactionId });
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
} catch (e) {}
"""


def is_challenge(page):
    try:
        return page.evaluate(
            "() => !!document.querySelector('.container h1') && document.body.innerText.includes('Checking your browser')"
        )
    except Exception:
        return True


async def measure(browser, url, name, viewport, ua, throttle):
    context = await browser.new_context(viewport=viewport, user_agent=ua, locale="en-US")
    page = await context.new_page()
    await page.add_init_script(INIT_JS)

    if throttle:
        client = await context.new_cdp_session(page)
        await client.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        await client.send("Network.enable", {})
        await client.send(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "latency": 150,
                "downloadThroughput": 1.6 * 1024 * 1024 / 8,  # ~1.6 Mbps
                "uploadThroughput": 750 * 1024 / 8,
            },
        )

    resources = []
    page.on(
        "response",
        lambda r: resources.append(
            {
                "url": r.url,
                "status": r.status,
                "type": r.request.resource_type,
                "clen": r.headers.get("content-length"),
                "cache": r.headers.get("x-hcdn-cache-status"),
                "enc": r.headers.get("content-encoding"),
            }
        ),
    )

    t0 = time.time()
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=90000)
    except Exception as e:
        print(f"  goto error: {e}", flush=True)
    wall = time.time() - t0

    # Pass the Hostinger JS challenge if present
    for _ in range(40):
        try:
            if not await is_challenge(page):
                break
        except Exception:
            pass
        await page.wait_for_timeout(500)
    try:
        await page.wait_for_load_state("networkidle", timeout=60000)
    except Exception:
        pass
    await page.wait_for_timeout(2500)

    # Synthetic trusted clicks on safe (non-navigating) interactive elements -> INP approximation
    selectors = [
        'a[href^="#"]',
        "button:not([disabled])",
        '[role="button"]',
        "summary",
        'input[type="checkbox"]',
        "select",
    ]
    clicked = 0
    for sel in selectors:
        if clicked >= 6:
            break
        try:
            els = await page.query_selector_all(sel)
            for el in els:
                if clicked >= 6:
                    break
                try:
                    if await el.is_visible():
                        await el.click(timeout=2500)
                        await page.wait_for_timeout(300)
                        clicked += 1
                except Exception:
                    pass
        except Exception:
            pass
    await page.wait_for_timeout(1000)

    perf = await page.evaluate(
        """() => {
      const p = window.__perf || { lcp: 0, cls: 0, fcp: 0, longtasks: [], events: [] };
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        lcp: p.lcp, cls: p.cls, fcp: p.fcp, ttfb: nav.responseStart || 0,
        domContentLoaded: nav.domContentLoadedEventEnd || 0, load: nav.loadEventEnd || 0,
        longtasks: p.longtasks, events: p.events, url: location.href, title: document.title,
        challenge: !!document.querySelector('.container h1') && document.body.innerText.includes('Checking your browser'),
        scripts: document.querySelectorAll('script').length,
        links: document.querySelectorAll('link').length,
        imgs: document.querySelectorAll('img').length,
        inline_styles: document.querySelectorAll('style').length,
        imgs_nodim: [...document.querySelectorAll('img')].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).length,
        imgs_lazy: [...document.querySelectorAll('img[loading="lazy"]')].length,
        imgs_nolazy: [...document.querySelectorAll('img:not([loading])')].length,
      };
    }"""
    )
    res_entries = await page.evaluate(
        """() => performance.getEntriesByType('resource').map(r => ({
      name: r.name, initiatorType: r.initiatorType, transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize, duration: Math.round(r.duration)
    }))"""
    )
    await context.close()

    events = perf.get("events", [])
    by_id = {}
    for e in events:
        by_id.setdefault(e["id"], []).append(e)
    inp_max, inp_evt = 0, None
    for iid, evs in by_id.items():
        total = sum(e["delay"] + e["dur"] for e in evs)
        if total > inp_max:
            inp_max, inp_evt = total, evs
    tbt = sum(max(0, t["dur"] - 50) for t in perf.get("longtasks", []))

    return {
        "name": name,
        "requested_url": url,
        "final_url": perf.get("url"),
        "title": perf.get("title"),
        "challenge_persisted": perf.get("challenge", False),
        "wall_s": round(wall, 1),
        "lcp_ms": round(perf.get("lcp", 0)),
        "fcp_ms": round(perf.get("fcp", 0)),
        "ttfb_ms": round(perf.get("ttfb", 0)),
        "cls": round(perf.get("cls", 0), 4),
        "dom_content_loaded_ms": round(perf.get("domContentLoaded", 0)),
        "load_ms": round(perf.get("load", 0)),
        "inp_approx_ms": round(inp_max),
        "inp_event_type": inp_evt[0]["type"] if inp_evt else None,
        "event_count": len(events),
        "longtask_count": len(perf.get("longtasks", [])),
        "tbt_ms": round(tbt),
        "longtasks": perf.get("longtasks", []),
        "dom_scripts": perf.get("scripts"),
        "dom_links": perf.get("links"),
        "dom_imgs": perf.get("imgs"),
        "dom_inline_styles": perf.get("inline_styles"),
        "imgs_nodim": perf.get("imgs_nodim"),
        "imgs_lazy": perf.get("imgs_lazy"),
        "imgs_nolazy": perf.get("imgs_nolazy"),
        "clicks": clicked,
        "resources": res_entries,
        "responses": resources,
    }


def aggregate(m):
    by_type = {}
    by_host = {}
    for r in m["resources"]:
        bt = r["initiatorType"]
        by_type.setdefault(bt, {"count": 0, "bytes": 0, "time": 0})
        by_type[bt]["count"] += 1
        by_type[bt]["bytes"] += r["transferSize"] or 0
        by_type[bt]["time"] += r["duration"]
        host = r["name"].split("/")[2] if "://" in r["name"] else "?"
        by_host.setdefault(host, {"count": 0, "bytes": 0})
        by_host[host]["count"] += 1
        by_host[host]["bytes"] += r["transferSize"] or 0
    return by_type, by_host


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        results = []
        tasks = [
            ("home-mobile-throttled", URL, {"width": 412, "height": 915}, MOBILE_UA, True),
            ("home-desktop", URL, {"width": 1440, "height": 900}, DESKTOP_UA, False),
        ]
        if RECIPE_URL:
            tasks.append(("recipe-mobile-throttled", RECIPE_URL, {"width": 412, "height": 915}, MOBILE_UA, True))
            tasks.append(("recipe-desktop", RECIPE_URL, {"width": 1440, "height": 900}, DESKTOP_UA, False))
        for name, url, vp, ua, thr in tasks:
            print(f"== measuring {name}: {url}", flush=True)
            try:
                m = await measure(browser, url, name, vp, ua, thr)
                bt, bh = aggregate(m)
                m["by_type"] = bt
                m["by_host"] = bh
                m["third_party_hosts"] = {
                    h: v for h, v in bh.items()
                    if "chefaugustin.com" not in h
                }
                results.append(m)
                print(
                    f"   {name}: LCP={m['lcp_ms']}ms FCP={m['fcp_ms']}ms TTFB={m['ttfb_ms']}ms "
                    f"CLS={m['cls']} INP~={m['inp_approx_ms']}ms TBT={m['tbt_ms']}ms "
                    f"transfer={sum(r['transferSize'] or 0 for r in m['resources'])}B "
                    f"challenge={m['challenge_persisted']}",
                    flush=True,
                )
            except Exception as e:
                print(f"   FAILED {name}: {e}", flush=True)
        await browser.close()
    with open(OUT, "w") as f:
        json.dump(results, f, indent=1)
    print(f"written {OUT}")


asyncio.run(main())
