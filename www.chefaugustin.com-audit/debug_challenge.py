#!/usr/bin/env python3
"""Debug the Hostinger challenge page structure over time."""
import time
from playwright.sync_api import sync_playwright

URL = "https://www.chefaugustin.com/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/nix/store/7xr3qnq93srn4dgak7qw74dw836wpp1y-chromium-138.0.7204.49/bin/chromium", args=["--no-sandbox","--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(URL, wait_until="domcontentloaded", timeout=45000)
    for i in range(12):
        info = page.evaluate("""() => {
          const b = document.body;
          return {
            title: document.title,
            url: location.href,
            bodyTextLen: b ? b.innerText.length : -1,
            bodyTextHead: b ? b.innerText.slice(0, 150) : '',
            h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim().slice(0,80) : null,
            iframes: [...document.querySelectorAll('iframe')].map(f => f.src || 'srcdoc').slice(0,3),
            cookie: document.cookie.slice(0, 200),
            htmlHead: document.documentElement.outerHTML.slice(0, 200),
          };
        }""")
        print(f"t={i*5}s:", {k: str(v)[:160] for k, v in info.items()})
        if info["h1"] and "checking your browser" not in info["h1"].lower():
            print("CHALLENGE CLEARED at t=", i*5)
            break
        time.sleep(5)
    browser.close()
