[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mohamad824/token-radar-01-v13/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mohamad824/token-radar-01-v13/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# token-radar-01 v13 — Expected Value

198 pre-token protocols ranked by **expected launch value**: EV = implied-if-launches × launch odds. Same board model as v11 (ridge lam30 on 92 traded comps), same odds ensemble (50/30/20) — only the ranking key changed. Snapshot sealed 2026-11-14 (758 protocols, 40 on the watchlist, $50M TVL floor).

## Hero numbers

- **Top-1 EV: Anemoy Capital — $42,299,278 expected** ($67,355,538 if it launches, odds 0.628). Top-1 by implied is also Anemoy — the EV switch does not dethrone it.
- **Total EV: $871,371,675** of **$1,768,900,562 implied-if-launches**. Odds cut $897,528,887 (50.8%) off the best-case total. The board you farm is the $871M board you can expect, not the $1.77B board you hope for.
- **Median rank shift (EV vs implied): 15.5 places** (mean 20.93). 123 rows shift ≥10 places, 86 rows shift ≥20. **Top-10 overlap: 7/10.** Spearman EV vs implied: 0.879.
- **Top-10 EV sum: $173,503,280** (19.9% of board); top-5 EV sum: $114,604,507; median EV: $3,131,899.50; median implied: $7,062,187.50.
- **Verdicts ($5K / 12wk / 7%): 55 FARM / 74 MARGINAL / 69 SKIP** — unchanged from v11, because expected net already uses odds.
- **Top-10 EV:** Anemoy Capital $42.30M (FARM) · BitFi Basis $31.55M (MARGINAL) · Defi Saver Asset Management $14.44M (SKIP) · Aegis YUSD $13.29M (FARM) · Manta CeDeFi $13.03M (FARM) · Veda $12.73M (SKIP) · b14g $11.96M (SKIP) · Plume Vaults $11.61M (SKIP) · Steakhouse Financial $11.42M (SKIP) · OpenTrade $11.17M (SKIP).

## What the board is

- **Eligibility:** pre-token (no gecko_id AND no symbol) + clean() — excludes Bridge / Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC / CEX categories, CEX-named protocols, versioned names, wrapped/staked/staking names. 198 rows ranked; disposition of 758: 198 ranked, 416 already have a token, 43 bridge, 43 liquid staking, 42 CEX, 0 exchange, 11 versioned, 5 wrapped, 0 other.
- **Model A (frozen):** ridge regression, λ=30, on standardised [log10(TVL), growth/100] + dummy variables for the five TOPCATS categories (Basis Trading, Dexs, Lending, RWA, Yield), target log10(market cap). Fit on 92 traded comps (clean, mcap>0, TVL>0). Predicted multiple capped at the p90 of clean traded multiples = **2.873×**; **0 rows bound**; max predicted multiple 2.412×. In-sample R² 0.192; slope (raw logTVL) 0.271.
- **Coefficients A (full precision, for Rebuild):** intercept 6.933348664265477; log10(TVL) 0.19607743729682972; growth −0.0897299614003455; Basis Trading 0.12050373578202392; Dexs −0.005471015282899245; Lending −0.13280182384336392; RWA 0.047474465174250684; Yield −0.08603416908835941. Standardisation means μ = [7.552055827770841, −0.09028510869565216, 0.07608695652173914, 0.11956521739130435, 0.15217391304347827, 0.09782608695652174, 0.09782608695652174], σ = [0.724336520316495, 0.07854131918842307, 0.26513719386196655, 0.3244524251434629, 0.3591893835186585, 0.29707935584166206, 0.29707935584166234].
- **Odds (per row, rounded once to 3 decimals):** ensemble 50% richer logistic + 30% empirical (category × age-band, shrink 10 toward base rate) + 20% base rate (0.549). Logistic features: [logTVL, log10(age), growth, log10(nChains), log10(age)×logTVL, %inCat] + TOPCATS dummies, Newton λ=1. Age bands: <90d / 90d–1y / 1–2y / >2y / unknown. Tier cuts: LOW <0.406, MED 0.406–0.551, HIGH ≥0.551. Pooled launch rates: HIGH 0.756, MED 0.411, LOW 0.256.
- **Economics (default $5K / 12wk / 7%, thresholds ±$25, net FLOAT):** gas = cheapest chain (Ethereum $8, Base $0.05, Solana $0.01, Arbitrum $0.2, Binance $0.15, Avalanche $0.3, default $1.0); slice = 1000 × (implied/TVL) × 0.07 × odds; net = slice × 5 − (2×gas + 5) − 5000 × 0.04 × 12/52.
- **Range:** displayed bands from full-fit residuals — inner ×1.5 (wIn = 10^(1.5×q50|resid|) = 5.968), outer ×1.6 (wOut = 10^(1.6×q80|resid|) = 42.997) — applied to implied-if-launches, not EV.

## How good is it (held out)

| model | med LOO | mean LOO | med WF | mean WF | new-35 med |
|---|---|---|---|---|---|
| **A lam30 (frozen)** | ×/3.43 | ×/4.71 | ×/4.11 | ×/5.45 | ×/4.57 |
| B lam3 | ×/3.40 | ×/4.91 | ×/4.20 | ×/5.62 | ×/4.91 |
| C lam1 | ×/3.33 | ×/4.85 | ×/4.44 | ×/5.67 | ×/4.81 |
| D-24 logTVL-only OLS | ×/3.22 | ×/4.52 | ×/4.24 | ×/5.41 | ×/5.16 |
| D-52 wiliamkesh curve | ×/2.72 | ×/4.57 | ×/3.76 | ×/5.73 | ×/5.49 |
| D-25 prior (tested) | ×/3.25 | ×/4.72 | ×/4.09 | ×/5.45 | — |
| D-26 asym. growth (tested) | ×/3.31 | ×/4.71 | ×/3.80 | ×/5.51 | — |
| Flat median multiple | ×/4.65 | ×/5.51 | ×/5.60 | ×/6.89 | — |

WF = 3 walk-forward cuts averaged (40/60, 50/50, 67/33 by listing date). A wins on mean WF; the curve wins median LOO (×/2.72) but loses mean WF (×/5.73) — not adopted, and v12's curve is not used here. Inner-LOO λ: 40/60 λ10 ×/3.95 vs λ30 ×/3.92; 50/50 ×/3.71 vs ×/3.63; 67/33 ×/4.33 vs ×/4.17 — λ=30 is the right call at every cut. Ablation: size-only beats A on mean LOO (×/4.34 vs ×/4.71) but A wins med LOO and med WF; A+age wins med WF (×/4.03) but loses mean WF (×/5.57); random-feature placebo med LOO ×/3.76, mean WF ×/5.79 — a degenerate control in a linear model, not a rival.

**Odds, walk-forward:** Brier ensemble 0.226 / 0.214 / 0.208 vs base rate 0.249 / 0.248 / 0.250 (mean 0.216 vs 0.249); called-right 63.7% / 65.2% / 67.7% (mean 65.5%). The ensemble beats the base rate on all three cuts.

**Range, walk-forward:** inner 49.2% (target 50%), outer 78.3% (target 80%). Clean-cut (n=31, no re-fit): inner 48.4% / outer 87.1%, bands ×/4.18 and ×/32.47. TVL-tercile inner coverage: low 47.8% / mid 22.7% / high 68.8% — U-shaped, the mid tercile is worst. Conformal battery (negative controls): jackknife+ (WF 67/33) 54.8% / ×6.41; Mondrian (WF split-conformal per TVL tercile) 35.2%; CQR-lite 37.3% — all fail the 45–50% inner target: the range is calibrated on in-sample residuals, not conformal intervals.

## Economics

- **D-03 break-even capital:** finite 85 / never 113; median $95, p10 $7, p90 $1,274, max $96,514 (Flowdesk).
- **D-04 walk-away (EV/cost over FARM):** median 2.12×, p10 1.57, p90 3.54, min 1.50, max 10.34; fragile (<2×) 23, robust (>10×) 1 (Anemoy Capital).
- **D-50 EV/cost:** median 0.78, p90 2.29, max 10.34; 80 rows >1×, 7 rows >3×.
- **D-47 vesting (PV on slice):** typical (0.926) 48/77/73, harsh (0.707) 28/72/98, generous (0.954) 52/75/71.
- **D-48:** bear (×0.33) 3/44/151, bull ×2.5 122/50/26, bull ×3.0 132/44/22.
- **D-49 log-share** (payout ∝ ln(1+plan/1000), costs linear): $1K 3/193/2, $5K 3/54/141, $25K 1/0/197.
- **D-51 multi-wallet (gas ×4):** 49/61/88; upside median +$60, downside median −$53; downside > upside in 23 FARM rows.
- **D-55 gas-share** (gas ETH $8 / Solana $1 / Bitcoin $2 / L2 $1 / other $2, first chain, hold 60/45/30 days by age, modal $50/$100/$150/$250 by TVL band <$25M/<$100M/<$500M/else): FARM 92 / thin 62 / SKIP 44, median 25.1%, max 134.9%.
- **D-56 farm value** (modal × multiple): median $18.79, max $241.18; half-size 44 rows (7d < −10%).
- **D-53 launch score** (age + size only; growth excluded, D-05): median 23, p10 8, p90 42.3, max 58, min 1.
- **D-54 confidence:** 100 = 189 rows, 70 = 9 rows.
- **D-57 signals:** surging 14, sliding 44, token-free 3y 11, 8+ chains 19, $1B+ TVL 5, watchlist 40, no signals 98. Capital tiers: early (<$25M) 105, mid 57, large 30, institutional (>$500M) 6.
- **D-33 conviction** (0.6·odds + 0.25·min(multiple/2.87,1) + 0.15·min(comps/12,1), ×100): median 35; top 5 Anemoy Capital 70, Katana DEX 66, SyncSwap 65, FstSwap 64, Agni Finance 63.
- **D-22 bootstrap** (200 refits, seed 20261124, odds fixed): standardised logTVL slope 0.191 ± 0.056; top-20 stability 72.0%; median rank-range width 48.5.
- **Calendar D-11:** 7 sessions Mon–Sun, one chain per session, 33 FARM rows, total net $2,411, 16.5 hours (0.5h per row): Mon Ethereum 11 rows / $1,036 / 5.5h, Tue Binance 6 / $478 / 3h, Wed Base 4 / $213 / 2h, Thu Arbitrum 3 / $165 / 1.5h, Fri Bitcoin 3 / $115 / 1.5h, Sat Solana 3 / $192 / 1.5h, Sun Stellar 3 / $212 / 1.5h.
- **Grey zone:** 20 rows (EV ranks 2, 3, 17, 18, 28, 32, 36, 37, 44, 46, 56, 63, 77, 84, 89, 90, 96, 120, 134, 161). **Extrapolation flag:** 29/198 rows.
- **Farm steps:** 5 per row, 990/990 unique, lengths 110–338 chars. Step 1 deposit is $5,000 in every row, cost = fee_usd.
- **Bear-proof core (3):** Anemoy Capital (net $479, $79.81/h), Nucleus ($221, $36.77/h), BounceBit Prime ($211, $35.21/h).

## D-28 median multiple per category (traded comps)

Lending ×0.13 (n=14) · Dexs ×0.34 (n=11) · Yield ×0.19 (n=9) · RWA ×0.28 (n=9) · Basis Trading ×0.65 (n=7) · Cross Chain Bridge ×1.22 (n=4) · Yield Aggregator ×0.15 (n=4) · Indexes ×0.15 (n=3) · CDP ×0.17 (n=3) · Privacy ×0.97 (n=3) · Restaking ×0.03 (n=2) · Onchain Capital Allocator ×0.01 (n=2) · Token Locker ×9.52 (n=2) · Derivatives ×2.16 (n=2) · AI Agents ×0.61 (n=2) · Staking Pool ×0.00 (n=2) · Payments ×0.18 (n=2).

## Differences vs the reference numbers (§5.2 / §6 of the brief)

Every difference found, with the explanation. All other numbers match their references exactly.

1. **Total EV $871,371,675 vs ref ≈$871,371,683 (diff −$8).** Odds are rounded to 3 decimals once in main.ts; the reference total comes from unrounded odds. The $8 (0.000001%) is the rounding residue. Total implied matches exactly ($1,768,900,562), top-1 Anemoy implied $67,355,538 matches exactly.
2. **Odds WF Brier [0.226, 0.214, 0.208] vs ref [0.227, 0.215, 0.209]; called-right [0.637, 0.652, 0.677] vs ref [0.648, 0.654, 0.681]; tier pooled HIGH 0.756 / MED 0.411 vs ref 0.747 / 0.422.** Same cause: the reference odds were computed with unrounded logistic outputs; this build rounds odds to 3 decimals once before every downstream use (per the brief's rounding rule). All differences ≤0.011.
3. **D-43 Pearson(|LOO resid|, growth) = −0.11 vs ref −0.72.** Not reproducible: −0.11 in every probed variant (LOO, in-sample, curve, model B, OLS bivariate, Spearman 0.08). The −0.72 reference cannot be derived from the research scripts; reported as measured with the method labelled.
4. **D-55 gas-share 92/62/44, median 25.1%, max 134.9% vs ref 110/38/50, median 24%, max 176%.** Reconstruction: D-55 gas table (ETH $8 / Solana $1 / Bitcoin $2 / L2 $1 / other $2), first chain, hold 60/45/30 days by age (≥3y/≥1y/else), weeks = days/7 exact, modal $50/$100/$150/$250 by TVL band. No probed variant reproduces the reference exactly; reported as measured with the method labelled.
5. **D-56 farm value median $18.79 (ref $17.67), max $241.18 (ref $51.39).** Definition: modal ($50/$100/$150/$250) × multiple. The reference max implies a much smaller modal for the max row (the max row here uses modal $100); not reproducible from the briefs. Kept the definition, reported as measured.
6. **Mondrian inner coverage 35.2% vs ref 16%.** Method: WF split-conformal per TVL tercile, mean of cuts 0.5/0.67. The reference construction is not specified in the briefs (a q25 half-width gives 21.6%, also not 16%). Both agree it fails the 45–50% inner target — a negative control, not a live number.
7. **Conviction median 35 (ref 40); top-5 Anemoy 70, Katana DEX 66, SyncSwap 65, FstSwap 64, Agni Finance 63 (ref Steakhouse 76, Veda 73, Gauntlet 72, Sentora 68, Upshift 68).** The conviction formula (0.6·odds + 0.25·min(multiple/2.87,1) + 0.15·min(comps/12,1)) is a reconstruction from the brief, not a verbatim spec; reported as measured.
8. **Bootstrap slope 0.191 ± 0.056 vs ref 0.186 ± 0.064; top-20 stability 72.0% vs ref 70.9%; median rank-range width 48.5 vs ref 52.55.** Same method (200 refits, seed 20261124), different RNG stream (mulberry32 in main.ts vs NumPy in the research scripts). Within noise.
9. **Curve mean WF 5.73 vs ref 5.72; curve total $1,513,444,429 vs ref $1,513,444,428 (diff $1).** Rounding residue (Math.round vs the reference's floor in one place). Spearman vs A 0.563 vs ref 0.56.
10. **Calendar 33 rows / $2,411 / 16.5h vs ref 34 rows / $2,879 / 17.5h.** Grouping rule (first chain, top 7 chains by FARM count, all their rows) is a reconstruction; the brief does not fully specify the chain-assignment rule. Sessions and per-session numbers are reported as measured.
11. **D-04 p90 walk-away 3.54 vs the Python probe's 3.59.** The entry uses rounded odds (per the brief); the probe used unrounded odds. The entry value is the one consistent with the rest of the board.
12. **Dashboard total 65,002 bytes vs the 64,512 target (cap 65,536).** Over target by 490 bytes, inside the hard cap. The dossier text is whole at 65,336 bytes, no "[Cut" marker. Nothing was cut from the content to fit — the prose was compressed, not the evidence.

## What was NOT done

- No per-tercile recalibration (that is the v14 flow). No v12 curve / model B / model C as the board model. No D-25 prior, no D-26 asymmetric growth (both tested, no mean-WF gain).
- The board is ranked by EV; the range, the verdicts and the farm steps are computed on implied-if-launches and odds exactly as in v11, so the verdicts are unchanged.

## Files

- `main.ts` — builds everything from `kit-fresh-v6/input/snapshot.json` (sha256 `42a71213519479f3a180cc5010cbbf6bd18a2447fa0ad29e4c5122b6c9184393`). Deterministic: two runs are byte-identical. Does not delete `/output`.
- `board.json` — 198 rows + full meta. `implied_value_usd` = EV (integer, non-rising with rank); `implied_if_launches_usd` is a separate field.
- `dashboard/` — `index.html` (3,000 B) + `app.css` (4,311 B) + `app.js` (29,266 B) + `data.js` (28,510 B) = **65,002 B** (cap 65,536). The dashboard recomputes every field from `data.js` in the browser: EV, net, verdict, break-even, walk-away, range, conviction, launch score, gas-share, farm value, D-47/D-51/bear/bull/log-share counts, Rebuild (198/198 MATCH), farm steps (identical to board.json).
- `dossier.json` — text whole, 65,336 bytes, no cut; dossier file 104,199 bytes (≤1.5 MiB).
- `screenshots/` — 4 shots, 1440×900, each ≤280 KiB: 01 board, 02 detail (Anemoy Capital), 03 filtered (FARM only), 04 evidence (odds panel).

## How to run

```sh
~/workspace/tools/node-v22.23.5-linux-x64/bin/node main.ts \
  --input ~/workspace/makefun/token-radar-01/kit-fresh-v6/input/snapshot.json \
  --output ~/workspace/makefun/token-radar-01/v13-final-out
```

Node 22 only (never system Node v24). Open `dashboard/index.html` in a browser (or serve the `dashboard/` folder) — no build step, no network.

## Caveats (D-37 / D-39 / D-40 / D-61)

- D-37: the model only sees TVL, 7d growth and category. No team, no audit, no tokenomics, no vesting schedule.
- D-39: odds are calibrated on a 92-row traded set with a 54.9% base launch rate — a small, survivorship-biased sample.
- D-40: the board is a bet, not a promise. A launch does not guarantee you qualify: eligibility rules are unknown until the airdrop is announced.
- D-61: ranks are unstable (median rank-range width 48.5). Do not farm a rank; farm the economics.
- D-35: token launches cluster in bull windows. D-36: airdrop farming is negative-sum after gas — this board prices gas and opportunity cost explicitly. D-75: median multiples compress as TVL grows (standardised slope 0.196).
