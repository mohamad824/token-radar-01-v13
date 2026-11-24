// token-radar-01 v13 — EXPECTED VALUE board.
// main.ts (Node 22, stdlib only, erasable TS, deterministic, no network).
// Reads the sealed snapshot, fits model A (ridge lam30, log10 mcap, clean-92)
// plus challengers B/C/D-24/curve/prior/asymmetric, fits the odds ensemble
// (50% richer logistic + 30% empirical cat x age-band shrink 10 + 20% base),
// ranks the 198-row board by EXPECTED launch value (implied-if-launches x
// launch odds), writes board.json + dashboard data.js, copies dashboard/ and
// screenshots/ to /output, and writes dossier.json via vendor/makefun-board.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-board.ts";

const NODE = "node22";
void NODE;
const args = process.argv.slice(2);
function argVal(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1]! : null;
}
const outDir =
  argVal("--output") || process.env.MAKEFUN_OUTPUT_DIR || "/output";
const inPath = argVal("--input") || "/input/snapshot.json";
const here = dirname(fileURLToPath(import.meta.url));
const snapPath = inPath.startsWith("/") ? inPath : join(here, inPath);
const snap = JSON.parse(readFileSync(snapPath, "utf8"));
const OUT = outDir.startsWith("/") ? outDir : join(here, outDir);

// ---------- small deterministic helpers ----------
function qtl(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}
function srt(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}
function med(a: number[]): number {
  return qtl(srt(a), 0.5);
}
function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}
function sdPop(a: number[]): number {
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) * (v - m))));
}
function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    dx += (xs[i]! - mx) ** 2;
    dy += (ys[i]! - my) ** 2;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((r, i) => r[n]! / M[i]![i]!);
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function fmtUsd(n: number): string {
  return "$" + fmtInt(n);
}
function fmtM(n: number): string {
  return "$" + (n / 1e6).toFixed(1) + "M";
}
function r3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function r2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ---------- snapshot, eligibility, fit set ----------
type Proto = {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
};
const protos: Proto[] = snap.protocols;
const watchlist: string[] = snap.watchlist;
const watchSet = new Set(watchlist);
const asOf = new Date(snap.as_of + "T00:00:00Z").getTime();
const EXCL_CAT = new Set(["Bridge", "Canonical Bridge", "Liquid Staking", "Liquid Restaking", "Restaked BTC", "CEX"]);
const EXCH = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
const VERS = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAP = /\b(wrapped|staked|staking)\b/i;
function clean(p: Proto): boolean {
  return (
    !EXCL_CAT.has(p.category ?? "") &&
    !EXCH.test(p.name) &&
    !VERS.test(p.name) &&
    !WRAP.test(p.name)
  );
}
function ageDays(p: Proto): number | null {
  if (!p.listed_at) return null;
  return Math.max(1, Math.round((asOf - new Date(p.listed_at + "T00:00:00Z").getTime()) / 86400000));
}
function ageYears(p: Proto): number | null {
  const d = ageDays(p);
  return d === null ? null : Math.max(d / 365.25, 1 / 365.25);
}
const traded = protos.filter((p) => p.mcap_usd && p.mcap_usd > 0 && p.tvl_usd > 0 && clean(p));
const pretoken = protos.filter((p) => !p.gecko_id && !p.symbol);
const elig = pretoken.filter(clean);
const allAges = protos.map(ageYears).filter((a): a is number => a !== null);
const medAge = med(allAges);
// category counts among traded comps -> TOPCATS (>=5)
const catCount = new Map<string, number>();
for (const p of traded) if (p.category) catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
const TOPCATS = [...catCount.entries()].filter(([, n]) => n >= 5).map(([c]) => c).sort();
const catN = new Map<string, number>();
for (const p of traded) catN.set(p.category ?? "none", (catN.get(p.category ?? "none") ?? 0) + 1);
// pct-in-category (TVL percentile within category, over ALL protocols)
const tvlByCat = new Map<string, number[]>();
for (const p of protos) {
  const k = p.category ?? "none";
  if (!tvlByCat.has(k)) tvlByCat.set(k, []);
  tvlByCat.get(k)!.push(p.tvl_usd);
}
for (const v of tvlByCat.values()) v.sort((a, b) => a - b);
function pctInCat(p: Proto): number {
  const arr = tvlByCat.get(p.category ?? "none")!;
  const idx = arr.indexOf(p.tvl_usd);
  return idx / Math.max(arr.length - 1, 1);
}
// features: [log10 TVL, growth] + TOPCATS dummies
function feats(p: Proto, extra: string[] = []): number[] {
  const lt = Math.log10(p.tvl_usd);
  const g = (p.change_7d ?? 0) / 100;
  const a = ageYears(p) ?? medAge;
  const x: number[] = [lt, g];
  for (const c of TOPCATS) x.push(p.category === c ? 1 : 0);
  if (extra.includes("age")) x.push(Math.log10(a));
  if (extra.includes("chains")) x.push(Math.log10(p.chains.length));
  if (extra.includes("sq")) x.push(lt * lt);
  return x;
}
function ridgeFit(X: number[][], y: number[], lam: number): { b: number[]; mu: number[]; sd: number[] } {
  const n = X.length;
  const k = X[0]!.length;
  const mu: number[] = [];
  const sd: number[] = [];
  for (let j = 0; j < k; j++) {
    const col = X.map((r) => r[j]!);
    mu.push(mean(col));
    const s = sdPop(col);
    sd.push(s === 0 ? 1 : s);
  }
  const Xs = X.map((r) => [1, ...r.map((v, j) => (v - mu[j]!) / sd[j]!)]);
  const m = k + 1;
  const A: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const bv: number[] = new Array<number>(m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < m; a++) {
      bv[a]! += Xs[i]![a]! * y[i]!;
      for (let b2 = 0; b2 < m; b2++) A[a]![b2]! += Xs[i]![a]! * Xs[i]![b2]!;
    }
  }
  for (let a = 0; a < m; a++) A[a]![a]! += a === 0 ? 0 : lam;
  return { b: solve(A, bv), mu, sd };
}
function ridgePred(mod: { b: number[]; mu: number[]; sd: number[] }, X: number[][]): number[] {
  return X.map((r) => {
    let s = mod.b[0]!;
    for (let j = 0; j < r.length; j++) s += mod.b[j + 1]! * ((r[j]! - mod.mu[j]!) / mod.sd[j]!);
    return s;
  });
}
const yLog = traded.map((p) => Math.log10(p.mcap_usd!));
const yMult = traded.map((p) => Math.log10(p.mcap_usd! / p.tvl_usd));
const listedIdx = traded.map((_, i) => i).sort((a, b) => (traded[a]!.listed_at ?? "9999").localeCompare(traded[b]!.listed_at ?? "9999"));
const multsTraded = traded.map((p) => p.mcap_usd! / p.tvl_usd);
const CAP = qtl(srt(multsTraded), 0.9);
const MED_MULT = med(multsTraded);
function errFactor(errs: number[], metric: "med" | "mean"): number {
  const a = errs.map((e) => Math.abs(e));
  return 10 ** (metric === "med" ? med(a) : mean(a));
}
// generic held-out evaluation for a predictor (train idx, test idx) -> predictions of log10 mcap
type PredFn = (tr: number[], te: number[]) => number[];
function evalHeldOut(pred: PredFn): { looMed: number; looMean: number; wfMed: number; wfMean: number; wfCutsMed: number[]; wfCutsMean: number[]; new35Med: number } {
  const n = traded.length;
  const looErr: number[] = [];
  for (let i = 0; i < n; i++) {
    const tr = traded.map((_, j) => j).filter((j) => j !== i);
    looErr.push(pred(tr, [i])[0]! - yLog[i]!);
  }
  const wfMed: number[] = [];
  const wfMean: number[] = [];
  for (const c of [0.4, 0.5, 0.67]) {
    const cut = Math.floor(n * c);
    const tr = listedIdx.slice(0, cut);
    const te = listedIdx.slice(cut);
    const pr = pred(tr, te);
    const errs = te.map((t, k) => pr[k]! - yLog[t]!);
    wfMed.push(errFactor(errs, "med"));
    wfMean.push(errFactor(errs, "mean"));
  }
  const te35 = listedIdx.slice(n - 35);
  const tr35 = listedIdx.slice(0, n - 35);
  const pr35 = pred(tr35, te35);
  const new35Med = errFactor(te35.map((t, k) => pr35[k]! - yLog[t]!), "med");
  return {
    looMed: errFactor(looErr, "med"),
    looMean: errFactor(looErr, "mean"),
    wfMed: mean(wfMed),
    wfMean: mean(wfMean),
    wfCutsMed: wfMed,
    wfCutsMean: wfMean,
    new35Med,
  };
}
function ridgePredFn(extra: string[], lam: number, target: "mcap" | "mult"): PredFn {
  return (tr, te) => {
    const Xtr = tr.map((i) => feats(traded[i]!, extra));
    const Xte = te.map((i) => feats(traded[i]!, extra));
    const yy = target === "mcap" ? yLog : yMult;
    const m = ridgeFit(Xtr, tr.map((i) => yy[i]!), lam);
    const pr = ridgePred(m, Xte);
    if (target === "mult") return pr.map((v, k) => v + Math.log10(traded[te[k]!]!.tvl_usd));
    return pr;
  };
}
// model A / B / C
const evA = evalHeldOut(ridgePredFn([], 30, "mcap"));
const evB = evalHeldOut(ridgePredFn([], 3, "mult"));
const predC: PredFn = (tr, te) => {
  const Xtr = tr.map((i) => {
    const p = traded[i]!;
    const x = [(p.change_7d ?? 0) / 100];
    for (const c of TOPCATS) x.push(p.category === c ? 1 : 0);
    return x;
  });
  const Xte = te.map((i) => {
    const p = traded[i]!;
    const x = [(p.change_7d ?? 0) / 100];
    for (const c of TOPCATS) x.push(p.category === c ? 1 : 0);
    return x;
  });
  const yy = tr.map((i) => yLog[i]! - 0.45 * Math.log10(traded[i]!.tvl_usd));
  const m = ridgeFit(Xtr, yy, 1);
  const pr = ridgePred(m, Xte);
  return pr.map((v, k) => v + 0.45 * Math.log10(traded[te[k]!]!.tvl_usd));
};
const evC = evalHeldOut(predC);
// D-24: OLS log-log + shrunk per-category median residual shift, k=3
function d24Pred(tr: number[], te: number[]): number[] {
  // JAHP07: OLS log-log on logTVL ONLY + per-category median residual shift, shrunk n/(n+3)
  const Xtr = tr.map((i) => [Math.log10(traded[i]!.tvl_usd)]);
  const m = ridgeFit(Xtr, tr.map((i) => yLog[i]!), 1e-8);
  const base = ridgePred(m, te.map((i) => [Math.log10(traded[i]!.tvl_usd)]));
  const resTr = ridgePred(m, Xtr).map((v, k) => yLog[tr[k]!]! - v);
  const byCat = new Map<string, number[]>();
  tr.forEach((i, k) => {
    const c = traded[i]!.category ?? "none";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(resTr[k]!);
  });
  return base.map((v, k) => {
    const c = traded[te[k]!]!.category ?? "none";
    const arr = byCat.get(c);
    if (!arr) return v;
    const shift = med(arr) * (arr.length / (arr.length + 3));
    return v + shift;
  });
}
const evD24 = evalHeldOut(d24Pred);
// curve challenger D-52 (wiliamkesh, full model): OLS of ln(winsorised multiple
// [0.01,3]) on ln(TVL); curve_mult = clamp(exp(a+b*ln TVL),0.01,1.0);
// growth multiplier gm = 1 + clamp(change_7d,-60,200)/100*0.75;
// maturity mm = 0.6 + min(ageDays,1095)/1095*0.4 (unknown age -> 365d).
// Held-out: curve refit per fold on the train comps. Board: fit on clean-92.
function curveFitOLS(comps: Proto[]): { a: number; b: number } {
  const xs = comps.map((p) => Math.log(p.tvl_usd));
  const ys = comps.map((p) => Math.log(Math.min(3, Math.max(0.01, p.mcap_usd! / p.tvl_usd))));
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const b = den > 0 ? num / den : 0;
  return { a: my - b * mx, b };
}
function wiliLogMcap(p: Proto, cf: { a: number; b: number }): number {
  const cm = Math.min(1, Math.max(0.01, Math.exp(cf.a + cf.b * Math.log(p.tvl_usd))));
  const g = Math.min(200, Math.max(-60, p.change_7d ?? 0));
  const gm = 1 + (g / 100) * 0.75;
  const age = ageDays(p) ?? 365;
  const mm = 0.6 + (Math.min(Math.max(age, 0), 1095) / 1095) * 0.4;
  return Math.log10(p.tvl_usd * cm * gm * mm);
}
function curvePred(tr: number[], te: number[]): number[] {
  const cf = curveFitOLS(tr.map((i) => traded[i]!));
  return te.map((i) => wiliLogMcap(traded[i]!, cf));
}
const evCurve = evalHeldOut(curvePred);
// flat baseline: median multiple of train x TVL
function flatPred(tr: number[], te: number[]): number[] {
  const mm = med(tr.map((i) => multsTraded[i]!));
  return te.map((i) => Math.log10(mm * traded[i]!.tvl_usd));
}
const evFlat = evalHeldOut(flatPred);
// D-25 prior on A predictions; D-26 asymmetric growth on A predictions
function priorOf(p: Proto): number {
  const c = (p.category ?? "").toLowerCase();
  if (c.includes("vault") || c.includes("curator")) return 0.8;
  if (c.includes("staking") || c.includes("chain")) return 0.9;
  if (!p.category) return 0.7;
  return 1.0;
}
function wrapA(factor: (p: Proto) => number): PredFn {
  return (tr, te) => {
    const base = ridgePredFn([], 30, "mcap")(tr, te);
    return base.map((v, k) => v + Math.log10(factor(traded[te[k]!]!)));
  };
}
const evD25 = evalHeldOut(wrapA((p) => priorOf(p)));
const evD26 = evalHeldOut(wrapA((p) => ((p.change_7d ?? 0) < 0 ? 0.9 : 0.6)));
// ablation table (median + mean, LOO + WF)
const ablation: { name: string; looMed: number; looMean: number; wfMed: number; wfMean: number }[] = [];
{
  const configs: { name: string; fn: PredFn }[] = [
    { name: "flat median multiple", fn: flatPred },
    { name: "size only", fn: (tr, te) => {
      const Xtr = tr.map((i) => [Math.log10(traded[i]!.tvl_usd)]);
      const Xte = te.map((i) => [Math.log10(traded[i]!.tvl_usd)]);
      const m = ridgeFit(Xtr, tr.map((i) => yLog[i]!), 30);
      return ridgePred(m, Xte);
    } },
    { name: "size+cat", fn: ridgePredFn([], 30, "mcap") },
    { name: "size+cat+growth (A)", fn: ridgePredFn([], 30, "mcap") },
    { name: "A+age", fn: ridgePredFn(["age"], 30, "mcap") },
    { name: "A+chains", fn: ridgePredFn(["chains"], 30, "mcap") },
  ];
  // size+cat uses feats without growth: rebuild via custom fn
  configs[2]!.fn = (tr, te) => {
    const Xtr = tr.map((i) => {
      const p = traded[i]!;
      const x = [Math.log10(p.tvl_usd)];
      for (const c of TOPCATS) x.push(p.category === c ? 1 : 0);
      return x;
    });
    const Xte = te.map((i) => {
      const p = traded[i]!;
      const x = [Math.log10(p.tvl_usd)];
      for (const c of TOPCATS) x.push(p.category === c ? 1 : 0);
      return x;
    });
    const m = ridgeFit(Xtr, tr.map((i) => yLog[i]!), 30);
    return ridgePred(m, Xte);
  };
  for (const c of configs) {
    const e = evalHeldOut(c.fn);
    ablation.push({ name: c.name, looMed: e.looMed, looMean: e.looMean, wfMed: e.wfMed, wfMean: e.wfMean });
  }
  // placebo: A features + deterministic pseudo-random feature (seeded shuffle of growth)
  const rngP = mulberry32(777);
  const randFeat = traded.map(() => rngP());
  const placeboFn: PredFn = (tr, te) => {
    const Xtr = tr.map((i) => [...feats(traded[i]!), randFeat[i]!]);
    const Xte = te.map((i) => [...feats(traded[i]!), randFeat[i]!]);
    const m = ridgeFit(Xtr, tr.map((i) => yLog[i]!), 30);
    return ridgePred(m, Xte);
  };
  const ep = evalHeldOut(placeboFn);
  ablation.push({ name: "placebo (random feature)", looMed: ep.looMed, looMean: ep.looMean, wfMed: ep.wfMed, wfMean: ep.wfMean });
}
// inner-LOO lambda per WF cut (lam10 vs lam30, median, train only)
const innerLam: { cut: string; lam10: number; lam30: number }[] = [];
for (const c of [0.4, 0.5, 0.67]) {
  const cut = Math.floor(traded.length * c);
  const tr = listedIdx.slice(0, cut);
  const mk = (lam: number): number => {
    const errs: number[] = [];
    for (const i of tr) {
      const tr2 = tr.filter((j) => j !== i);
      const m = ridgeFit(tr2.map((j) => feats(traded[j]!)), tr2.map((j) => yLog[j]!), lam);
      errs.push(ridgePred(m, [feats(traded[i]!)])[0]! - yLog[i]!);
    }
    return errFactor(errs, "mean");
  };
  innerLam.push({ cut: `${Math.round(c * 100)}/${Math.round((1 - c) * 100)}`, lam10: mk(10), lam30: mk(30) });
}
// full-fit model A coefficients + in-sample stats
const XtrAll = traded.map((p) => feats(p));
const modA = ridgeFit(XtrAll, yLog, 30);
const predAll = ridgePred(modA, XtrAll);
const residAll = predAll.map((v, i) => yLog[i]! - v);
const r2a = (() => {
  const my = mean(yLog);
  const ssTot = yLog.reduce((s, v) => s + (v - my) ** 2, 0);
  const ssRes = residAll.reduce((s, v) => s + v * v, 0);
  return 1 - ssRes / ssTot;
})();
const slopeRaw = modA.b[1]! / modA.sd[0]!;
const slopeStd = modA.b[1]!;
const residAbs = srt(residAll.map((v) => Math.abs(v)));
const q50res = qtl(residAbs, 0.5);
const q80res = qtl(residAbs, 0.8);

// ---------- odds ensemble ----------
// richer logistic: [logTVL, log10(age), growth, log10(nChains), log10(age)*logTVL, pctInCat] + TOPCATS
function oddsFeats(p: Proto): number[] {
  const a = ageYears(p) ?? medAge;
  const lt = Math.log10(p.tvl_usd);
  const la = Math.log10(a);
  const x = [lt, la, (p.change_7d ?? 0) / 100, Math.log10(p.chains.length), la * lt, pctInCat(p)];
  for (const c of TOPCATS) x.push(p.category === c ? 1 : 0);
  return x;
}
const yo = protos.map((p) => (p.gecko_id || p.symbol ? 1 : 0));
const baseRate = mean(yo);
function fitLogit(X: number[][], y: number[], lam: number): { b: number[]; mu: number[]; sd: number[] } {
  const k = X[0]!.length;
  const mu = X[0]!.map((_, j) => mean(X.map((r) => r[j]!)));
  const sd = X[0]!.map((_, j) => {
    const s = sdPop(X.map((r) => r[j]!));
    return s === 0 ? 1 : s;
  });
  const Xs = X.map((r) => r.map((v, j) => (v - mu[j]!) / sd[j]!));
  const n = X.length;
  let b = new Array<number>(k + 1).fill(0);
  const nll = (bb: number[]): number => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const z = bb[0]! + Xs[i]!.reduce((t, v, j) => t + v * bb[j + 1]!, 0);
      const la = z >= 0 ? Math.log1p(Math.exp(-z)) : -z + Math.log1p(Math.exp(z));
      const lb = z >= 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z));
      s += y[i]! * la + (1 - y[i]!) * lb;
    }
    s += 0.5 * lam * b.slice(1).reduce((t, v) => t + v * v, 0);
    return s;
  };
  // Newton with step halving, 60 iterations
  for (let it = 0; it < 60; it++) {
    const g = new Array<number>(k + 1).fill(0);
    const H: number[][] = Array.from({ length: k + 1 }, () => new Array<number>(k + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const z = b[0]! + Xs[i]!.reduce((t, v, j) => t + v * b[j + 1]!, 0);
      const pr = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
      const d = pr - y[i]!;
      const w = Math.max(pr * (1 - pr), 1e-6);
      const xi = [1, ...Xs[i]!];
      for (let a = 0; a <= k; a++) {
        g[a]! += d * xi[a]!;
        for (let c = 0; c <= k; c++) H[a]![c]! += w * xi[a]! * xi[c]!;
      }
    }
    for (let a = 1; a <= k; a++) {
      g[a]! += lam * b[a]!;
      H[a]![a]! += lam;
    }
    const step = solve(H, g.map((v) => -v));
    let t = 1;
    const cur = nll(b);
    let nb = b.map((v, i) => v + t * step[i]!);
    while (nll(nb) > cur && t > 1 / 64) {
      t /= 2;
      nb = b.map((v, i) => v + t * step[i]!);
    }
    const delta = Math.max(...nb.map((v, i) => Math.abs(v - b[i]!)));
    b = nb;
    if (delta < 1e-7) break;
  }
  return { b, mu, sd };
}
function logitPred(mod: { b: number[]; mu: number[]; sd: number[] }, X: number[][]): number[] {
  return X.map((r) => {
    const z = mod.b[0]! + r.reduce((t, v, j) => t + ((v - mod.mu[j]!) / mod.sd[j]!) * mod.b[j + 1]!, 0);
    const zc = Math.max(-30, Math.min(30, z));
    return 1 / (1 + Math.exp(-zc));
  });
}
function ageBand(a: number | null): string {
  if (a === null) return "unknown";
  if (a < 0.25) return "<90d";
  if (a < 1) return "90d-1y";
  if (a < 2) return "1-2y";
  return ">2y";
}
function empirPred(tr: number[], p: Proto, shrink: number, base: number): number {
  const stats = new Map<string, [number, number]>();
  const bands = new Map<string, [number, number]>();
  for (const i of tr) {
    const q = protos[i]!;
    const k = `${ageBand(ageYears(q))}|${q.category ?? "none"}`;
    const s = stats.get(k) ?? [0, 0];
    s[0] += yo[i]!;
    s[1] += 1;
    stats.set(k, s);
    const bk = ageBand(ageYears(q));
    const s2 = bands.get(bk) ?? [0, 0];
    s2[0] += yo[i]!;
    s2[1] += 1;
    bands.set(bk, s2);
  }
  const k = `${ageBand(ageYears(p))}|${p.category ?? "none"}`;
  const s = stats.get(k);
  if (s && s[1] >= 5) return (s[0] + shrink * base) / (s[1] + shrink);
  const b = bands.get(ageBand(ageYears(p)));
  if (b && b[1] >= 5) return (b[0] + shrink * base) / (b[1] + shrink);
  return base;
}
const orderAll = protos.map((_, i) => i).sort((a, b) => (protos[a]!.listed_at ?? "9999").localeCompare(protos[b]!.listed_at ?? "9999"));
function brier(pr: number[], y: number[]): number {
  return mean(pr.map((v, i) => (v - y[i]!) ** 2));
}
// WF odds evaluation, 3 cuts, ensemble 50/30/20
const oddsWF: { cut: string; brierEns: number; brierLog: number; brierEmp: number; brierBase: number; called: number }[] = [];
const tierPool: { high: [number, number]; med: [number, number]; low: [number, number] } = { high: [0, 0], med: [0, 0], low: [0, 0] };
for (const c of [0.4, 0.5, 0.67]) {
  const cut = Math.floor(protos.length * c);
  const tr = orderAll.slice(0, cut);
  const te = orderAll.slice(cut);
  const baseTr = baseRate;
  const lg = fitLogit(tr.map((i) => oddsFeats(protos[i]!)), tr.map((i) => yo[i]!), 1);
  const prLog = logitPred(lg, te.map((i) => oddsFeats(protos[i]!)));
  const prEmp = te.map((i) => empirPred(tr, protos[i]!, 10, baseTr));
  const prEns = prLog.map((v, k) => 0.5 * v + 0.3 * prEmp[k]! + 0.2 * baseTr);
  const yte = te.map((i) => yo[i]!);
  const brBase = mean(yte) * (1 - mean(yte));
  const called = mean(prEns.map((v, k) => ((v >= 0.5 ? 1 : 0) === yte[k]! ? 1 : 0)));
  oddsWF.push({
    cut: `${Math.round(c * 100)}/${Math.round((1 - c) * 100)}`,
    brierEns: brier(prEns, yte),
    brierLog: brier(prLog, yte),
    brierEmp: brier(prEmp, yte),
    brierBase: brBase,
    called,
  });
  // tier pooled: terciles of ensemble odds on this test set
  const ranked = te.map((_, k) => k).sort((a, b) => prEns[a]! - prEns[b]!);
  const third = Math.floor(ranked.length / 3);
  const tiers: [number[], number[], number[]] = [ranked.slice(0, third), ranked.slice(third, 2 * third), ranked.slice(2 * third)];
  const keys: ("low" | "med" | "high")[] = ["low", "med", "high"];
  tiers.forEach((grp, ti) => {
    const tok = grp.reduce((s, k) => s + yte[k]!, 0);
    tierPool[keys[ti]!]![0] += tok;
    tierPool[keys[ti]!]![1] += grp.length;
  });
}
// full-fit odds per eligible row, rounded to 3dp ONCE; downstream uses rounded odds
const logitAll = fitLogit(protos.map(oddsFeats), yo, 1);
const allIdx = protos.map((_, i) => i);
const oddsLogAll = logitPred(logitAll, protos.map(oddsFeats));
const oddsEmpAll = protos.map((p) => empirPred(allIdx, p, 10, baseRate));
const oddsRaw = protos.map((_, i) => 0.5 * oddsLogAll[i]! + 0.3 * oddsEmpAll[i]! + 0.2 * baseRate);
const oddsOf = new Map<string, number>();
elig.forEach((p) => {
  const i = protos.indexOf(p);
  oddsOf.set(p.slug, r3(Math.max(0.001, Math.min(0.999, oddsRaw[i]!))));
});
const oddsVals = elig.map((p) => oddsOf.get(p.slug)!);
const oddsSorted = srt(oddsVals);
const tierCutLo = qtl(oddsSorted, 1 / 3);
const tierCutHi = qtl(oddsSorted, 2 / 3);
function tierOf(o: number): string {
  return o < tierCutLo ? "LOW" : o < tierCutHi ? "MED" : "HIGH";
}

// ---------- implied-if-launches (model A), EV, ranking ----------
const Xel = elig.map((p) => feats(p));
const predEl = ridgePred(modA, Xel);
const impliedIf: number[] = predEl.map((v, i) => {
  const raw = 10 ** v;
  const capped = Math.min(raw / elig[i]!.tvl_usd, CAP) * elig[i]!.tvl_usd;
  return Math.max(1, Math.round(capped));
});
const evVal: number[] = elig.map((p, i) => Math.max(1, Math.round(impliedIf[i]! * oddsOf.get(p.slug)!)));
const totalImplied = impliedIf.reduce((s, v) => s + v, 0);
const totalEV = evVal.reduce((s, v) => s + v, 0);
// rank by EV desc, ties: implied desc, then slug
const orderEV = elig.map((_, i) => i).sort((a, b) => {
  if (evVal[b]! !== evVal[a]!) return evVal[b]! - evVal[a]!;
  if (impliedIf[b]! !== impliedIf[a]!) return impliedIf[b]! - impliedIf[a]!;
  return elig[a]!.slug.localeCompare(elig[b]!.slug);
});
const orderImpl = elig.map((_, i) => i).sort((a, b) => {
  if (impliedIf[b]! !== impliedIf[a]!) return impliedIf[b]! - impliedIf[a]!;
  return elig[a]!.slug.localeCompare(elig[b]!.slug);
});
const rankEV = new Map<number, number>();
const rankImpl = new Map<number, number>();
orderEV.forEach((idx, r) => rankEV.set(idx, r + 1));
orderImpl.forEach((idx, r) => rankImpl.set(idx, r + 1));
const rankShifts = elig.map((_, i) => Math.abs(rankEV.get(i)! - rankImpl.get(i)!));
const medShift = med(rankShifts);
const top10EV = new Set(orderEV.slice(0, 10));
const top10Impl = new Set(orderImpl.slice(0, 10));
let top10Overlap = 0;
top10EV.forEach((i) => { if (top10Impl.has(i)) top10Overlap++; });
// Spearman EV-rank vs implied-rank
const spearmanEV = (() => {
  const xs = elig.map((_, i) => rankEV.get(i)!);
  const ys = elig.map((_, i) => rankImpl.get(i)!);
  return pearson(xs, ys);
})();
const maxMult = Math.max(...elig.map((p, i) => impliedIf[i]! / p.tvl_usd));
const capBinds = elig.filter((p, i) => 10 ** predEl[i]! / p.tvl_usd > CAP).length;
const top1EVIdx = orderEV[0]!;
const top1ImplIdx = orderImpl[0]!;

// ---------- ranges ----------
function wfCoverage(kIn: number, kOut: number): { inner: number; outer: number } {
  const inn: number[] = [];
  const out: number[] = [];
  for (const c of [0.5, 0.67]) {
    const cut = Math.floor(traded.length * c);
    const tr = listedIdx.slice(0, cut);
    const te = listedIdx.slice(cut);
    const m = ridgeFit(tr.map((i) => feats(traded[i]!)), tr.map((i) => yLog[i]!), 30);
    const resTr = ridgePred(m, tr.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[tr[k]!]!));
    const q50 = qtl(srt(resTr), 0.5);
    const q80 = qtl(srt(resTr), 0.8);
    const errTe = ridgePred(m, te.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[te[k]!]!));
    inn.push(mean(errTe.map((e) => (e <= kIn * q50 ? 1 : 0))));
    out.push(mean(errTe.map((e) => (e <= kOut * q80 ? 1 : 0))));
  }
  return { inner: mean(inn), outer: mean(out) };
}
const rangeWF = wfCoverage(1.5, 1.6);
const rangeWF18 = wfCoverage(1.5, 1.8);
// clean-cut n=31: train oldest 67%, in-sample quantile bands, test newest 31
const cleanCut = (() => {
  const cut = Math.floor(traded.length * 0.67);
  const tr = listedIdx.slice(0, cut);
  const te = listedIdx.slice(cut);
  const m = ridgeFit(tr.map((i) => feats(traded[i]!)), tr.map((i) => yLog[i]!), 30);
  const resTr = ridgePred(m, tr.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[tr[k]!]!));
  const q50 = qtl(srt(resTr), 0.5);
  const q80 = qtl(srt(resTr), 0.8);
  const errTe = ridgePred(m, te.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[te[k]!]!));
  return {
    n: te.length,
    inner: mean(errTe.map((e) => (e <= 1.5 * q50 ? 1 : 0))),
    outer: mean(errTe.map((e) => (e <= 1.6 * q80 ? 1 : 0))),
    bandIn: 10 ** (1.5 * q50),
    bandOut: 10 ** (1.6 * q80),
  };
})();
// per-row range factors from full-fit residuals (displayed bands)
const wIn = 10 ** (1.5 * q50res);
const wOut = 10 ** (1.6 * q80res);
// jackknife+ (Barber et al.): WF 67/33 split; LOO models inside train; 50% interval;
// band = 10^(median half-width)
const jack = (() => {
  const cut = Math.floor(traded.length * 0.67);
  const tr = listedIdx.slice(0, cut);
  const te = listedIdx.slice(cut);
  // LOO models inside train
  const looModels: { b: number[]; mu: number[]; sd: number[] }[] = [];
  for (const j of tr) {
    const tr2 = tr.filter((k) => k !== j);
    looModels.push(ridgeFit(tr2.map((k) => feats(traded[k]!)), tr2.map((k) => yLog[k]!), 30));
  }
  let inside = 0;
  const halfWidths: number[] = [];
  te.forEach((i) => {
    const lo: number[] = [];
    const hi: number[] = [];
    tr.forEach((j, jj) => {
      const pr = ridgePred(looModels[jj]!, [feats(traded[i]!)])[0]!;
      const r = Math.abs(ridgePred(looModels[jj]!, [feats(traded[j]!)])[0]! - yLog[j]!);
      lo.push(pr - r);
      hi.push(pr + r);
    });
    const l = qtl(srt(lo), 0.25);
    const h = qtl(srt(hi), 0.75);
    halfWidths.push((h - l) / 2);
    if (yLog[i]! >= l && yLog[i]! <= h) inside++;
  });
  return { inner: inside / te.length, band: 10 ** med(halfWidths) };
})();
// Mondrian per-TVL-tercile: split-conformal per tercile on WF cuts 50/50 + 67/33
// (half-width = median |train resid| inside the row's own TVL tercile)
const mondrian = (() => {
  const tvls = traded.map((p) => Math.log10(p.tvl_usd));
  const t1 = qtl(srt(tvls), 1 / 3);
  const t2 = qtl(srt(tvls), 2 / 3);
  const terc = (i: number) => (tvls[i]! < t1 ? 0 : tvls[i]! < t2 ? 1 : 2);
  const covs: number[] = [];
  for (const c of [0.5, 0.67]) {
    const cut = Math.floor(traded.length * c);
    const tr = listedIdx.slice(0, cut);
    const te = listedIdx.slice(cut);
    const m = ridgeFit(tr.map((i) => feats(traded[i]!)), tr.map((i) => yLog[i]!), 30);
    const resTr = ridgePred(m, tr.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[tr[k]!]!));
    const errTe = ridgePred(m, te.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[te[k]!]!));
    let inside = 0;
    te.forEach((t, k) => {
      const peers = resTr.filter((_, j) => terc(tr[j]!) === terc(t));
      const hw = qtl(srt(peers), 0.5);
      if (errTe[k]! <= hw) inside++;
    });
    covs.push(inside / te.length);
  }
  return { inner: mean(covs) };
})();
// CQR-lite: pinball ridge q25/q75, WF 50/50 + 67/33 coverage
function pinballFit(X: number[][], y: number[], q: number, lam: number, iters: number): { b: number[]; mu: number[]; sd: number[] } {
  const k = X[0]!.length;
  const mu = X[0]!.map((_, j) => mean(X.map((r) => r[j]!)));
  const sd = X[0]!.map((_, j) => {
    const s = sdPop(X.map((r) => r[j]!));
    return s === 0 ? 1 : s;
  });
  const Xs = X.map((r) => [1, ...r.map((v, j) => (v - mu[j]!) / sd[j]!)]);
  let b = new Array<number>(k + 1).fill(0);
  b[0] = qtl(srt(y), q);
  for (let it = 0; it < iters; it++) {
    const lr = 0.05 / Math.sqrt(it + 1);
    const g = new Array<number>(k + 1).fill(0);
    for (let i = 0; i < y.length; i++) {
      const pr = Xs[i]!.reduce((t, v, j) => t + v * b[j]!, 0);
      const r = y[i]! - pr;
      const d = r < 0 ? q - 1 : q;
      for (let j = 0; j <= k; j++) g[j]! += -d * Xs[i]![j]!;
    }
    for (let j = 0; j <= k; j++) {
      const reg = j === 0 ? 0 : lam * b[j]!;
      b[j] = b[j]! - lr * (g[j]! / y.length + reg / y.length);
    }
  }
  return { b, mu, sd };
}
const cqr = (() => {
  const covs: number[] = [];
  for (const c of [0.5, 0.67]) {
    const cut = Math.floor(traded.length * c);
    const tr = listedIdx.slice(0, cut);
    const te = listedIdx.slice(cut);
    const Xtr = tr.map((i) => feats(traded[i]!));
    const ytr = tr.map((i) => yLog[i]!);
    const lo = pinballFit(Xtr, ytr, 0.25, 1, 800);
    const hi = pinballFit(Xtr, ytr, 0.75, 1, 800);
    const Xte = te.map((i) => feats(traded[i]!));
    const plo = ridgePred(lo, Xte);
    const phi = ridgePred(hi, Xte);
    covs.push(mean(te.map((t, k) => (yLog[t]! >= plo[k]! && yLog[t]! <= phi[k]! ? 1 : 0))));
  }
  return { inner: mean(covs) };
})();
// D-41: inner coverage per TVL tercile on WF folds (k=1.5)
const tercCov = (() => {
  const tvls = traded.map((p) => Math.log10(p.tvl_usd));
  const t1 = qtl(srt(tvls), 1 / 3);
  const t2 = qtl(srt(tvls), 2 / 3);
  const terc = (i: number) => (tvls[i]! < t1 ? 0 : tvls[i]! < t2 ? 1 : 2);
  const acc: number[][] = [[], [], []];
  for (const c of [0.5, 0.67]) {
    const cut = Math.floor(traded.length * c);
    const tr = listedIdx.slice(0, cut);
    const te = listedIdx.slice(cut);
    const m = ridgeFit(tr.map((i) => feats(traded[i]!)), tr.map((i) => yLog[i]!), 30);
    const resTr = ridgePred(m, tr.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[tr[k]!]!));
    const q50 = qtl(srt(resTr), 0.5);
    const errTe = ridgePred(m, te.map((i) => feats(traded[i]!))).map((v, k) => Math.abs(v - yLog[te[k]!]!));
    te.forEach((t, k) => acc[terc(t)]!.push(errTe[k]! <= 1.5 * q50 ? 1 : 0));
  }
  return acc.map((a) => (a.length ? mean(a) : 0));
})();
// D-43: |LOO resid| vs growth correlation
const looResidA: number[] = [];
for (let i = 0; i < traded.length; i++) {
  const tr = traded.map((_, j) => j).filter((j) => j !== i);
  const m = ridgeFit(tr.map((j) => feats(traded[j]!)), tr.map((j) => yLog[j]!), 30);
  looResidA.push(Math.abs(ridgePred(m, [feats(traded[i]!)])[0]! - yLog[i]!));
}
const d43 = pearson(looResidA, traded.map((p) => (p.change_7d ?? 0) / 100));

// ---------- verdict economics (default $5K / 12wk / 7%, thresholds ±$25, net FLOAT) ----------
const GAS: Record<string, number> = { Ethereum: 8, Base: 0.05, Solana: 0.01, Arbitrum: 0.2, Binance: 0.15, Avalanche: 0.3 };
function gasOf(p: Proto): number {
  if (!p.chains.length) return 1;
  return Math.min(...p.chains.map((c) => GAS[c] ?? 1));
}
function cheapestChain(p: Proto): string {
  if (!p.chains.length) return "its main chain";
  let best = p.chains[0]!;
  for (const c of p.chains) if ((GAS[c] ?? 1) < (GAS[best] ?? 1)) best = c;
  return best;
}
function slice1000(p: Proto, i: number): number {
  return 1000 * (impliedIf[i]! / p.tvl_usd) * 0.07 * oddsOf.get(p.slug)!;
}
function netOf(p: Proto, i: number, plan: number, hz: number, drop: number): number {
  const slice = 1000 * (impliedIf[i]! / p.tvl_usd) * drop * oddsOf.get(p.slug)!;
  return slice * (plan / 1000) - (2 * gasOf(p) + plan * 0.001) - plan * 0.04 * (hz / 52);
}
function netLogShare(p: Proto, i: number, plan: number): number {
  // log-share: payout grows as ln(1+plan/1000) x the $1K slice, costs linear
  return slice1000(p, i) * Math.log(1 + plan / 1000) - (2 * gasOf(p) + plan * 0.001) - plan * 0.04 * (12 / 52);
}
function verdictOf(net: number): string {
  return net > 25 ? "FARM" : net < -25 ? "SKIP" : "MARGINAL";
}
const nets = elig.map((p, i) => netOf(p, i, 5000, 12, 0.07));
const verdicts = nets.map(verdictOf);
const splitVerdict = {
  FARM: verdicts.filter((v) => v === "FARM").length,
  MARGINAL: verdicts.filter((v) => v === "MARGINAL").length,
  SKIP: verdicts.filter((v) => v === "SKIP").length,
};
function countsOf(fn: (p: Proto, i: number) => number): { FARM: number; MARGINAL: number; SKIP: number } {
  const c = { FARM: 0, MARGINAL: 0, SKIP: 0 };
  elig.forEach((p, i) => {
    c[verdictOf(fn(p, i)) as "FARM" | "MARGINAL" | "SKIP"]++;
  });
  return c;
}
const d47 = {
  typical: countsOf((p, i) => {
    const slice = slice1000(p, i) * 0.926;
    return slice * 5 - (2 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52);
  }),
  harsh: countsOf((p, i) => {
    const slice = slice1000(p, i) * 0.707;
    return slice * 5 - (2 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52);
  }),
  generous: countsOf((p, i) => {
    const slice = slice1000(p, i) * 0.954;
    return slice * 5 - (2 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52);
  }),
};
const d48 = {
  bear: countsOf((p, i) => netOf({ ...p, tvl_usd: p.tvl_usd }, i, 5000, 12, 0.07) * 0 + (slice1000(p, i) * 0.33 * 5 - (2 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52))),
  bull25: countsOf((p, i) => slice1000(p, i) * 2.5 * 5 - (2 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52)),
  bull30: countsOf((p, i) => slice1000(p, i) * 3.0 * 5 - (2 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52)),
};
const d49 = {
  k1: countsOf((p, i) => netLogShare(p, i, 1000)),
  k5: countsOf((p, i) => netLogShare(p, i, 5000)),
  k25: countsOf((p, i) => netLogShare(p, i, 25000)),
};
const d51 = countsOf((p, i) => slice1000(p, i) * 5 - (8 * gasOf(p) + 5) - 5000 * 0.04 * (12 / 52));
// D-03 break-even capital: net(C)=0 -> C = 2*gas / (slice/1000 - 0.001 - 0.04*12/52); never if denom<=0
function breakEven(p: Proto, i: number): number | null {
  const denom = slice1000(p, i) / 1000 - 0.001 - (0.04 * 12) / 52;
  if (denom <= 0) return null;
  return (2 * gasOf(p)) / denom;
}
const beVals = elig.map((p, i) => breakEven(p, i));
const beFinite = beVals.filter((v): v is number => v !== null);
const beStats = {
  finite: beFinite.length,
  never: beVals.length - beFinite.length,
  median: beFinite.length ? med(beFinite) : 0,
  p10: beFinite.length ? qtl(srt(beFinite), 0.1) : 0,
  p90: beFinite.length ? qtl(srt(beFinite), 0.9) : 0,
  max: beFinite.length ? Math.max(...beFinite) : 0,
  maxName: beFinite.length ? elig[beVals.indexOf(Math.max(...beFinite))]!.name : "",
};
// D-04 walk-away multiple: the factor by which the row's multiple can fall before
// net hits zero = current multiple / break-even multiple = expected payout / total cost
function walkAway(p: Proto, i: number): number | null {
  const cost = 2 * gasOf(p) + 5 + 5000 * 0.04 * (12 / 52);
  if (cost <= 0) return null;
  return (slice1000(p, i) * 5) / cost;
}
const waFarm = elig.map((p, i) => (verdicts[i] === "FARM" ? walkAway(p, i) : null)).filter((v): v is number => v !== null);
const waStats = {
  median: waFarm.length ? med(waFarm) : 0,
  p10: waFarm.length ? qtl(srt(waFarm), 0.1) : 0,
  p90: waFarm.length ? qtl(srt(waFarm), 0.9) : 0,
  min: waFarm.length ? Math.min(...waFarm) : 0,
  max: waFarm.length ? Math.max(...waFarm) : 0,
  fragile: waFarm.filter((v) => v < 2).length,
  robust: waFarm.filter((v) => v > 10).length,
  robustNames: elig.filter((p, i) => verdicts[i] === "FARM" && (walkAway(p, i) ?? 0) > 10).map((p) => p.name),
};
// D-50 EV/cost: expected $5K-plan payout / total plan cost
const evCost = elig.map((p, i) => (slice1000(p, i) * 5) / (2 * gasOf(p) + 5 + 5000 * 0.04 * (12 / 52)));
const d50 = {
  median: med(evCost),
  p90: qtl(srt(evCost), 0.9),
  max: Math.max(...evCost),
  gt1: evCost.filter((v) => v > 1).length,
  gt3: evCost.filter((v) => v > 3).length,
};
// D-51 downside/upside medians over FARM rows
const farmIdx = elig.map((_, i) => i).filter((i) => verdicts[i] === "FARM");
const d51ud = {
  upsideMed: med(farmIdx.map((i) => nets[i]!)),
  downsideMed: med(farmIdx.map((i) => -(2 * gasOf(elig[i]!) + 5 + 5000 * 0.04 * (12 / 52)))),
  downsideGtUpside: farmIdx.filter((i) => Math.abs(-(2 * gasOf(elig[i]!) + 5 + 5000 * 0.04 * (12 / 52))) > nets[i]!).length,
};
// D-55 gas-share: modal by TVL, hold days by age; total gas = gas*(2 + holdWeeks)
function d55Modal(p: Proto): number {
  return p.tvl_usd < 25e6 ? 50 : p.tvl_usd < 100e6 ? 100 : p.tvl_usd < 500e6 ? 150 : 250;
}
function d55HoldDays(p: Proto): number {
  const a = ageYears(p);
  if (a === null) return 30;
  return a >= 3 ? 60 : a >= 1 ? 45 : 30;
}
const GAS55_L2 = new Set(["Base", "Arbitrum", "Optimism", "Polygon", "Linea", "Blast", "Mantle", "Scroll", "zkSync Era"]);
function gas55(c: string): number {
  if (c === "Ethereum") return 8;
  if (c === "Solana") return 1;
  if (c === "Bitcoin") return 2;
  if (GAS55_L2.has(c)) return 1;
  return 2;
}
function gasShare(p: Proto): number {
  const g = p.chains.length ? gas55(p.chains[0]!) : 2;
  return (g * (2 + d55HoldDays(p) / 7)) / d55Modal(p);
}
const gsVals = elig.map(gasShare);
const d55 = {
  farm: gsVals.filter((v) => v <= 0.25).length,
  thin: gsVals.filter((v) => v > 0.25 && v <= 0.5).length,
  skip: gsVals.filter((v) => v > 0.5).length,
  median: med(gsVals),
  max: Math.max(...gsVals),
};
// D-56 farm value = modal x implied multiple; half-size if 7d < -10%
const farmVal = elig.map((p, i) => d55Modal(p) * (impliedIf[i]! / p.tvl_usd));
const d56 = {
  median: med(farmVal),
  max: Math.max(...farmVal),
  halfSize: elig.filter((p) => (p.change_7d ?? 0) < -10).length,
};
// D-57 signals + capital tiers
function signalsOf(p: Proto): string[] {
  const s: string[] = [];
  if ((p.change_7d ?? 0) >= 10) s.push("surging");
  if ((p.change_7d ?? 0) <= -10) s.push("sliding");
  const a = ageYears(p);
  if (a !== null && a >= 3) s.push("tokenFree3y");
  if (p.chains.length >= 8) s.push("chains8");
  if (p.tvl_usd >= 1e9) s.push("billion");
  if (watchSet.has(p.slug)) s.push("watchlist");
  return s;
}
const d57 = {
  surging: elig.filter((p) => (p.change_7d ?? 0) >= 10).length,
  sliding: elig.filter((p) => (p.change_7d ?? 0) <= -10).length,
  tokenFree3y: elig.filter((p) => { const a = ageYears(p); return a !== null && a >= 3; }).length,
  chains8: elig.filter((p) => p.chains.length >= 8).length,
  billion: elig.filter((p) => p.tvl_usd >= 1e9).length,
  watchlist: elig.filter((p) => watchSet.has(p.slug)).length,
  zeroSignals: elig.filter((p) => signalsOf(p).length === 0).length,
  tiers: (() => {
    const t = { early: 0, mid: 0, large: 0, inst: 0 };
    for (const p of elig) {
      if (p.tvl_usd < 25e6) t.early++;
      else if (p.tvl_usd < 100e6) t.mid++;
      else if (p.tvl_usd < 500e6) t.large++;
      else t.inst++;
    }
    return t;
  })(),
};
// D-33 conviction: 0.6*odds + 0.25*min(mult/2.87,1) + 0.15*min(comps/12,1), x100 rounded
function conviction(p: Proto, i: number): number {
  const comps = catN.get(p.category ?? "none") ?? 0;
  return Math.round(100 * (0.6 * oddsOf.get(p.slug)! + 0.25 * Math.min(impliedIf[i]! / p.tvl_usd / CAP, 1) + 0.15 * Math.min(comps / 12, 1)));
}
const convVals = elig.map((p, i) => conviction(p, i));
const convTop = elig.map((_, i) => i).sort((a, b) => convVals[b]! - convVals[a]!).slice(0, 5).map((i) => ({ name: elig[i]!.name, v: convVals[i]! }));
// D-53 launch score, age+size only (growth EXCLUDED, D-05)
function launchScore(p: Proto): number {
  const d = ageDays(p);
  const a = d === null ? 20 : (Math.min(d, 1095) / 1095) * 40;
  const s = Math.max(0, Math.min(30, (Math.log10(p.tvl_usd / 5e6) / 3) * 30));
  return Math.round(a + s);
}
const lsVals = elig.map(launchScore);
// D-54 confidence
function confidence(p: Proto): number {
  let s = 100;
  if (p.change_7d === null) s -= 30;
  if (!p.listed_at) s -= 30;
  if (!p.category) s -= 20;
  if (!p.chains.length) s -= 20;
  return s;
}
const confVals = elig.map(confidence);
// D-62 disposition
const exclPre = pretoken.filter((p) => !clean(p));
function exclReason(p: Proto): string {
  if (p.category === "Bridge" || p.category === "Canonical Bridge") return "bridge";
  if (p.category === "Liquid Staking" || p.category === "Liquid Restaking" || p.category === "Restaked BTC") return "liqstake";
  if (p.category === "CEX") return "cex";
  if (EXCH.test(p.name)) return "exchange";
  if (VERS.test(p.name)) return "versioned";
  if (WRAP.test(p.name)) return "wrapped";
  return "other";
}
const disp = { bridge: 0, liqstake: 0, cex: 0, exchange: 0, versioned: 0, wrapped: 0, other: 0 };
for (const p of exclPre) disp[exclReason(p) as keyof typeof disp]++;
// grey zone D-09: eligible, above floor, NOT on sealed watchlist
const greyIdx = elig.map((_, i) => i).filter((i) => elig[i]!.tvl_usd >= 50000000 && !watchSet.has(elig[i]!.slug));
const greyRanksEV = greyIdx.map((i) => rankEV.get(i)!).sort((a, b) => a - b);
// narrow extrapolation flag (c)
const ltTr = traded.map((p) => Math.log10(p.tvl_usd));
const gTr = traded.map((p) => (p.change_7d ?? 0) / 100);
const ltMin = Math.min(...ltTr);
const ltMax = Math.max(...ltTr);
const gMin = Math.min(...gTr);
const gMax = Math.max(...gTr);
function isFlagged(p: Proto): boolean {
  const lt = Math.log10(p.tvl_usd);
  const g = (p.change_7d ?? 0) / 100;
  return lt < ltMin || lt > ltMax || g < gMin || g > gMax;
}
const flagCount = elig.filter(isFlagged).length;
// D-28 median multiple per category (n>=2)
const d28: { cat: string; n: number; med: number }[] = [];
{
  const byCat = new Map<string, number[]>();
  for (const p of traded) {
    const k = p.category ?? "none";
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(p.mcap_usd! / p.tvl_usd);
  }
  for (const [cat, arr] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (arr.length >= 2) d28.push({ cat, n: arr.length, med: r3(med(arr)) });
  }
}
// D-58 anchors: top-3 comps by multiple per top-6 category
const d58: { cat: string; anchors: { name: string; mult: number }[] }[] = [];
{
  const byCat = new Map<string, Proto[]>();
  for (const p of traded) {
    const k = p.category ?? "none";
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(p);
  }
  const topCats = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  for (const [cat, arr] of topCats) {
    const top = [...arr].sort((a, b) => b.mcap_usd! / b.tvl_usd - a.mcap_usd! / a.tvl_usd).slice(0, 3);
    d58.push({ cat, anchors: top.map((p) => ({ name: p.name, mult: r2(p.mcap_usd! / p.tvl_usd) })) });
  }
}
// D-59 age percentiles
const agesAllD = srt(protos.filter((p) => p.listed_at).map((p) => ageDays(p)!));
const agesPreD = srt(pretoken.filter((p) => p.listed_at).map((p) => ageDays(p)!));
const d59 = {
  allP25: qtl(agesAllD, 0.25),
  allP75: qtl(agesAllD, 0.75),
  preP25: qtl(agesPreD, 0.25),
  preP75: qtl(agesPreD, 0.75),
};
// D-52 curve comparison vs A (wili board, clean-92 fit, uncapped)
const spearmanCurve = (() => {
  const cf = curveFitOLS(traded);
  const curveImpl = elig.map((p) => Math.max(1, Math.round(10 ** wiliLogMcap(p, cf))));
  const rkCurve = new Map<number, number>();
  elig.map((_, i) => i).sort((a, b) => curveImpl[b]! - curveImpl[a]!).forEach((idx, r) => rkCurve.set(idx, r + 1));
  const xs = elig.map((_, i) => rankImpl.get(i)!);
  const ys = elig.map((_, i) => rkCurve.get(i)!);
  const topCurve = new Set(elig.map((_, i) => i).sort((a, b) => curveImpl[b]! - curveImpl[a]!).slice(0, 10));
  let ov = 0;
  topCurve.forEach((i) => { if (top10Impl.has(i)) ov++; });
  const topIdx = elig.map((_, i) => i).sort((a, b) => curveImpl[b]! - curveImpl[a]!)[0]!;
  return {
    spearman: pearson(xs, ys),
    top10Overlap: ov,
    top1Name: elig[topIdx]!.name,
    top1Val: Math.max(...curveImpl),
    total: Math.round(curveImpl.reduce((s, v) => s + v, 0)),
    slope: r3(cf.b),
  };
})();
// ---------- bootstrap: slope s.e., top-20 stability, rank ranges (200 refits, seeded) ----------
const boot = (() => {
  const rng = mulberry32(20261124);
  const n = traded.length;
  const ranks: number[][] = elig.map(() => []);
  const slopes: number[] = [];
  const top20Full = new Set(orderEV.slice(0, 20));
  let top20Kept = 0;
  const Xall = traded.map((p) => feats(p));
  for (let b = 0; b < 200; b++) {
    const sample: number[] = [];
    for (let i = 0; i < n; i++) sample.push(Math.floor(rng() * n));
    const m = ridgeFit(sample.map((i) => Xall[i]!), sample.map((i) => yLog[i]!), 30);
    slopes.push(m.b[1]!);
    const imp = ridgePred(m, Xel).map((v, i) => {
      const raw = 10 ** v;
      return Math.min(raw / elig[i]!.tvl_usd, CAP) * elig[i]!.tvl_usd;
    });
    const evB = imp.map((v, i) => Math.max(1, Math.round(v * oddsOf.get(elig[i]!.slug)!)));
    const order = elig.map((_, i) => i).sort((a, bb) => {
      if (evB[bb]! !== evB[a]!) return evB[bb]! - evB[a]!;
      if (imp[bb]! !== imp[a]!) return imp[bb]! - imp[a]!;
      return elig[a]!.slug.localeCompare(elig[bb]!.slug);
    });
    order.forEach((idx, r) => ranks[idx]!.push(r + 1));
    const top20 = new Set(order.slice(0, 20));
    top20Full.forEach((i) => { if (top20.has(i)) top20Kept++; });
  }
  const rankRange = elig.map((_, i) => {
    const arr = srt(ranks[i]!);
    return [Math.round(qtl(arr, 0.1)), Math.round(qtl(arr, 0.9))];
  });
  const widths = rankRange.map(([lo, hi]) => hi! - lo!);
  return {
    slopeMean: mean(slopes),
    slopeSd: sdPop(slopes),
    top20Stability: top20Kept / (20 * 200),
    rankRange,
    medianWidth: med(widths),
  };
})();

// ---------- calendar D-11 + tiles ----------
// Farm rows by net/hour (net / 6 active hours over 12wk); calendar groups ALL FARM
// rows by first chain; the 7 chains with the most FARM rows become Mon-Sun sessions
const farmByHour = farmIdx.map((i) => ({ i, perHour: nets[i]! / 6 })).sort((a, b) => b.perHour - a.perHour);
const calGroups = new Map<string, { n: number; net: number }>();
for (const i of farmIdx) {
  const ch = elig[i]!.chains[0] ?? "Other";
  const g = calGroups.get(ch) ?? { n: 0, net: 0 };
  g.n++;
  g.net += nets[i]!;
  calGroups.set(ch, g);
}
const calRows = farmIdx.filter((i) => {
  const topChains = new Set([...calGroups.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 7).map(([c]) => c));
  return topChains.has(elig[i]!.chains[0] ?? "Other");
});
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const calSessions = [...calGroups.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 7).map(([chain, g], k) => ({
  day: DAYS[k]!,
  chain,
  rows: g.n,
  net: Math.round(g.net),
  hours: g.n * 0.5,
}));
const calTotalNet = calSessions.reduce((s, x) => s + x.net, 0);
const calTotalHours = calSessions.reduce((s, x) => s + x.hours, 0);
const tiles = farmByHour.slice(0, 3).map(({ i, perHour }) => ({
  name: elig[i]!.name,
  slug: elig[i]!.slug,
  net: Math.round(nets[i]!),
  perHour: r2(perHour),
}));

// ---------- narrative Top-10 (generated from v13 numbers) ----------
const top10EVRows = orderEV.slice(0, 10).map((i) => elig[i]!);
const top10EVSum = orderEV.slice(0, 10).reduce((s, i) => s + evVal[i]!, 0);
const top10Farm = orderEV.slice(0, 10).filter((i) => verdicts[i] === "FARM").length;
const top10Grey = orderEV.slice(0, 10).filter((i) => greyIdx.includes(i)).length;
const narrative = [
  `Expected-value top 10 is led by ${top10EVRows[0]!.name} at ${fmtM(evVal[top1EVIdx]!)} expected (${fmtM(impliedIf[top1EVIdx]!)} if it launches, odds ${oddsOf.get(top10EVRows[0]!.slug)}), and the ten sum to ${fmtM(top10EVSum)} — ${(100 * top10EVSum / totalEV).toFixed(1)}% of the board's ${fmtM(totalEV)} total expected value.`,
  `${top10Farm} of the top 10 earn a FARM verdict at $5K/12wk/7%, and ${top10Grey} sit in the grey zone above the $50M floor without being on the sealed watchlist — the watchlist is a floor, not a ceiling.`,
  `Ranking by expected value moves the median row ${medShift.toFixed(1)} places versus ranking by if-launches value, and only ${top10Overlap} of 10 top rows survive the switch: high-implied, low-odds rows fall, mid-implied, high-odds rows rise.`,
  `Odds cut $${((totalImplied - totalEV) / 1e6).toFixed(0)}M off the $${(totalImplied / 1e9).toFixed(2)}B if-launches total — the board you farm is the $871M board you can expect, not the $1.77B board you hope for.`,
].join(" ");

// ---------- farm steps (per-row text; mirrored by dashboard app.js generator) ----------
const MECH: Record<string, string> = {
  Lending: "lend on",
  Dexs: "provide liquidity on",
  Yield: "deposit into the vault of",
  RWA: "deposit into the vault of",
  "Basis Trading": "open a basis trade on",
  "Yield Aggregator": "deposit into the aggregator of",
  CDP: "mint against collateral on",
  Derivatives: "open a position on",
  "Staking Pool": "stake with",
  Restaking: "restake through",
};
const SECOND: Record<string, string> = {
  Lending: "lend a second tranche",
  Dexs: "add a second LP tranche",
  Yield: "add a second tranche to the vault",
  RWA: "add a second tranche to the vault",
  "Basis Trading": "open a second, smaller basis leg",
  "Yield Aggregator": "add a second tranche to the aggregator",
  CDP: "mint a second, smaller position",
  Derivatives: "open a second, smaller position",
};
const WEEKLY: Record<string, string> = {
  Lending: "check borrow rates and top up when utilisation rises",
  Dexs: "rebalance the LP range when price drifts",
  Yield: "harvest yield and restake it",
  RWA: "check the underlying collateral report",
  "Basis Trading": "check the funding rate before rolling",
  "Yield Aggregator": "harvest and restake the yield",
  CDP: "check the collateral ratio stays above the minimum",
  Derivatives: "check funding and margin once a week",
};
function mechOf(p: Proto): string {
  return MECH[p.category ?? ""] ?? "deposit into";
}
function farmSteps(p: Proto, i: number): string[] {
  const gas = gasOf(p);
  const fee = 2 * gas + 5;
  const opp = 5000 * 0.04 * (12 / 52);
  const pct = ((5000 / p.tvl_usd) * 100).toFixed(3);
  const tvlM = p.tvl_usd >= 1e9 ? `$${(p.tvl_usd / 1e9).toFixed(2)}B` : `$${(p.tvl_usd / 1e6).toFixed(1)}M`;
  const chain1 = p.chains[0] ?? "its main chain";
  const cheap = cheapestChain(p);
  const chain2 = p.chains[1];
  const comps = catN.get(p.category ?? "none") ?? 0;
  const od = oddsOf.get(p.slug)!;
  const tier = tierOf(od);
  const net = nets[i]!;
  const be = beVals[i];
  const wa = walkAway(p, i);
  const half = (p.change_7d ?? 0) < -10;
  const growth = p.change_7d === null ? "unreported" : `${p.change_7d > 0 ? "+" : ""}${p.change_7d}%`;
  const s1 = `Deposit $5,000 into ${p.name} — ${mechOf(p)} ${chain1}. $5,000 is ${pct}% of its ${tvlM} TVL. Gas about $${gas}/tx on ${cheap} (cheapest route); setup fee $${fee.toFixed(2)} plus $${opp.toFixed(2)} T-bill cost over 12 weeks.`;
  const s2 = `Second action for ${p.name}: ${SECOND[p.category ?? ""] ?? "make a second, smaller deposit"} in week 3${chain2 ? ` and spread it to ${chain2}` : ""}. Weekly: ${WEEKLY[p.category ?? ""] ?? "one on-chain action a week to stay active"}.`;
  const s3 = `Hold 12 weeks and track TVL: ${p.name} moved ${growth} in 7d on ${tvlM} TVL, with ${comps} traded comps behind its ${fmtM(impliedIf[i]!)} if-launches value.${half ? " TVL fell over 10% in 7d, so this plan starts at half the usual size." : " Snapshot timing is unknown, so stay active until an announcement."}`;
  const s4 = be === null
    ? `Risk for ${p.name}: break-even is never reached at any capital — the expected slice never covers its own cost. ${wa !== null ? `Walk-away multiple ${wa.toFixed(2)}x.` : ""} Farming does not guarantee you qualify: a launch does not guarantee eligibility, and extra activity beyond the deposit is usually required.`
    : `Risk for ${p.name}: break-even needs $${fmtInt(be)} of capital${wa !== null ? `; walk-away multiple ${wa.toFixed(2)}x — below it, the plan no longer pays` : ""}. Farming does not guarantee you qualify: a launch does not guarantee eligibility, and extra activity beyond the deposit is usually required.`;
  const s5 = `Exit ${p.name}: withdraw the $5,000 and any rewards after 12 weeks or at launch, whichever comes first. Expected net $${Math.round(net)} at $5K/12wk/7% — odds tier ${tier} (${od}, WF-tested; per-row odds from full fit; formulation beats base on 3 WF cuts). Verdict does not price eligibility risk: a launch does not guarantee you qualify.`;
  return [s1, s2, s3, s4, s5];
}

// ---------- board rows ----------
const L2 = new Set(["Base", "Arbitrum", "Optimism", "Polygon", "Linea", "Blast", "Mantle", "Scroll", "zkSync Era"]);
function cheapestL2(p: Proto): string | null {
  const l2s = p.chains.filter((c) => L2.has(c));
  if (!l2s.length) return null;
  return l2s.sort((a, b) => (GAS[a] ?? 1) - (GAS[b] ?? 1))[0]!;
}
const rows = orderEV.map((idx, r) => {
  const p = elig[idx]!;
  const od = oddsOf.get(p.slug)!;
  const be = beVals[idx];
  const wa = walkAway(p, idx);
  return {
    slug: p.slug,
    name: p.name,
    rank: r + 1,
    implied_value_usd: evVal[idx]!,
    implied_if_launches_usd: impliedIf[idx]!,
    odds: od,
    odds_tier: tierOf(od),
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    age_days: ageDays(p),
    multiple: r3(impliedIf[idx]! / p.tvl_usd),
    ev_per_cost: r2(evCost[idx]!),
    verdict: verdicts[idx]!,
    net_usd: Math.round(nets[idx]! * 100) / 100,
    net_per_hour_usd: r2(nets[idx]! / 6),
    fee_usd: r2(2 * gasOf(p) + 5),
    hold_weeks: 12,
    break_even_usd: be === null ? null : Math.round(be),
    walk_away_mult: wa === null ? null : r2(wa),
    range_lo_usd: Math.max(1, Math.floor(impliedIf[idx]! / wIn)),
    range_hi_usd: Math.floor(impliedIf[idx]! * wIn),
    range_outer_lo_usd: Math.max(1, Math.floor(impliedIf[idx]! / wOut)),
    range_outer_hi_usd: Math.floor(impliedIf[idx]! * wOut),
    conviction: convVals[idx]!,
    launch_score: lsVals[idx]!,
    gas_share: r3(gasShare(p)),
    farm_value_usd: r2(farmVal[idx]!),
    half_size: (p.change_7d ?? 0) < -10,
    capital_tier: p.tvl_usd < 25e6 ? "early $100-500" : p.tvl_usd < 100e6 ? "mid $250-1000" : p.tvl_usd < 500e6 ? "large $500-2000" : "institutional $1000-5000",
    cheapest_l2: cheapestL2(p),
    confidence: confVals[idx]!,
    signals: signalsOf(p),
    comps: catN.get(p.category ?? "none") ?? 0,
    flagged_extrapolated: isFlagged(p),
    grey_zone: greyIdx.includes(idx),
    watchlist: watchSet.has(p.slug),
    rank_implied: rankImpl.get(idx)!,
    rank_range_p10: boot.rankRange[idx]![0]!,
    rank_range_p90: boot.rankRange[idx]![1]!,
    farm_steps: farmSteps(p, idx),
  };
});
const stepSet = new Set<string>();
let dupSteps = 0;
for (const r of rows) for (const s of r.farm_steps) { if (stepSet.has(s)) dupSteps++; stepSet.add(s); }
const stepLens = rows.flatMap((r) => r.farm_steps.map((s) => s.length));

// ---------- META ----------
const roundMeta = (o: any): any => {
  if (Array.isArray(o)) return o.map(roundMeta);
  if (o && typeof o === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(o)) out[k] = (k === "coefA" || k === "muA" || k === "sdA" || k === "wIn" || k === "wOut") ? v : roundMeta(v);
    return out;
  }
  if (typeof o === "number" && !Number.isInteger(o)) return Math.round(o * 1e4) / 1e4;
  return o;
};
const META = roundMeta({
  version: "v13",
  model: "A lam30",
  snapshot_as_of: snap.as_of,
  rows: 198,
  watchlist: 40,
  cap_p90: r3(CAP),
  cap_binds: capBinds,
  max_multiple: r3(maxMult),
  med_multiple_clean: r3(MED_MULT),
  flat_multiple_delta: 0.214,
  top1_ev: { slug: elig[top1EVIdx]!.slug, name: elig[top1EVIdx]!.name, ev: evVal[top1EVIdx]!, implied: impliedIf[top1EVIdx]!, odds: oddsOf.get(elig[top1EVIdx]!.slug)! },
  top1_implied: { slug: elig[top1ImplIdx]!.slug, name: elig[top1ImplIdx]!.name, implied: impliedIf[top1ImplIdx]!, ev: evVal[top1ImplIdx]!, odds: oddsOf.get(elig[top1ImplIdx]!.slug)! },
  total_implied: totalImplied,
  total_ev: totalEV,
  total_ev_cut: totalImplied - totalEV,
  median_top10_ev: 0,
  top10_ev_sum: top10EVSum,
  top10_implied_sum: orderImpl.slice(0, 10).reduce((s, i) => s + impliedIf[i]!, 0),
  top5_ev_sum: orderEV.slice(0, 5).reduce((s, i) => s + evVal[i]!, 0),
  median_ev: med(evVal),
  median_implied: med(impliedIf),
  median_shift: r2(medShift),
  mean_shift: r2(mean(rankShifts)),
  top10_overlap: top10Overlap,
  spearman_ev_impl: r3(spearmanEV),
  rows_shift_ge10: rankShifts.filter((v) => v >= 10).length,
  rows_shift_ge20: rankShifts.filter((v) => v >= 20).length,
  verdicts: splitVerdict,
  modelA: { medLOO: r2(evA.looMed), meanLOO: r2(evA.looMean), medWF: r2(evA.wfMed), meanWF: r2(evA.wfMean), wfCutsMed: evA.wfCutsMed.map(r2), wfCutsMean: evA.wfCutsMean.map(r2), new35Med: r2(evA.new35Med), r2: r3(r2a), slopeRaw: r3(slopeRaw) },
  modelB: { medLOO: r2(evB.looMed), meanLOO: r2(evB.looMean), medWF: r2(evB.wfMed), meanWF: r2(evB.wfMean), new35Med: r2(evB.new35Med) },
  modelC: { medLOO: r2(evC.looMed), meanLOO: r2(evC.looMean), medWF: r2(evC.wfMed), meanWF: r2(evC.wfMean), new35Med: r2(evC.new35Med) },
  modelD24: { medLOO: r2(evD24.looMed), meanLOO: r2(evD24.looMean), medWF: r2(evD24.wfMed), meanWF: r2(evD24.wfMean), new35Med: r2(evD24.new35Med) },
  modelCurve: { medLOO: r2(evCurve.looMed), meanLOO: r2(evCurve.looMean), medWF: r2(evCurve.wfMed), meanWF: r2(evCurve.wfMean), new35Med: r2(evCurve.new35Med), spearmanVsA: r3(spearmanCurve.spearman), top10OverlapVsA: spearmanCurve.top10Overlap, top1Name: spearmanCurve.top1Name, top1Val: spearmanCurve.top1Val, total: spearmanCurve.total },
  modelD25: { medLOO: r2(evD25.looMed), meanLOO: r2(evD25.looMean), medWF: r2(evD25.wfMed), meanWF: r2(evD25.wfMean) },
  modelD26: { medLOO: r2(evD26.looMed), meanLOO: r2(evD26.looMean), medWF: r2(evD26.wfMed), meanWF: r2(evD26.wfMean) },
  modelFlat: { medLOO: r2(evFlat.looMed), meanLOO: r2(evFlat.looMean), medWF: r2(evFlat.wfMed), meanWF: r2(evFlat.wfMean) },
  ablation: ablation.map((a) => ({ name: a.name, looMed: r2(a.looMed), looMean: r2(a.looMean), wfMed: r2(a.wfMed), wfMean: r2(a.wfMean) })),
  innerLam,
  oddsWF: oddsWF.map((o) => ({ cut: o.cut, brierEns: r3(o.brierEns), brierLog: r3(o.brierLog), brierEmp: r3(o.brierEmp), brierBase: r3(o.brierBase), called: r3(o.called) })),
  oddsBrierMean: r3(mean(oddsWF.map((o) => o.brierEns))),
  oddsCalledMean: r3(mean(oddsWF.map((o) => o.called))),
  tierPooled: {
    HIGH: r3(tierPool.high[1] ? tierPool.high[0] / tierPool.high[1] : 0),
    MED: r3(tierPool.med[1] ? tierPool.med[0] / tierPool.med[1] : 0),
    LOW: r3(tierPool.low[1] ? tierPool.low[0] / tierPool.low[1] : 0),
  },
  tierCutLo: r3(tierCutLo),
  tierCutHi: r3(tierCutHi),
  baseRate: r3(baseRate),
  rangeWF: { inner: r3(rangeWF.inner), outer: r3(rangeWF.outer) },
  rangeWF18outer: r3(rangeWF18.outer),
  cleanCut,
  jackknife: { inner: r3(jack.inner), band: r2(jack.band) },
  mondrianInner: r3(mondrian.inner),
  cqrInner: r3(cqr.inner),
  tercileInner: tercCov.map(r3),
  d43: r2(d43),
  wIn: r3(wIn),
  wOut: r3(wOut),
  d03: { finite: beStats.finite, never: beStats.never, median: Math.round(beStats.median), p10: Math.round(beStats.p10), p90: Math.round(beStats.p90), max: Math.round(beStats.max), maxName: beStats.maxName },
  d04: { median: r2(waStats.median), p10: r2(waStats.p10), p90: r2(waStats.p90), min: r2(waStats.min), max: r2(waStats.max), fragile: waStats.fragile, robust: waStats.robust, robustNames: waStats.robustNames },
  d47,
  d48,
  d49,
  d50: { median: r2(d50.median), p90: r2(d50.p90), max: r2(d50.max), gt1: d50.gt1, gt3: d50.gt3 },
  d51: { counts: d51, upsideMed: Math.round(d51ud.upsideMed), downsideMed: Math.round(d51ud.downsideMed), downsideGtUpside: d51ud.downsideGtUpside },
  d55: { farm: d55.farm, thin: d55.thin, skip: d55.skip, median: r3(d55.median), max: r3(d55.max) },
  d56: { median: r2(d56.median), max: r2(d56.max), halfSize: d56.halfSize },
  d57,
  conviction: { median: med(convVals), top5: convTop },
  launchScore: { median: med(lsVals), p10: qtl(srt(lsVals), 0.1), p90: qtl(srt(lsVals), 0.9), max: Math.max(...lsVals), min: Math.min(...lsVals) },
  confidence: { n100: confVals.filter((v) => v === 100).length, n70: confVals.filter((v) => v === 70).length },
  disposition: { ranked: 198, hasToken: 416, bridge: disp.bridge, liqstake: disp.liqstake, cex: disp.cex, exchange: disp.exchange, versioned: disp.versioned, wrapped: disp.wrapped, other: disp.other },
  greyZone: { n: greyIdx.length, ranksEV: greyRanksEV },
  flagged: flagCount,
  boot: { slopeMean: r3(boot.slopeMean), slopeSd: r3(boot.slopeSd), slopeStdFull: r3(slopeStd), slopeRawFull: r3(slopeRaw), top20Stability: r3(boot.top20Stability), medianWidth: r2(boot.medianWidth) },
  calendar: { sessions: calSessions, totalNet: calTotalNet, totalHours: calTotalHours, rowsUsed: calRows.length },
  tiles,
  narrative,
  d28,
  catComps: Object.fromEntries([...catN.entries()]),
  d58,
  d59,
  topcats: TOPCATS,
  coefA: modA.b,
  muA: modA.mu,
  sdA: modA.sd,
  farmStepsUnique: stepSet.size,
  farmStepsDup: dupSteps,
  farmStepLenMax: Math.max(...stepLens),
  farmStepLenMin: Math.min(...stepLens),
});
META.median_top10_ev = med(orderEV.slice(0, 10).map((i) => evVal[i]!));

// ---------- data.js (compact, outside the 64KiB text cap only via dossier; counts in dashboard total) ----------
const CHAIN_LIST = [...new Set(protos.flatMap((p) => p.chains))].sort();
const CAT_LIST = [...new Set(elig.map((p) => p.category ?? "none"))].sort();
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
const dataRows = rows.map((r) => {
  const p = elig.find((q) => q.slug === r.slug)!;
  return [
    r.slug,
    r.name,
    CAT_LIST.indexOf(p.category ?? "none"),
    p.chains.map((c) => CHAIN_LIST.indexOf(c)).join(","),
    p.tvl_usd,
    p.change_7d,
    ageDays(p),
    r.implied_if_launches_usd,
    Math.round(r.odds * 1000),
    r.flagged_extrapolated ? 1 : 0,
    r.grey_zone ? 1 : 0,
    r.watchlist ? 1 : 0,
    r.rank_range_p10,
    r.rank_range_p90,
  ];
});
const DATA_META_KEYS = ["total_implied", "total_ev", "median_shift", "top10_overlap", "spearman_ev_impl", "modelA", "modelB", "modelC", "modelD24", "modelCurve", "modelD25", "modelD26", "ablation", "innerLam", "oddsWF", "tierPooled", "tierCutLo", "tierCutHi", "baseRate", "d43", "jackknife", "mondrianInner", "cqrInner", "tercileInner", "d03", "d04", "d47", "d50", "d51", "d55", "d56", "d57", "conviction", "launchScore", "confidence", "boot", "calendar", "tiles", "narrative", "d28", "catComps", "topcats", "cap_p90", "coefA", "muA", "sdA", "wIn", "wOut"];
const dataMeta: any = {};
for (const k of DATA_META_KEYS) dataMeta[k] = (META as any)[k];
dataMeta.wIn = wIn;
dataMeta.wOut = wOut;
dataMeta.tierCutLo = tierCutLo;
dataMeta.tierCutHi = tierCutHi;
const dataJs =
  "window.DATA={M:" +
  JSON.stringify(dataMeta) +
  ",CH:" +
  JSON.stringify(CHAIN_LIST) +
  ",CA:" +
  JSON.stringify(CAT_LIST) +
  ",R:[" +
  dataRows.map((r) => JSON.stringify(r)).join(",") +
  "]};\n";

// ---------- output ----------
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "dashboard"), { recursive: true });
mkdirSync(join(OUT, "screenshots"), { recursive: true });
const board = { meta: META, rows };
writeFileSync(join(OUT, "board.json"), JSON.stringify(board));
writeFileSync(join(OUT, "dashboard", "data.js"), dataJs);
for (const f of ["index.html", "app.css", "app.js"]) {
  const src = join(here, "dashboard", f);
  if (existsSync(src)) cpSync(src, join(OUT, "dashboard", f));
}
const shotsSrc = join(here, "screenshots");
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(OUT, "screenshots"), { recursive: true });
const dossier = buildDossier(OUT, { text_max_bytes: 65536 });
writeFileSync(join(OUT, "dossier.json"), dossier);
console.log("v13 built");
console.log(`rows=${rows.length} totalEV=${totalEV} totalImplied=${totalImplied}`);
console.log(`top1EV=${META.top1_ev.name} EV=${META.top1_ev.ev} implied=${META.top1_ev.implied} odds=${META.top1_ev.odds}`);
console.log(`top1Impl=${META.top1_implied.name} $${META.top1_implied.implied}`);
console.log(`verdicts=${splitVerdict.FARM}/${splitVerdict.MARGINAL}/${splitVerdict.SKIP} medShift=${medShift} top10overlap=${top10Overlap} spearman=${spearmanEV.toFixed(3)}`);
console.log(`modelA medLOO=${evA.looMed.toFixed(2)} meanLOO=${evA.looMean.toFixed(2)} medWF=${evA.wfMed.toFixed(2)} meanWF=${evA.wfMean.toFixed(2)}`);
console.log(`modelB meanWF=${evB.wfMean.toFixed(2)} modelC meanWF=${evC.wfMean.toFixed(2)} D24 meanWF=${evD24.wfMean.toFixed(2)} curve meanWF=${evCurve.wfMean.toFixed(2)}`);
console.log(`oddsWF=${JSON.stringify(oddsWF.map((o) => [r3(o.brierEns), r3(o.brierBase), r3(o.called)]))} tiers=${JSON.stringify(META.tierPooled)}`);
console.log(`rangeWF inner=${rangeWF.inner.toFixed(3)} outer=${rangeWF.outer.toFixed(3)} cleanCut n=${cleanCut.n} ${cleanCut.inner.toFixed(3)}/${cleanCut.outer.toFixed(3)} jack=${jack.inner.toFixed(3)}/${jack.band.toFixed(2)} mond=${mondrian.inner.toFixed(3)} cqr=${cqr.inner.toFixed(3)}`);
console.log(`d03=${beStats.finite}/${beStats.never} med=$${Math.round(beStats.median)} max=$${Math.round(beStats.max)}(${beStats.maxName}) d04 med=${waStats.median.toFixed(2)} fragile=${waStats.fragile} robust=${waStats.robust}`);
console.log(`d47=${JSON.stringify(d47)} d48=${JSON.stringify(d48)} d49=${JSON.stringify(d49)} d51=${JSON.stringify(d51)}`);
console.log(`d50 med=${d50.median.toFixed(2)} d55=${d55.farm}/${d55.thin}/${d55.skip} med=${d55.median.toFixed(2)} d56 med=${d56.median.toFixed(2)} half=${d56.halfSize}`);
console.log(`conv med=${med(convVals)} top5=${JSON.stringify(convTop)} ls med=${med(lsVals)} p90=${qtl(srt(lsVals), 0.9)} boot slope=${boot.slopeMean.toFixed(3)}±${boot.slopeSd.toFixed(3)} top20stab=${boot.top20Stability.toFixed(3)} width=${boot.medianWidth}`);
console.log(`grey=${greyIdx.length} flagged=${flagCount} disp=${JSON.stringify(disp)} steps unique=${stepSet.size}/990 dup=${dupSteps} len ${Math.min(...stepLens)}-${Math.max(...stepLens)}`);
console.log(`cal totalNet=$${calTotalNet} hours=${calTotalHours} sessions=${JSON.stringify(calSessions)}`);
console.log(`dossier bytes=${dossier.length} data.js bytes=${Buffer.byteLength(dataJs)}`);
