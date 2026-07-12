import * as fs from "fs";

function normalize(kw: string | undefined): string {
  if (!kw) return "";
  return kw.toLowerCase().trim().replace(/\s+/g, " ");
}

// Robust CSV parser with quote handling
function parseCSV(filePath: string): string[][] {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/);
  const rows: string[][] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    if (fields.length > 0 && fields.some(f => f.length > 0)) {
      rows.push(fields);
    }
  }
  return rows;
}

// Parse Semrush
const semrushRows = parseCSV("/home/user/ai-blog-builder/healthy-dinner-recipes-for-two_bulk_us_2026-07-12_18-02-33.csv");
interface SemrushRow { keyword: string; normalizedKeyword: string; intent: string; volume: number; kd: number; cpc: number; serpFeatures: string[]; }
const semrushData: SemrushRow[] = [];
for (let i = 1; i < semrushRows.length; i++) {
  const r = semrushRows[i];
  if (!r[0]) continue;
  const features = (r[7] || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  semrushData.push({
    keyword: r[0], normalizedKeyword: normalize(r[0]),
    intent: r[1] || "", volume: parseInt(r[2], 10) || 0,
    kd: parseInt(r[4], 10) || 0, cpc: parseFloat(r[5]) || 0,
    serpFeatures: features,
  });
}

// Parse Pinclicks
const pinclicksRows = parseCSV("/home/user/ai-blog-builder/recipes for two top chearch - recipes-interests.csv");
interface PinclicksRow { id: string; label: string; normalizedLabel: string; url: string; searchVolume: number; }
const pinclicksData: PinclicksRow[] = [];
for (let i = 1; i < pinclicksRows.length; i++) {
  const r = pinclicksRows[i];
  if (!r[1]) continue;
  pinclicksData.push({
    id: r[0] || "", label: r[1], normalizedLabel: normalize(r[1]),
    url: r[2] || "", searchVolume: parseInt(r[3], 10) || 0,
  });
}

// Parse Pin Data
const pinDataRows = parseCSV("/home/user/ai-blog-builder/pin data - recipes-pins.csv");
interface PinDataRow { title: string; normalizedTitle: string; pinScore: number; saves: number; position: number; repins: number; reactions: number; keywordAnnotations: string; description: string; }
const pinData: PinDataRow[] = [];
for (let i = 1; i < pinDataRows.length; i++) {
  const r = pinDataRows[i];
  if (!r[1]) continue;
  pinData.push({
    title: r[1], normalizedTitle: normalize(r[1]),
    pinScore: parseInt(r[3], 10) || 0,
    saves: parseInt(r[4], 10) || 0,
    position: parseInt(r[5], 10) || 0,
    repins: parseInt(r[9], 10) || 0,
    reactions: parseInt(r[10], 10) || 0,
    keywordAnnotations: r[11] || "",
    description: r[15] || "",
  });
}

// Build keyword → Pin Data lookup
const pinDataByKw = new Map<string, PinDataRow[]>();
for (const p of pinData) {
  const anns = p.keywordAnnotations.split(",").map(k => normalize(k)).filter(Boolean);
  for (const ann of anns) {
    if (!pinDataByKw.has(ann)) pinDataByKw.set(ann, []);
    pinDataByKw.get(ann)!.push(p);
  }
  // Also index by title words
  const nk = p.normalizedTitle;
  if (!pinDataByKw.has(nk)) pinDataByKw.set(nk, []);
  pinDataByKw.get(nk)!.push(p);
}

function findPinMatches(keyword: string): PinDataRow[] {
  const nk = normalize(keyword);
  if (pinDataByKw.has(nk)) return pinDataByKw.get(nk)!;
  const matches: PinDataRow[] = [];
  for (const [k, pins] of pinDataByKw) {
    if (k && nk && (k.includes(nk) || nk.includes(k))) {
      matches.push(...pins);
    }
  }
  return matches.slice(0, 10);
}

// Build unified keyword set
const pinclicksByKw = new Map<string, PinclicksRow>();
for (const p of pinclicksData) pinclicksByKw.set(p.normalizedLabel, p);

const allKeywords = new Set<string>();
for (const s of semrushData) allKeywords.add(s.normalizedKeyword);
for (const p of pinclicksData) allKeywords.add(p.normalizedLabel);

// Cross-reference & score
interface Result {
  keyword: string; normalizedKeyword: string;
  googleVolume: number | null; kd: number | null; hasAiOverview: boolean; serpFeatures: string[];
  pinterestSearchVolume: number | null;
  topPinScore: number | null; topPinSaves: number | null; totalPins: number; avgPinScore: number | null;
  googleOpp: number; pinterestOpp: number; geoPot: number; dualScore: number;
  tier: string; recommendation: string;
}

const results: Result[] = [];

for (const nk of allKeywords) {
  if (!nk) continue;
  const sem = semrushData.find(s => s.normalizedKeyword === nk);
  const pincl = pinclicksByKw.get(nk);
  const pinMatches = findPinMatches(nk);

  const gv = sem?.volume ?? null;
  const kd = sem?.kd ?? null;
  const hasAi = sem?.serpFeatures.some(f => f.toLowerCase().includes("ai overview")) ?? false;
  const sf = sem?.serpFeatures ?? [];
  const psv = pincl?.searchVolume ?? null;
  const topScore = pinMatches.length > 0 ? Math.max(...pinMatches.map(p => p.pinScore)) : null;
  const topSaves = pinMatches.length > 0 ? Math.max(...pinMatches.map(p => p.saves)) : null;
  const avgScore = pinMatches.length > 0 ? Math.round(pinMatches.reduce((s, p) => s + p.pinScore, 0) / pinMatches.length) : null;

  // Google Opportunity
  let gOpp = 0;
  if (gv && kd) {
    gOpp = Math.round(Math.min(gv / 50000 * 50, 50) + Math.max(0, (100 - kd) / 100 * 30) + (hasAi ? 20 : 0));
  }

  // Pinterest Opportunity
  let pOpp = 0;
  if (psv) {
    const searchScore = Math.min(psv / 5000 * 40, 40);
    let compScore = 30;
    if (topScore !== null && topScore < 50) compScore = 40;
    else if (topScore !== null && topScore < 75) compScore = 25;
    else if (topScore !== null) compScore = 10;
    pOpp = Math.round(searchScore + compScore + (pinMatches.length > 0 ? 20 : 0));
  }

  // GEO Potential
  let geo = 0;
  if (sem) {
    geo = (hasAi ? 40 : 0)
      + (sf.some(f => /people also ask|related search/i.test(f)) ? 20 : 0)
      + (sf.some(f => /recipes|video/i.test(f)) ? 15 : 0)
      + (kd && kd < 35 ? 25 : kd && kd < 50 ? 15 : 0);
  }

  const existsInBoth = sem !== undefined && pincl !== undefined;
  const dual = existsInBoth ? Math.round(gOpp * 0.35 + pOpp * 0.40 + geo * 0.25) : (sem ? gOpp : pOpp);

  let tier: string; let rec: string;
  if (existsInBoth && gOpp >= 40 && pOpp >= 40) {
    tier = "DUAL_CHAMPION"; rec = "P1 — Pin-First + Full SEO + 5 pins";
  } else if (pOpp >= 50 && (!sem || gOpp < 40)) {
    tier = "PINTEREST_PLAY"; rec = "P2 — Pin-First, 3 pins, SEO secondaire";
  } else if (gOpp >= 50 && !pincl) {
    tier = "GOOGLE_PLAY"; rec = "P2 — Google-first, standard format";
  } else {
    tier = "LONG_TAIL"; rec = "Backlog — après P1/P2";
  }

  results.push({
    keyword: sem?.keyword ?? pincl?.label ?? nk,
    normalizedKeyword: nk,
    googleVolume: gv, kd, hasAiOverview: hasAi, serpFeatures: sf,
    pinterestSearchVolume: psv,
    topPinScore: topScore, topPinSaves: topSaves, totalPins: pinMatches.length, avgPinScore: avgScore,
    googleOpp: gOpp, pinterestOpp: pOpp, geoPot: geo, dualScore: dual,
    tier, recommendation: rec,
  });
}

results.sort((a, b) => b.dualScore - a.dualScore);

// Print report
const W = 110;
console.log("=".repeat(W));
console.log("ANALYSE CROISÉE 3 CANAUX — Google (Semrush) × Pinterest Search (Pinclicks) × Pin Performance (Pin Data)");
console.log("=".repeat(W));
console.log(`Sources: ${semrushData.length} kw Semrush | ${pinclicksData.length} kw Pinclicks | ${pinData.length} pins analysés`);
console.log(`Total keywords cross-référencés: ${results.length}`);
console.log("");

const ch = results.filter(r => r.tier === "DUAL_CHAMPION");
const pp = results.filter(r => r.tier === "PINTEREST_PLAY");
const gp = results.filter(r => r.tier === "GOOGLE_PLAY");
const lt = results.filter(r => r.tier === "LONG_TAIL");

console.log("DISTRIBUTION:");
console.log(`  🏆 DUAL_CHAMPION  : ${ch.length}  — fort potentiel Google + Pinterest`);
console.log(`  📌 PINTEREST_PLAY : ${pp.length} — Pinterest-dominant`);
console.log(`  🔍 GOOGLE_PLAY    : ${gp.length}  — Google-first`);
console.log(`  📋 LONG_TAIL      : ${lt.length} — backlog`);
console.log("");

// DUAL CHAMPIONS
console.log("═".repeat(W));
console.log("🏆 DUAL CHAMPIONS — Priorité #1 (Google volume + Pinterest volume + Pin competition data)");
console.log("═".repeat(W));

const fmt = (v: any, w: number) => String(v ?? "-").padEnd(w);
console.log("KEYWORD".padEnd(38) + "DUAL".padEnd(6) + "G.Vol".padEnd(8) + "KD".padEnd(5) + "P.Vol".padEnd(8) + "PinSc".padEnd(7) + "Saves".padEnd(7) + "GEO".padEnd(5) + "AI Ov".padEnd(6) + "RECOMMENDATION");
console.log("-".repeat(W));

for (const r of ch) {
  console.log(
    r.keyword.slice(0, 36).padEnd(38) +
    fmt(r.dualScore, 6) + fmt(r.googleVolume?.toLocaleString(), 8) + fmt(r.kd, 5) +
    fmt(r.pinterestSearchVolume?.toLocaleString(), 8) + fmt(r.topPinScore, 7) +
    fmt(r.topPinSaves, 7) + fmt(r.geoPot, 5) + fmt(r.hasAiOverview ? "✅" : "❌", 6) +
    r.recommendation
  );
}

// PINTEREST PLAYS
console.log("");
console.log("═".repeat(W));
console.log("📌 TOP PINTEREST PLAYS — Opportunité Pinterest native");
console.log("═".repeat(W));
console.log("KEYWORD".padEnd(38) + "DUAL".padEnd(6) + "P.Vol".padEnd(8) + "PinSc".padEnd(7) + "Saves".padEnd(7) + "RECOMMENDATION");
console.log("-".repeat(W));
for (const r of pp.slice(0, 15)) {
  console.log(
    r.keyword.slice(0, 36).padEnd(38) + fmt(r.dualScore, 6) +
    fmt(r.pinterestSearchVolume?.toLocaleString(), 8) + fmt(r.topPinScore, 7) +
    fmt(r.topPinSaves, 7) + r.recommendation
  );
}

// GEO opportunities
console.log("");
console.log("═".repeat(W));
console.log("🤖 TOP GEO POTENTIAL — Citabilité AI Overviews (Google, ChatGPT, Perplexity)");
console.log("═".repeat(W));
const topGeo = [...results].sort((a, b) => b.geoPot - a.geoPot).slice(0, 12);
console.log("KEYWORD".padEnd(38) + "GEO".padEnd(6) + "AI Ov".padEnd(7) + "KD".padEnd(5) + "G.Vol".padEnd(8) + "PAA/FAQ".padEnd(9) + "Recipes".padEnd(8));
console.log("-".repeat(W));
for (const r of topGeo) {
  const hasPaa = r.serpFeatures.some(f => /people also ask/i.test(f));
  const hasRecipes = r.serpFeatures.some(f => /recipes/i.test(f));
  console.log(
    r.keyword.slice(0, 36).padEnd(38) + fmt(r.geoPot, 6) + fmt(r.hasAiOverview ? "✅" : "❌", 7) +
    fmt(r.kd, 5) + fmt(r.googleVolume?.toLocaleString(), 8) + fmt(hasPaa ? "✅" : "❌", 9) +
    fmt(hasRecipes ? "✅" : "❌", 8)
  );
}

// Save JSON
const out = {
  generatedAt: new Date().toISOString(),
  sources: {
    semrush: { file: "healthy-dinner-recipes-for-two_bulk_us_2026-07-12_18-02-33.csv", keywords: semrushData.length },
    pinclicks: { file: "recipes for two top chearch - recipes-interests.csv", keywords: pinclicksData.length },
    pinData: { file: "pin data - recipes-pins.csv", pins: pinData.length },
  },
  distribution: { DUAL_CHAMPION: ch.length, PINTEREST_PLAY: pp.length, GOOGLE_PLAY: gp.length, LONG_TAIL: lt.length },
  dualChampions: ch.map(r => ({ keyword: r.keyword, googleVolume: r.googleVolume, kd: r.kd, pinterestSearchVolume: r.pinterestSearchVolume, topPinScore: r.topPinScore, topPinSaves: r.topPinSaves, geoPotential: r.geoPot, dualScore: r.dualScore, recommendation: r.recommendation })),
  pinterestPlays: pp.map(r => ({ keyword: r.keyword, pinterestSearchVolume: r.pinterestSearchVolume, topPinScore: r.topPinScore, dualScore: r.dualScore })),
  geoOpportunities: topGeo.map(r => ({ keyword: r.keyword, geoPotential: r.geoPot, hasAiOverview: r.hasAiOverview, kd: r.kd, googleVolume: r.googleVolume })),
};

const outPath = "/home/user/ai-blog-builder/data/cross-channel-analysis.json";
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\n✅ Rapport JSON: ${outPath}`);
