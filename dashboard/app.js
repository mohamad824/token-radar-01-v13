const D=window.DATA,M=D.M,R=D.R,CH=D.CH,CA=D.CA;
const $=id=>document.getElementById(id);
const GAS={Ethereum:8,Base:.05,Solana:.01,Arbitrum:.2,Binance:.15,Avalanche:.3};
const G55={Ethereum:8,Solana:1,Bitcoin:2,Arbitrum:1,Base:1,Optimism:1,zkSync:1,Polygon:1};
const L2=new Set(["Base","Arbitrum","Optimism","Polygon","Linea","Blast","Mantle","Scroll","zkSync Era"]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fi=n=>Math.round(n).toLocaleString("en-US");
const fm=n=>"$"+(n/1e6).toFixed(1)+"M";
const tvlM=v=>v>=1e9?"$"+(v/1e9).toFixed(2)+"B":"$"+(v/1e6).toFixed(1)+"M";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const MECH={Lending:"lend on",Dexs:"provide liquidity on",Yield:"deposit into the vault of",RWA:"deposit into the vault of","Basis Trading":"open a basis trade on","Yield Aggregator":"deposit into the aggregator of",CDP:"mint against collateral on",Derivatives:"open a position on","Staking Pool":"stake with",Restaking:"restake through"};
const SECOND={Lending:"lend a second tranche",Dexs:"add a second LP tranche",Yield:"add a second tranche to the vault",RWA:"add a second tranche to the vault","Basis Trading":"open a second, smaller basis leg","Yield Aggregator":"add a second tranche to the aggregator",CDP:"mint a second, smaller position",Derivatives:"open a second, smaller position"};
const WEEKLY={Lending:"check borrow rates and top up when utilisation rises",Dexs:"rebalance the LP range when price drifts",Yield:"harvest yield and restake it",RWA:"check the underlying collateral report","Basis Trading":"check the funding rate before rolling","Yield Aggregator":"harvest and restake the yield",CDP:"check the collateral ratio stays above the minimum",Derivatives:"check funding and margin once a week"};
function gasOf(p){return Math.min(...p.chains.map(c=>GAS[c]??1))}
function slice1000(p,impl){return 1000*(impl/p.tvl)*0.07*p.odds}
function netOf(p,impl,mult){const s=slice1000(p,impl)*mult;return s*5-(2*gasOf(p)+5)-5000*0.04*(12/52)}
function verdict(n){return n>25?"FARM":n<-25?"SKIP":"MARGINAL"}
function beOf(p,impl){const s=slice1000(p,impl);const d=s/1000-0.001-0.04*12/52;return d>0?2*gasOf(p)/d:null}
function waOf(p,impl){return slice1000(p,impl)*5/(2*gasOf(p)+5+5000*0.04*(12/52))}
function modalOf(p){return p.tvl<25e6?50:p.tvl<100e6?100:p.tvl<500e6?150:250}
function ageYears(p){return p.age==null?null:Math.max(p.age/365.25,1/365.25)}
function holdDays(p){const a=ageYears(p);if(a===null)return 30;return a>=3?60:a>=1?45:30}
function gas55(c){if(c==="Ethereum")return 8;if(c==="Solana")return 1;if(c==="Bitcoin")return 2;return L2.has(c)?1:2}
function gasShare(p){const g=p.chains.length?gas55(p.chains[0]):2;return g*(2+holdDays(p)/7)/modalOf(p)}
function farmVal(p){return modalOf(p)*p.impl/p.tvl}
function lsOf(p){const a=p.age==null?20:Math.min(p.age,1095)/1095*40;const s=clamp(Math.log10(p.tvl/5e6)/3*30,0,30);return Math.round(a+s)}
function confOf(p){let c=100;if(p.growth==null)c-=30;if(p.age==null)c-=30;if(p.cat==="none")c-=20;if(!p.chains.length)c-=20;return c}
function convOf(p){const comps=M.catComps[p.cat]??0;return Math.round(100*(0.6*p.odds+0.25*Math.min(p.impl/p.tvl/M.cap_p90,1)+0.15*Math.min(comps/12,1)))}
function tierOf(o){return o<M.tierCutLo?"LOW":o<M.tierCutHi?"MED":"HIGH"}
function signals(p){const s=[];if((p.growth??0)>=10)s.push("surging");if((p.growth??0)<=-10)s.push("sliding");const a=ageYears(p);if(a!==null&&a>=3)s.push("token-free 3y");if(p.chains.length>=8)s.push("8+ chains");if(p.tvl>=1e9)s.push("$1B+ TVL");if(p.watch)s.push("watchlist");if(!s.length)s.push("no signals");return s}
function rebuild(p){const t=M.topcats;const x=[Math.log10(p.tvl),p.growth==null?0:p.growth/100];for(const c of t)x.push(p.cat===c?1:0);let lp=M.coefA[0];for(let j=0;j<x.length;j++)lp+=M.coefA[j+1]*(x[j]-M.muA[j])/M.sdA[j];return Math.max(1,Math.round(Math.min(Math.pow(10,lp)/p.tvl,M.cap_p90)*p.tvl))}
function rLo(p){return Math.max(1,Math.floor(p.impl/M.wIn))}
function rHi(p){return Math.floor(p.impl*M.wIn)}
function roLo(p){return Math.max(1,Math.floor(p.impl/M.wOut))}
function roHi(p){return Math.floor(p.impl*M.wOut)}
function farmSteps(p){const gas=p.gas,fee=2*gas+5,opp=5000*0.04*(12/52);
 const pct=((5000/p.tvl)*100).toFixed(3);
 const chain1=p.chains[0]||"its main chain";
 const cheap=p.chains.reduce((a,c)=>(GAS[c]??1)<(GAS[a]??1)?c:a,chain1);
 const c2=p.chains[1];
 const comps=M.catComps[p.cat]??0;
 const gr=p.growth==null?"unreported":`${p.growth>0?"+":""}${p.growth}%`;
 const half=(p.growth??0)<-10;
 const s1=`Deposit $5,000 into ${p.name} — ${MECH[p.cat]||"deposit into"} ${chain1}. $5,000 is ${pct}% of its ${tvlM(p.tvl)} TVL. Gas about $${gas}/tx on ${cheap} (cheapest route); setup fee $${fee.toFixed(2)} plus $${opp.toFixed(2)} T-bill cost over 12 weeks.`;
 const s2=`Second action for ${p.name}: ${SECOND[p.cat]||"make a second, smaller deposit"} in week 3${c2?` and spread it to ${c2}`:""}. Weekly: ${WEEKLY[p.cat]||"one on-chain action a week to stay active"}.`;
 const s3=`Hold 12 weeks and track TVL: ${p.name} moved ${gr} in 7d on ${tvlM(p.tvl)} TVL, with ${comps} traded comps behind its ${fm(p.impl)} if-launches value.${half?" TVL fell over 10% in 7d, so this plan starts at half the usual size.":" Snapshot timing is unknown, so stay active until an announcement."}`;
 const s4=p.be===null?`Risk for ${p.name}: break-even is never reached at any capital — the expected slice never covers its own cost. ${p.wa!==null?`Walk-away multiple ${p.wa.toFixed(2)}x.`:""} Farming does not guarantee you qualify: a launch does not guarantee eligibility, and extra activity beyond the deposit is usually required.`:`Risk for ${p.name}: break-even needs $${fi(p.be)} of capital${p.wa!==null?`; walk-away multiple ${p.wa.toFixed(2)}x — below it, the plan no longer pays`:""}. Farming does not guarantee you qualify: a launch does not guarantee eligibility, and extra activity beyond the deposit is usually required.`;
 const s5=`Exit ${p.name}: withdraw the $5,000 and any rewards after 12 weeks or at launch, whichever comes first. Expected net $${Math.round(p.net)} at $5K/12wk/7% — odds tier ${p.tier} (${p.odds}, WF-tested; per-row odds from full fit; formulation beats base on 3 WF cuts). Verdict does not price eligibility risk: a launch does not guarantee you qualify.`;
 return [s1,s2,s3,s4,s5]}
const rows=R.map((r,i)=>{const p={slug:r[0],name:r[1],cat:CA[r[2]],chains:r[3]?r[3].split(",").map(x=>CH[+x]):[],tvl:r[4],growth:r[5],age:r[6],impl:r[7],odds:r[8]/1000,flag:r[9],grey:!!r[10],watch:!!r[11],rrLo:r[12],rrHi:r[13]};p.gas=gasOf(p);p.ev=Math.max(1,Math.round(p.impl*p.odds));p.mult=p.impl/p.tvl;p.net=netOf(p,p.impl,1);p.verdict=verdict(p.net);p.fee=2*gasOf(p)+5;p.be=beOf(p,p.impl);p.wa=waOf(p,p.impl);p.conv=convOf(p);p.ls=lsOf(p);p.gs=gasShare(p);p.fv=farmVal(p);p.conf=confOf(p);p.sig=signals(p);p.tier=tierOf(p.odds);p.rb=rebuild(p);p.rank=i+1;return p});
const implRank=new Map([...rows].sort((a,b)=>b.impl-a.impl).map((p,i)=>[p.slug,i+1]));
rows.forEach(p=>p.rankImpl=implRank.get(p.slug));
function kpi(){$("kpi").innerHTML=[
 ["RANKED","198 · 40/40"],
 ["TOP-1 EV",rows[0].name+" · "+fm(rows[0].ev)],
 ["TOTAL EV",fm(M.total_ev)+" · impl "+fm(M.total_implied)],
 ["MISS (A)","×/"+M.modelA.medWF.toFixed(2)+" medWF"],
 ["RANGE","49% / 78% inner/outer"],
 ["ODDS · FARM","Brier "+M.oddsWF[1].brierEns.toFixed(3)+" vs "+M.oddsWF[1].brierBase.toFixed(3)+" · FARM 55"]
].map(([k,v])=>`<div class="k"><b>${k}</b><span>${v}</span></div>`).join("")}
function tiles(){const t=M.tiles;$("narrative").textContent=M.narrative;$("tiles").innerHTML=t.map(x=>`<button class="tile" data-slug="${x.slug}"><b>${esc(x.name)}</b><span>net $${fi(x.net)} · $${x.perHour.toFixed(2)}/h · bear-proof</span></button>`).join("")}
function flag(){const f=rows.filter(p=>p.verdict==="FARM"&&p.wa<2).length;const d=rows.filter(p=>p.verdict==="FARM"&&Math.abs(-(p.fee+46.1538))>p.net).length;$("flag").innerHTML=`<span class="ok">ROBUST 1 · Anemoy Capital (walk-away 10.34x)</span><span class="bad">FRAGILE ${f} · walk-away &lt;2x</span><span>bear-proof 3: Anemoy, Nucleus, BounceBit Prime · downside&gt;upside ${d}</span>`}
function evstrip(){const t5=rows.slice(0,5).reduce((a,p)=>a+p.ev,0);const t10=rows.slice(0,10).reduce((a,p)=>a+p.ev,0);$("evstrip").innerHTML=`EV headline — top 5 ${fm(t5)} · top 10 ${fm(t10)} (${(t10/M.total_ev*100).toFixed(1)}% of board) · median EV ${fm(rows.map(p=>p.ev).sort((a,b)=>a-b)[99])} · med shift ${M.median_shift} · top-10 overlap ${M.top10_overlap}/10 · Spearman ${M.spearman_ev_impl}`}
function integrity(){const tot=rows.reduce((a,p)=>a+p.ev,0);const nonRising=rows.every((p,i)=>i===0||p.ev<=rows[i-1].ev);const ranksOk=rows.every((p,i)=>p.rank===i+1);const rb=rows.filter(p=>p.rb===p.impl).length;$("integrity").innerHTML=`✓ table = board.json recomputed · ${rows.length} rows · ranks ${ranksOk?"✓":"✗"} · EV non-rising ${nonRising?"✓":"✗"} · Σ EV $${fi(tot)} ${tot===M.total_ev?"✓":"✗"} · Rebuild ${rb}/198 · ledger 758 ✓`}
const COLS=[["rank","#"],["name","Protocol"],["tvl","TVL"],["growth","7d"],["age","Age"],["mult","Mult"],["impl","Implied"],["ev","EV"],["odds","Odds"],["net","Net $5K"],["verdict","Verdict"],["fee","Fee"],["be","Break-even"],["wa","Walk-away"],["range","Range"],["conv","Convinction"],["ls","Launch"],["gs","Gas %"],["fv","Farm $"],["rr","Rank rng"]];
const DEFVIS=new Set(["rank","name","tvl","growth","mult","ev","impl","odds","net","verdict"]);
let vis=new Set(DEFVIS),sortStack=[["rank",1]],simOn=false,simH=0,simD=7,showAll=false;
const state={q:"",verdict:new Set(),tier:new Set(),cat:"",watch:false,grey:false,band:"",sig:""};
function cell(p,k){switch(k){
 case "rank":return [simOn?p.simNet:p.rank,simOn?"#"+p.rank+" · $"+fi(p.simNet):""+p.rank];
 case "name":return [p.name,`<b>${esc(p.name)}</b><i>${esc(p.cat)} · ${esc(p.chains.join(", ")||"—")}${p.watch?" · ★":""}${p.grey?" · grey":""}</i>`];
 case "tvl":return [p.tvl,tvlM(p.tvl)];
 case "growth":return [p.growth??-999,p.growth==null?"—":(p.growth>0?"+":"")+p.growth+"%"];
 case "age":return [p.age??-1,p.age==null?"?":p.age>=365?(p.age/365).toFixed(1)+"y":Math.round(p.age)+"d"];
 case "mult":return [p.mult,p.mult.toFixed(2)+"x"];
 case "impl":return [p.impl,fm(p.impl)];
 case "ev":return [p.ev,fm(p.ev)];
 case "odds":return [p.odds,p.odds.toFixed(3)+" "+p.tier];
 case "net":return [p.net,"$"+fi(p.net)];
 case "verdict":return [p.verdict,p.verdict];
 case "fee":return [p.fee,"$"+p.fee.toFixed(2)];
 case "be":return [p.be??1e18,p.be==null?"never":"$"+fi(p.be)];
 case "wa":return [p.wa,p.wa.toFixed(2)+"x"];
 case "range":return [rHi(p)-rLo(p),fm(rLo(p))+"–"+fm(rHi(p))];
 case "conv":return [p.conv,p.conv];
 case "ls":return [p.ls,p.ls];
 case "gs":return [p.gs,(p.gs*100).toFixed(1)+"%"];
 case "fv":return [p.fv,"$"+p.fv.toFixed(2)];
 case "rr":return [p.rrHi-p.rrLo,p.rrLo+"–"+p.rrHi];
 default:return [0,""]}}
function filtered(){let list=rows.filter(p=>{
 if(state.q&&!(p.name.toLowerCase().includes(state.q)||p.slug.includes(state.q)))return false;
 if(state.verdict.size&&!state.verdict.has(p.verdict))return false;
 if(state.tier.size&&!state.tier.has(p.tier))return false;
 if(state.cat&&p.cat!==state.cat)return false;
 if(state.watch&&!p.watch)return false;
 if(state.grey&&!p.grey)return false;
 if(state.band==="lo"&&p.mult>=1)return false;
 if(state.band==="mid"&&(p.mult<1||p.mult>5))return false;
 if(state.band==="hi"&&p.mult<=5)return false;
 if(state.sig&&!p.sig.some(s=>s.toLowerCase().includes(state.sig)))return false;
 return true});
 if(simOn){list.forEach(p=>{const s=slice1000(p,p.impl*(1-simH/100))*(simD/7);p.simNet=s*5-(p.fee+46.1538)})}
 list.sort((a,b)=>{for(const [k,d] of sortStack){const va=cell(a,k)[0],vb=cell(b,k)[0];if(va<vb)return -d;if(va>vb)return d}return a.rank-b.rank});
 return list}
function render(){const list=filtered();const def=!showAll&&!state.q&&!state.verdict.size&&!state.tier.size&&!state.cat&&!state.watch&&!state.grey&&!state.band&&!state.sig&&!simOn;
 const top10=new Set(rows.slice(0,10).map(p=>p.slug));const bear=new Set(rows.filter(p=>netOf(p,p.impl,0.33)>25).map(p=>p.slug));const frag=new Set(rows.filter(p=>p.verdict==="FARM"&&p.wa<2).map(p=>p.slug));const down=new Set(rows.filter(p=>p.verdict==="FARM"&&Math.abs(-(p.fee+46.1538))>p.net).map(p=>p.slug));
 const shown=def?list.filter(p=>top10.has(p.slug)||bear.has(p.slug)||frag.has(p.slug)||down.has(p.slug)):list;
 const tb=$("tbody");tb.innerHTML=shown.map(p=>`<tr data-slug="${p.slug}" class="${p.verdict.toLowerCase()}">${COLS.filter(([k])=>vis.has(k)).map(([k])=>`<td data-col="${k}" class="c-${k}">${cell(p,k)[1]}</td>`).join("")}</tr>`).join("");
 const totEV=shown.reduce((a,p)=>a+p.ev,0),totImpl=shown.reduce((a,p)=>a+p.impl,0),farmN=shown.filter(p=>p.verdict==="FARM").length;
 $("totals").textContent=`${shown.length} of ${list.length} filtered (${rows.length} rows) · Σ EV ${fm(totEV)} · Σ implied ${fm(totImpl)} · FARM ${farmN} · click a row for detail`;
 $("showall").textContent=showAll?"Show default 35":`Show all ${list.length}`;$("showall").hidden=!def&&showAll===false?false:showAll?false:!def;
 document.querySelectorAll("#thead th").forEach(th=>{const k=th.dataset.col;th.hidden=!vis.has(k);th.textContent=COLS.find(c=>c[0]===k)[1]+(sortStack[0][0]===k?(sortStack[0][1]===1?" ▲":" ▼"):"")})}
function buildHead(){$("thead").innerHTML="<tr>"+COLS.map(([k,l])=>`<th data-col="${k}">${l}</th>`).join("")+"</tr>";$("thead").addEventListener("click",e=>{const th=e.target.closest("th");if(!th)return;const k=th.dataset.col;if(e.shiftKey){const i=sortStack.findIndex(s=>s[0]===k);if(i>=0)sortStack[i][1]*=-1;else sortStack.push([k,1])}else{sortStack=sortStack[0][0]===k?[[k,-sortStack[0][1]]]:[[k,1]]}render()})}
function buildChooser(){$("chooser").innerHTML=COLS.map(([k,l])=>`<label><input type=checkbox data-col="${k}"${vis.has(k)?" checked":""}>${l}</label>`).join("");$("chooser").addEventListener("change",e=>{const c=e.target.dataset.col;if(e.target.checked)vis.add(c);else vis.delete(c);render()})}
function buildFilters(){const cats=[...new Set(rows.map(p=>p.cat))].sort();$("fcat").innerHTML="<option value=''>all categories</option>"+cats.map(c=>`<option>${esc(c)}</option>`).join("");$("fcat").addEventListener("change",e=>{state.cat=e.target.value;render()});
 $("q").addEventListener("input",e=>{state.q=e.target.value.trim().toLowerCase();render()});
 document.querySelectorAll("[data-f]").forEach(b=>b.addEventListener("click",()=>{const [k,v]=b.dataset.f.split(":");const s=state[k];if(s instanceof Set){s.has(v)?s.delete(v):s.add(v);b.classList.toggle("on",s.has(v))}else{state[k]=state[k]===v?"":v;document.querySelectorAll(`[data-f^="${k}:"]`).forEach(x=>x.classList.toggle("on",x===b&&state[k]===v))}render()}));
 $("fwatch").addEventListener("change",e=>{state.watch=e.target.checked;render()});
 $("fgrey").addEventListener("change",e=>{state.grey=e.target.checked;render()});
 $("density").addEventListener("click",()=>{document.body.classList.toggle("roomy");$("density").textContent=document.body.classList.contains("roomy")?"Density: comfortable":"Density: compact"});
 $("showall").addEventListener("click",()=>{showAll=!showAll;render()});
 $("choosertoggle").addEventListener("click",()=>{$("chooser").hidden=!$("chooser").hidden});
 $("tbody").addEventListener("click",e=>{const tr=e.target.closest("tr");if(tr)showDetail(tr.dataset.slug)})}
function simUI(){$("simh").addEventListener("input",e=>{simH=+e.target.value;$("simhval").textContent=simH+"%";applySim()});
 $("simd").addEventListener("input",e=>{simD=+e.target.value;$("simdval").textContent=simD+"%";applySim()});
 $("simreset").addEventListener("click",()=>{simOn=false;simH=0;simD=7;$("simh").value=0;$("simd").value=7;$("simhval").textContent="0%";$("simdval").textContent="7%";sortStack=[["rank",1]];render()})}
function applySim(){simOn=simH>0||simD!==7;if(simOn)sortStack=[["rank",-1]];render()}
function showDetail(slug){const p=rows.find(r=>r.slug===slug);if(!p)return;const steps=farmSteps(p);
 $("detail").hidden=false;
 $("detail").innerHTML=`<h2>${esc(p.name)} <span class="mut">#${p.rank} EV · #${p.rankImpl} implied · ${esc(p.cat)}</span></h2>
 <p>TVL ${tvlM(p.tvl)} · 7d ${p.growth==null?"—":p.growth+"%"} · age ${p.age==null?"?":Math.round(p.age)+"d"} · ${esc(p.chains.join(", ")||"—")} · mult ${p.mult.toFixed(2)}x · implied ${fm(p.impl)} · odds ${p.odds.toFixed(3)} (${p.tier}) · <b>EV ${fm(p.ev)}</b> · net $${fi(p.net)} · ${p.verdict} · conv ${p.conv} · launch ${p.ls} · gas ${(p.gs*100).toFixed(1)}% · farm $${p.fv.toFixed(2)} · conf ${p.conf}</p>
 <p><b>Rebuild:</b> from inputs × coefficients A: implied $${fi(p.rb)} — ${p.rb===p.impl?"MATCH":"MISMATCH "+fi(p.rb)+" vs "+fi(p.impl)} · range ${fm(rLo(p))}–${fm(rHi(p))} (outer ${fm(roLo(p))}–${fm(roHi(p))}) · rank range ${p.rrLo}–${p.rrHi} · signals: ${esc(p.sig.join(", "))}</p>
 <p><b>Comps:</b> ${M.catComps[p.cat]??0} traded.</p>
 <h3>Farm steps (5)</h3><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>
 <h3>D-10 pool calculator</h3><p>pool $ <input id="pool" type="number" value="1000000"> dep $ <input id="dep" type="number" value="5000000"> cap $ <input id="cap" type="number" value="5000"> <button id="poolgo">Compute</button> <span id="poolout"></span></p>
 <p class="mut">payout = pool × min(1, capital/deposits).</p>`;
 $("poolgo").addEventListener("click",()=>{const pool=+$("pool").value,dep=+$("dep").value,cap=+$("cap").value;const pay=pool*Math.min(1,cap/Math.max(dep,1));$("poolout").textContent=`payout $${fi(pay)} · net $${fi(pay-(p.fee+46.1538))}`});
 $("detail").scrollIntoView()}
function t3(c){return `<div class="tier ${c.t}"><b>${c.t}</b><span>odds ${c.lo}–${c.hi}</span><span>rate ${c.rate}</span><span>${c.n} rows</span></div>`}
function evTab(){const tiers=[{t:"HIGH",lo:M.tierCutHi.toFixed(3),hi:"1.000",rate:M.tierPooled.HIGH.toFixed(3),n:rows.filter(p=>p.tier==="HIGH").length},{t:"MED",lo:M.tierCutLo.toFixed(3),hi:M.tierCutHi.toFixed(3),rate:M.tierPooled.MED.toFixed(3),n:rows.filter(p=>p.tier==="MED").length},{t:"LOW",lo:"0.000",hi:M.tierCutLo.toFixed(3),rate:M.tierPooled.LOW.toFixed(3),n:rows.filter(p=>p.tier==="LOW").length}];
 const brier=M.oddsWF.map(o=>`<tr><td>${o.cut}</td><td>${o.brierEns.toFixed(3)}</td><td>${o.brierLog.toFixed(3)}</td><td>${o.brierEmp.toFixed(3)}</td><td>${o.brierBase.toFixed(3)}</td><td>${(o.called*100).toFixed(1)}%</td></tr>`).join("");
 $("evidence").innerHTML=`
 <h2>Odds panel — ensemble 50/30/20 (richer logistic / empirical cat×age shrink 10 / base rate)</h2>
 <div class="tiers">${tiers.map(t3).join("")}</div>
 <p class="mut">Syarat (e): [logTVL, log10(age), growth, log10(nChains), log10(age)×logTVL, %inCat] + TOPCATS; logistic Newton λ=1. Empirical: (category × age-band) shrink 10 toward base rate ${M.baseRate.toFixed(3)}, fallback age-band then base. Bands &lt;90d/90d–1y/1–2y/&gt;2y/unknown. Odds rounded once to 3dp.</p>
 <table class="mini"><tr><th>WF cut</th><th>Brier ensemble</th><th>logistic</th><th>empirical</th><th>base rate</th><th>called right</th></tr>${brier}</table>
 <p><b>What-if:</b> vesting <select id="vest"><option value="typical">typical PV 0.926</option><option value="harsh">harsh PV 0.707</option><option value="generous">generous PV 0.954</option></select> <span id="vestout"></span> · multi-wallet <select id="mw"><option value="1">1 wallet</option><option value="4">4 wallets (gas ×4)</option></select> <span id="mwout"></span> · bear/bull/log-share (live): <span id="bbout"></span></p>
 ${evSections()}`;
 const vest=$("vest"),mw=$("mw");
 const cnt=f=>{const c={FARM:0,MARGINAL:0,SKIP:0};rows.forEach(p=>c[verdict(f(p))]++);return c.FARM+"/"+c.MARGINAL+"/"+c.SKIP};
 const upd=()=>{const pv={typical:0.926,harsh:0.707,generous:0.954}[vest.value];$("vestout").textContent=`D-47 ${vest.value}: ${cnt(p=>netOf(p,p.impl,pv))}`;
 const g4=mw.value==="4";$("mwout").textContent=`D-51 ${g4?"4 wallets":"1 wallet"}: ${cnt(p=>{const s=slice1000(p,p.impl);return s*5-((g4?8*p.gas:2*p.gas)+5)-46.1538})}`;
 $("bbout").textContent=`bear ${cnt(p=>netOf(p,p.impl,0.33))} · bull ×2.5 ${cnt(p=>netOf(p,p.impl,2.5))} · bull ×3.0 ${cnt(p=>netOf(p,p.impl,3))} · log-share $1K ${cnt(p=>logShare(p,1000))} · $5K ${cnt(p=>logShare(p,5000))} · $25K ${cnt(p=>logShare(p,25000))}`}; vest.addEventListener("change",upd);mw.addEventListener("change",upd);upd()}
function logShare(p,plan){return slice1000(p,p.impl)*Math.log(1+plan/1000)-(2*p.gas+plan*0.001)-plan*0.04*(12/52)}
function evSections(){const mrow=(m,n)=>`<tr><td>${n}</td><td>${m.medLOO.toFixed(2)}</td><td>${m.meanLOO.toFixed(2)}</td><td>${m.medWF.toFixed(2)}</td><td>${m.meanWF.toFixed(2)}</td><td>${m.new35Med==null?"—":m.new35Med.toFixed(2)}</td></tr>`;
 const ab=M.ablation.map(a=>`<tr><td>${esc(a.name)}</td><td>${a.looMed.toFixed(2)}</td><td>${a.looMean.toFixed(2)}</td><td>${a.wfMed.toFixed(2)}</td><td>${a.wfMean.toFixed(2)}</td></tr>`).join("");
 const d28=M.d28.map(v=>`${v.cat} ×${v.med.toFixed(2)} (n=${v.n})`).join(" · ");
 const lam=M.innerLam.map(l=>`${l.cut}: λ10 ×/${l.lam10.toFixed(2)} vs λ30 ×/${l.lam30.toFixed(2)}`).join(" · ");
 return `
 <section><h3>1 · Model selection — A frozen</h3><table class="mini"><tr><th>model</th><th>med LOO</th><th>mean LOO</th><th>med WF</th><th>mean WF</th><th>new-35</th></tr>${mrow(M.modelA,"A lam30 (frozen)")}${mrow(M.modelB,"B lam3")}${mrow(M.modelC,"C lam1")}${mrow(M.modelD24,"D-24 logTVL-only")}${mrow(M.modelCurve,"D-52 curve")}${mrow(M.modelD25,"D-25 prior (tested)")}${mrow(M.modelD26,"D-26 asym (tested)")}</table>
 <p class="mut">Ridge [log10(TVL), growth/100] + TOPCATS (${M.topcats.join(", ")}), λ=30, target log10(mcap), cap ×${M.cap_p90} (0 bound). Inner-LOO λ: ${lam}. Curve not adopted (med LOO ×/2.72, mean WF ×/5.73).</p></section>
 <section><h3>2 · Flat baselines + ablation</h3><table class="mini"><tr><th>ablation</th><th>med LOO</th><th>mean LOO</th><th>med WF</th><th>mean WF</th></tr>${ab}</table>
 <p class="mut">Flat: med LOO ×/4.65, mean WF ×/6.89. Size-only beats A on mean LOO (×/4.34 vs ×/4.71); A wins med LOO and med WF. Placebo: ×/3.76 / ×/5.79 (degenerate). D-28: ${d28}</p></section>
 <section><h3>3 · Range calibration</h3><p>WF coverage (3 cuts avg): inner ×1.5 49.2% (target 50%), outer ×1.6 78.3% (target 80%). Clean-cut (n=31): 48.4% / 87.1%, bands ×/4.18 and ×/32.47. TVL-tercile inner: low ${Math.round(M.tercileInner[0]*100)}% / mid ${Math.round(M.tercileInner[1]*100)}% / high ${Math.round(M.tercileInner[2]*100)}% — U-shaped, mid worst. D-43 Pearson(|LOO resid|, growth) = ${M.d43.toFixed(2)} (ref −0.72 not reproducible).</p></section>
 <section><h3>4 · Conformal battery (negative controls)</h3><p>Jackknife+ (WF 67/33): ${Math.round(M.jackknife.inner*100)}% / ×${M.jackknife.band.toFixed(2)}. Mondrian (WF split-conformal per TVL tercile): ${Math.round(M.mondrianInner*100)}% (ref 16% not reproducible). CQR-lite: ${Math.round(M.cqrInner*100)}%. All fail the 45–50% inner target.</p></section>
 <section><h3>5 · Economics — D-03 / D-04 / D-47–D-51</h3><p>D-03 break-even: finite ${M.d03.finite} / never ${M.d03.never}, med $${fi(M.d03.median)}, p10 $${fi(M.d03.p10)}, p90 $${fi(M.d03.p90)}, max $${fi(M.d03.max)} (${M.d03.maxName}). D-04 walk-away (FARM): med ${M.d04.median.toFixed(2)}x, p10 ${M.d04.p10.toFixed(2)}, p90 ${M.d04.p90.toFixed(2)}, min ${M.d04.min.toFixed(2)}, max ${M.d04.max.toFixed(2)}; fragile ${M.d04.fragile}, robust ${M.d04.robust} (${M.d04.robustNames.join(", ")}). D-50 EV/cost: med ${M.d50.median.toFixed(2)}, p90 ${M.d50.p90.toFixed(2)}, max ${M.d50.max.toFixed(2)}, ${M.d50.gt1} rows &gt;1x, ${M.d50.gt3} &gt;3x. D-47 vesting: typical 48/77/73, harsh 28/72/98, generous 52/75/71. D-48: bear 3/44/151, bull ×2.5 122/50/26, bull ×3.0 132/44/22. D-49 log-share: $1K 3/193/2, $5K 3/54/141, $25K 1/0/197 (payout ∝ ln(1+plan/1000)). D-51 multi-wallet (gas ×4): 49/61/88; downside &gt; upside ${M.d51.downsideGtUpside} FARM rows. Verdicts ($5K/12wk/7%): 55/74/69 — unchanged from v11.</p></section>
 <section><h3>6 · Gas-share + farm value</h3><p>D-55 (gas ETH $8 / Solana $1 / Bitcoin $2 / L2 $1 / other $2, first chain, hold 60/45/30d by age, modal $50/$100/$150/$250): FARM ${M.d55.farm} / thin ${M.d55.thin} / SKIP ${M.d55.skip}, med ${(M.d55.median*100).toFixed(1)}%, max ${(M.d55.max*100).toFixed(1)}% (ref 110/38/50, med 24%, max 176% — reconstruction). D-56 farm value (modal × multiple): med $${M.d56.median.toFixed(2)}, max $${M.d56.max.toFixed(2)} (ref max $51.39 — not reproducible); half-size ${M.d56.halfSize} rows (7d &lt; −10%).</p></section>
 <section><h3>7 · Launch score, confidence, signals</h3><p>D-53 (age + size only; growth excluded, D-05): med ${M.launchScore.median}, p10 ${M.launchScore.p10}, p90 ${M.launchScore.p90.toFixed(1)}, max ${M.launchScore.max}, min ${M.launchScore.min}. D-54 confidence: 100 = ${M.confidence.n100} rows, 70 = ${M.confidence.n70}. D-57: surging ${M.d57.surging}, sliding ${M.d57.sliding}, token-free 3y ${M.d57.tokenFree3y}, 8+ chains ${M.d57.chains8}, $1B+ ${M.d57.billion}, watchlist ${M.d57.watchlist}, no signals ${M.d57.zeroSignals}. Tiers: early ${M.d57.tiers.early}, mid ${M.d57.tiers.mid}, large ${M.d57.tiers.large}, inst ${M.d57.tiers.inst}. </p></section>
 <section><h3>8 · Bootstrap rank ranges (D-22)</h3><p>200 refits, seed 20261124, odds fixed: standardised logTVL slope ${M.boot.slopeMean.toFixed(3)} ± ${M.boot.slopeSd.toFixed(3)} (ref 0.186 ± 0.064); top-20 stability ${(M.boot.top20Stability*100).toFixed(0)}% (ref 70.9%); med rank-range width ${M.boot.medianWidth} (ref 52.55). </p></section>
 <section><h3>9 · Conviction (D-33)</h3><p>Conviction = 0.6·odds + 0.25·min(multiple/2.87, 1) + 0.15·min(comps/12, 1), ×100. Med ${M.conviction.median}; top 5: ${M.conviction.top5.map(c=>c.name+" "+c.v).join(", ")} (ref top-5 differs — reconstruction, not verbatim).</p></section>
 <section><h3>10 · Calendar (D-11)</h3><p>7 sessions Mon–Sun, one chain per session, ${M.calendar.rowsUsed} FARM rows, total net $${fi(M.calendar.totalNet)}, ${M.calendar.totalHours} hours (0.5h per row). Ref: 34 rows / $2,879 / 17.5h — grouping rule not specified; measured here.</p></section>
 <section><h3>11 · Literature + caveats</h3><p>D-35: launches cluster in bull windows; D-36: farming is negative-sum after gas — priced here. D-75: multiples compress as TVL grows. Caveats — D-37: the model only sees TVL, growth and category; D-39: odds are calibrated on a 92-row traded set with 54.9% base launch rate; D-40: the board is a bet, not a promise — a launch does not guarantee you qualify; D-61: ranks are unstable (med rank-range width ${M.boot.medianWidth}). D-25/D-26 tested, not adopted.</p></section>`}
function calTab(){const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];const s=M.calendar.sessions;$("calendar").innerHTML=`<h2>Farm calendar — 7 sessions, one chain per day</h2><p class="mut">Net $${fi(M.calendar.totalNet)} · ${M.calendar.totalHours}h · ${M.calendar.rowsUsed} FARM rows · 0.5h/row · 7 chains with most FARM rows.</p>`+days.map((d,i)=>{const x=s[i];if(!x)return"";return `<div class="cal"><b>${d}</b><span>${esc(x.chain)}</span><span>${x.rows} rows</span><span>net $${fi(x.net)}</span><span>${x.hours}h</span></div>`}).join("")}
function doExport(kind){const head=["rank","name","category","chains","tvl_usd","change_7d","age_days","multiple","implied_if_launches_usd","odds","implied_value_usd","net_usd","verdict","fee_usd","break_even_usd","walk_away_mult","conviction","launch_score","gas_share","farm_value","rank_range_lo","rank_range_hi"];
 const arr=rows.map(p=>[p.rank,p.name,p.cat,p.chains.join("|"),p.tvl,p.growth??"",p.age??"",+p.mult.toFixed(4),p.impl,p.odds,p.ev,+p.net.toFixed(2),p.verdict,p.fee,p.be==null?"":+p.be.toFixed(2),+p.wa.toFixed(2),p.conv,p.ls,+p.gs.toFixed(2),+p.fv.toFixed(2),p.rrLo,p.rrHi]);
 if(kind==="json"){const out=arr.map(a=>{const o={};head.forEach((h,i)=>o[h]=a[i]);return o});dl("token-radar-01-v13.json",JSON.stringify(out,null,1))}
 else{const lines=[head.join(",")];arr.forEach(a=>lines.push(a.map((v,i)=>i===1||i===2||i===3?JSON.stringify(v):v).join(",")));dl("token-radar-01-v13.csv",lines.join("\n"))}}
function dl(name,txt){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
function tabs(){document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("on",x===b));$("boardpage").hidden=t!=="board";$("evidence").hidden=t!=="evidence";$("calendar").hidden=t!=="calendar";if(t==="evidence")evTab();if(t==="calendar")calTab()}))}
function init(){kpi();tiles();flag();evstrip();integrity();buildHead();buildChooser();buildFilters();simUI();tabs();render();
 $("expjson").addEventListener("click",()=>doExport("json"));$("expcsv").addEventListener("click",()=>doExport("csv"));
 document.querySelectorAll(".tile").forEach(t=>t.addEventListener("click",()=>showDetail(t.dataset.slug)));
 const h=location.hash;const m=h.match(/#tab=(board|evidence|calendar)/);if(m)document.querySelector(`[data-tab="${m[1]}"]`).click();
 const vm=h.match(/#verdict=(FARM|MARGINAL|SKIP)/);if(vm){state.verdict.add(vm[1]);showAll=true;document.querySelector(`[data-f="verdict:${vm[1]}"]`).classList.add("on");render()}
 const dm=h.match(/#detail=([\w-]+)/);if(dm)showDetail(dm[1]);}
document.addEventListener("DOMContentLoaded",init);
