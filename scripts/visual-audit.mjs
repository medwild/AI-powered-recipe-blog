// Visual SEO audit: above-the-fold, mobile rendering, CLS, tap targets, font sizes
// Usage: node scripts/visual-audit.mjs <url> [--output <dir>]
import { chromium } from '/home/user/.nvm/versions/node/v22.23.1/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.argv[2] || 'https://www.chefaugustin.com';
const outputDir = process.argv[3] || '/home/user/ai-blog-builder/screenshots';

fs.mkdirSync(path.join(outputDir, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'findings'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Collect layout shifts via PerformanceObserver
const clsScript = `() => {
  window.__cls = { value: 0, shifts: [] };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        window.__cls.value += entry.value;
        window.__cls.shifts.push({
          value: Math.round(entry.value * 1000) / 1000,
          time: Math.round(entry.startTime),
          sources: (entry.sources || []).map((s) => ({
            node: s.node ? (s.node.className || s.node.id || s.node.tagName) : null,
            tag: s.node ? s.node.tagName : null,
            x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.width), h: Math.round(s.height),
          })),
        });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
  return true;
}`;

// Collect interactive elements with tap target sizes + font sizes
const metricsScript = () => {
  const viewportW = window.innerWidth;
  const doc = document;
  const results = {
    viewportW,
    viewportH: window.innerHeight,
    scrollW: doc.documentElement.scrollWidth,
    horizontalOverflow: doc.documentElement.scrollWidth > window.innerWidth + 1,
    fonts: new Set(),
    tapTargets: [],
    headings: [],
    aboveFold: {},
    images: [],
  };

  // Font sizes used
  doc.querySelectorAll('body *').forEach((el) => {
    const s = getComputedStyle(el).fontSize;
    if (s) results.fonts.add(parseFloat(s));
  });

  // Interactive elements: tap target size check (mobile only relevant)
  const interactive = 'a, button, [role="button"], input, select, textarea, summary';
  doc.querySelectorAll(interactive).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const style = getComputedStyle(el);
    results.tapTargets.push({
      tag: el.tagName,
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      href: el.getAttribute('href') || '',
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height),
      fontSize: style.fontSize,
      visibility: style.visibility,
      display: style.display,
      clipped: r.bottom < 0 || r.right < 0 || r.top > window.innerHeight,
    });
  });

  // Headings
  doc.querySelectorAll('h1, h2, h3').forEach((el) => {
    const r = el.getBoundingClientRect();
    results.headings.push({
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 80),
      y: Math.round(r.top + window.scrollY),
      h: Math.round(r.height),
      visible: r.height > 0 && r.bottom > 0 && r.top < window.innerHeight,
    });
  });

  // Above-the-fold check: elements fully visible in first viewport
  const firstFold = window.innerHeight;
  const h1 = doc.querySelector('h1');
  if (h1) {
    const r = h1.getBoundingClientRect();
    results.aboveFold.h1 = {
      text: (h1.textContent || '').trim().slice(0, 120),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      fullyVisibleInFold: r.top >= 0 && r.bottom <= firstFold,
      fontSize: getComputedStyle(h1).fontSize,
    };
  } else {
    results.aboveFold.h1 = null;
  }

  // Hero images
  doc.querySelectorAll('img').forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    results.images.push({
      src: (img.getAttribute('src') || '').slice(0, 100),
      alt: (img.getAttribute('alt') || '').slice(0, 60),
      w: Math.round(r.width), h: Math.round(r.height),
      naturalW: img.naturalWidth, naturalH: img.naturalHeight,
      loading: img.getAttribute('loading') || 'eager',
      inFirstFold: r.top < firstFold,
      layoutShift: !img.complete || img.naturalWidth === 0,
    });
  });

  // Body font check
  results.bodyFontSize = getComputedStyle(doc.body).fontSize;
  results.baseFontUnder16 = parseFloat(getComputedStyle(doc.body).fontSize) < 16;

  return results;
};

// Find visible above-fold CTAs
const ctaScript = () => {
  const links = [...document.querySelectorAll('a, button')];
  const firstFold = window.innerHeight;
  return links
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      const isLink = el.tagName === 'A' && el.getAttribute('href');
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < firstFold &&
        (isLink || el.tagName === 'BUTTON') && text.length > 0;
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim().slice(0, 60),
        href: el.getAttribute('href') || '',
        y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
        bg: getComputedStyle(el).backgroundColor,
        isButton: getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(el).backgroundColor !== 'transparent',
      };
    })
    .slice(0, 15);
};

async function auditViewport(browser, viewport, label) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    isMobile: viewport.isMobile || false,
    hasTouch: viewport.hasTouch || false,
    userAgent: viewport.userAgent || undefined,
  });
  const page = await ctx.newPage();

  const report = { label, url: URL, viewport: `${viewport.width}x${viewport.height}` };

  // Track console errors and failed requests
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });
  page.on('requestfailed', (req) => failedRequests.push(`${req.url().slice(0, 100)} :: ${req.failure()?.errorText}`));
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message.slice(0, 200)}`));

  await page.addInitScript(clsScript);

  const t0 = Date.now();
  const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  report.status = resp ? resp.status() : null;
  report.loadMs = Date.now() - t0;

  // Wait for hero images + fonts
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    await Promise.allSettled(imgs.map((img) =>
      img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; setTimeout(res, 5000); })
    ));
    await document.fonts.ready;
  });
  await sleep(500);

  // After-load metrics
  const m = await page.evaluate(metricsScript);
  const cls = await page.evaluate(() => window.__cls);
  const ctas = await page.evaluate(ctaScript);

  report.cls = cls;
  report.horizontalOverflow = m.horizontalOverflow;
  report.scrollW = m.scrollW;
  report.viewportW = m.viewportW;
  report.fontSizes = [...m.fonts].sort((a, b) => a - b).slice(0, 30);
  report.bodyFontSize = m.bodyFontSize;
  report.baseFontUnder16 = m.baseFontUnder16;
  report.headings = m.headings;
  report.aboveFold = m.aboveFold;
  report.images = m.images;
  report.ctas = ctas;
  report.consoleErrors = consoleErrors;
  report.failedRequests = failedRequests;

  // Tap targets analysis (small targets in the visible viewport)
  const visibleTargets = m.tapTargets.filter((t) => !t.clipped && t.visibility !== 'hidden' && t.display !== 'none');
  report.smallTapTargets = visibleTargets
    .filter((t) => (t.w < 44 || t.h < 44))
    .map((t) => ({ ...t, under48: true }))
    .slice(0, 25);
  report.tapTargetCount = visibleTargets.length;

  // Screenshots: full page + above the fold
  await page.screenshot({ path: path.join(outputDir, 'screenshots', `${label}.png`), fullPage: false });
  await page.screenshot({ path: path.join(outputDir, 'screenshots', `${label}-full.png`), fullPage: true });

  // Scroll through page on mobile to check content visibility + horizontal scroll at each section
  if (viewport.isMobile) {
    const scrollCheck = await page.evaluate(async () => {
      const doc = document;
      const problems = [];
      const prevH = doc.documentElement.scrollHeight;
      const step = Math.floor(window.innerHeight * 0.8);
      for (let y = 0; y < prevH; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
        if (doc.documentElement.scrollWidth > window.innerWidth + 1) {
          problems.push({ y, overflowAt: doc.documentElement.scrollWidth });
        }
      }
      window.scrollTo(0, 0);
      return { problems, scrollHeight: prevH };
    });
    report.scrollOverflow = scrollCheck;
  }

  await page.close();
  await ctx.close();
  return report;
}

const browser = await chromium.launch({ headless: true });

const reports = [];
reports.push(await auditViewport(browser, { width: 1920, height: 1080 }, 'desktop'));
reports.push(await auditViewport(browser, { width: 1366, height: 768 }, 'laptop'));
reports.push(await auditViewport(browser, { width: 768, height: 1024 }, 'tablet'));
reports.push(await auditViewport(browser, {
  width: 375, height: 812, isMobile: true, hasTouch: true,
  deviceScaleFactor: 3,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}, 'mobile'));

await browser.close();

fs.writeFileSync(path.join(outputDir, 'findings', 'visual-audit-raw.json'), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
