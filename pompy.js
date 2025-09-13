/* FILE: pompy.js — pełna logika komponentów „Pompy ciepła”
   - duży katalog (fallback) + opcjonalny JSON: data/pompy.json
   - filtry, sort, chipsy/tagi, wyszukiwarka z mocą (10 kW / >=12 / 8-12)
   - rekomendacje mocy (szybkie + rozbudowane)
   - preview ceny zestawu (model proporcjonalny)
   - koszyk + sumy + eksporty + import
   - baza klientów + auto-zapis draftu umowy
*/
(() => {
'use strict';

/* ===================== KONFIG ===================== */
const DATA_SRC = 'data/pompy.json'; // jeżeli istnieje — zostanie użyty
const SAVE_KEY = 'kp_state_v3';
const DB_CLIENTS_KEY = 'kp_clients_db';
const CONTRACT_DRAFT_KEY = 'contract_draft';
const CONTRACTS_HISTORY_KEY = 'contracts_history';

/* ===================== HELPERY ===================== */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const INTmoney = new Intl.NumberFormat('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2});
const INTint   = new Intl.NumberFormat('pl-PL');
const fmt      = n => INTmoney.format(+n||0);
const cheapest = obj => Math.min(...Object.values(obj).map(Number));

/* ===================== DANE (FALLBACK – bogaty katalog) ===================== */
let HEATPUMPS = [
  // ===== MIDEA Arctic (R290) monoblok =====
  {brand:'Midea', model:'M-Thermal Arctic 4.5 kW Monoblok MHC-V4WD2N7-E30',  kind:'monoblok', phase:'1F', pA7:4.5,  scop:5.0, ref:'R290', noise:55, price:10686, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal Arctic 6.3 kW Monoblok MHC-V6W/D2N8-E30', kind:'monoblok', phase:'1F', pA7:6.3,  scop:5.0, ref:'R290', noise:55, price:11890, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal Arctic 8.4 kW Monoblok MHC-V8W/D2N8-BE30',kind:'monoblok', phase:'1F', pA7:8.4,  scop:4.9, ref:'R290', noise:55, price:9350,  tags:['Arctic','R290','WiFi']},
  {brand:'Midea', model:'M-Thermal Arctic 10 kW Monoblok MHC-V10WD2RN7-E30', kind:'monoblok', phase:'1F', pA7:10.0, scop:4.9, ref:'R290', noise:56, price:13990, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal Arctic 12 kW Monoblok MHC-V12WD2RN7-E30', kind:'monoblok', phase:'1F', pA7:12.0, scop:4.8, ref:'R290', noise:56, price:15438, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal Arctic 14 kW Monoblok MHC-V14WD2RN7-E30', kind:'monoblok', phase:'3F', pA7:14.0, scop:4.7, ref:'R290', noise:56, price:16260, tags:['Arctic','R290','3F']},

  // ===== MIDEA PRO (R32) – mono/split/AIO =====
  {brand:'Midea', model:'M-Thermal PRO 6 kW Monoblok',           kind:'monoblok', phase:'1F', pA7:6.0,  scop:4.9, ref:'R32', noise:55, price:12276, tags:['PRO','monoblok']},
  {brand:'Midea', model:'M-Thermal PRO 8 kW Monoblok',           kind:'monoblok', phase:'1F', pA7:8.0,  scop:4.9, ref:'R32', noise:55, price:9349,  tags:['PRO','monoblok']},
  {brand:'Midea', model:'M-Thermal 9 kW Monoblok (R32)',         kind:'monoblok', phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:55, price:15000, tags:['R32']},
  {brand:'Midea', model:'M-Thermal 10 kW Monoblok MHC-V10W/D2N8-B', kind:'monoblok', phase:'1F', pA7:10.0,scop:4.8, ref:'R32', noise:56, price:16080, tags:['WiFi']},
  {brand:'Midea', model:'M-Thermal 12 kW Monoblok',              kind:'monoblok', phase:'1F', pA7:12.0, scop:4.8, ref:'R32', noise:56, price:13170, tags:['R32']},
  {brand:'Midea', model:'M-Thermal 12 kW Monoblok 3F',           kind:'monoblok', phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:14873, tags:['3F']},
  {brand:'Midea', model:'M-Thermal 16 kW Monoblok M-Thermal-16W/D2N8-BE30', kind:'monoblok', phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:57, price:20516, tags:['3F']},
  {brand:'Midea', model:'M-Thermal PRO 16 kW Monoblok 3F',       kind:'monoblok', phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:57, price:23490, tags:['PRO','3F']},

  {brand:'Midea', model:'M-Thermal PRO 8 kW Split',              kind:'split',    phase:'1F', pA7:8.0,  scop:4.9, ref:'R32', noise:54, price:14500, tags:['PRO','split']},
  {brand:'Midea', model:'M-Thermal PRO 10 kW Split',             kind:'split',    phase:'1F', pA7:10.0, scop:4.9, ref:'R32', noise:54, price:16980, tags:['PRO','split']},
  {brand:'Midea', model:'M-Thermal PRO 12 kW Split 3F',          kind:'split',    phase:'3F', pA7:12.0, scop:4.8, ref:'R32', noise:55, price:18950, tags:['PRO','split','3F']},
  {brand:'Midea', model:'M-Thermal PRO 14 kW Split 3F',          kind:'split',    phase:'3F', pA7:14.0, scop:4.7, ref:'R32', noise:56, price:21990, tags:['PRO','split','3F']},

  {brand:'Midea', model:'M-Thermal All-in-One 8 kW (R32)',       kind:'all-in-one', phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:53, price:18490, tags:['AIO']},
  {brand:'Midea', model:'M-Thermal All-in-One 12 kW 3F (R32)',   kind:'all-in-one', phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:54, price:22990, tags:['AIO','3F']},
  {brand:'Midea', model:'M-Thermal PRO 14 kW Monoblok (premium)',kind:'monoblok', phase:'3F', pA7:14.0, scop:4.8, ref:'R32', noise:56, price:36350, tags:['premium']},

  // ===== PANASONIC Aquarea (różne serie) =====
  {brand:'Panasonic', model:'Aquarea Monoblok 5 kW WH-MDC05J3E5',            kind:'monoblok',  phase:'1F', pA7:5.0,  scop:5.0, ref:'R32', noise:53, price:20745, tags:['J-gen']},
  {brand:'Panasonic', model:'Aquarea Monoblok 7 kW WH-MDC07J3E5',            kind:'monoblok',  phase:'1F', pA7:7.0,  scop:4.9, ref:'R32', noise:54, price:11370, tags:['J-gen']},
  {brand:'Panasonic', model:'Aquarea Monoblok 9 kW WH-MXC09J3E5 (T-CAP)',    kind:'monoblok',  phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:55, price:15300, tags:['T-CAP']},
  {brand:'Panasonic', model:'Aquarea Monoblok 9 kW WH-MDC09H3E5',            kind:'monoblok',  phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:55, price:14459, tags:['High Perf.']},
  {brand:'Panasonic', model:'Aquarea Monoblok 12 kW WH-MDC12H6E5',           kind:'monoblok',  phase:'1F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:13090, tags:['High Perf.']},
  {brand:'Panasonic', model:'Aquarea Monoblok 16 kW WH-MXC16J9E8 3F',        kind:'monoblok',  phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:58, price:27990, tags:['monoblok','3F']},

  {brand:'Panasonic', model:'Aquarea Split 7 kW KIT-ADC07K3E5 (All-in-One)',  kind:'all-in-one',phase:'1F', pA7:7.0,  scop:4.9, ref:'R32', noise:53, price:19041, tags:['AIO']},
  {brand:'Panasonic', model:'Aquarea Split 9 kW KIT-WC09K3E5',               kind:'split',     phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:54, price:14930, tags:['split']},
  {brand:'Panasonic', model:'Aquarea Split 12 kW 1F KIT-WC12J3E5',            kind:'split',     phase:'1F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:18600, tags:['split','High Perf.']},
  {brand:'Panasonic', model:'Aquarea All-in-One 9 kW 3F',                    kind:'all-in-one',phase:'3F', pA7:9.0,  scop:4.8, ref:'R32', noise:54, price:22764, tags:['AIO','3F']},
  {brand:'Panasonic', model:'Aquarea T-CAP 9 kW Split Quiet',                kind:'split',     phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:54, price:21490, tags:['T-CAP','Quiet']},
  {brand:'Panasonic', model:'Aquarea T-CAP 12 kW Split 3F',                  kind:'split',     phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:55, price:25490, tags:['T-CAP','3F']},
  {brand:'Panasonic', model:'Aquarea K-Gen 7 kW AIO 1F',                     kind:'all-in-one',phase:'1F', pA7:7.0,  scop:4.9, ref:'R32', noise:52, price:20990, tags:['K-gen','AIO']},
  {brand:'Panasonic', model:'Aquarea K-Gen 12 kW AIO 3F',                    kind:'all-in-one',phase:'3F', pA7:12.0, scop:4.8, ref:'R32', noise:53, price:28990, tags:['K-gen','AIO','3F']},

  // ===== GALMET PRIMA – mono i split =====
  {brand:'Galmet', model:'PRIMA 6GT Monoblok',      kind:'monoblok', phase:'1F', pA7:6.0,  scop:4.8, ref:'R32', noise:55, price:22000, tags:['PRIMA','GT']},
  {brand:'Galmet', model:'PRIMA 8GT Monoblok',      kind:'monoblok', phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:55, price:24000, tags:['PRIMA','GT']},
  {brand:'Galmet', model:'PRIMA 10GT Monoblok',     kind:'monoblok', phase:'1F', pA7:10.0, scop:4.7, ref:'R32', noise:56, price:26000, tags:['PRIMA','GT']},
  {brand:'Galmet', model:'PRIMA 12GT Monoblok 3F',  kind:'monoblok', phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:32000, tags:['PRIMA','GT','3F']},
  {brand:'Galmet', model:'PRIMA 16GT Monoblok 3F',  kind:'monoblok', phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:57, price:36000, tags:['PRIMA','GT','3F']},

  {brand:'Galmet', model:'PRIMA S 6GT Split',       kind:'split',    phase:'1F', pA7:6.0,  scop:4.8, ref:'R32', noise:54, price:22000, tags:['PRIMA','GT','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 8GT Split',       kind:'split',    phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:54, price:24000, tags:['PRIMA','GT','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 10GT Split',      kind:'split',    phase:'1F', pA7:10.0, scop:4.7, ref:'R32', noise:55, price:26000, tags:['PRIMA','GT','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 12GT Split 3F',   kind:'split',    phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:55, price:32000, tags:['PRIMA','GT','SPLIT','3F']},
  {brand:'Galmet', model:'PRIMA S 16GT Split 3F',   kind:'split',    phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:56, price:36000, tags:['PRIMA','GT','SPLIT','3F']}
];

/* Bufory i CWU – ceny netto */
const BUFFERS = { '50':1200,'80':1450,'100':1650,'150':2200,'200':2600,'300':3600 };
const TANKS_SINGLE = { '150':2450,'200':2900,'250':3400,'300':3800 };
const TANKS_DUAL   = { '200':3450,'250':3990,'300':4450 };

/* Montaż i model wyceny */
const RAD_PRICE=750;
const ONLY_HP_SURCHARGE=4000;
const PACK_BASE_TARGETNET=38000;

/* ===================== STAN ===================== */
const state = {
  vat:0.08, rads:0, v3d:0, safety:0, hydro:0, glycol:0,
  basket:[],
  selectedHp:null, selectedBuf:'100', selectedTankType:'single', selectedTank:'200',
  provPct:0, provAbs:0,
  chipsActive:new Set(), tagsAll:false,
  filters:{ q:'', brand:'', kind:'', ref:'', phase:'', sort:'brand.asc' }
};

/* ===================== PERSIST ===================== */
function saveState(){ const s={...state, chipsActive:[...state.chipsActive]}; try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{} }
function loadState(){ try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw) return; const s=JSON.parse(raw); Object.assign(state,s||{}); if(Array.isArray(s?.chipsActive)) state.chipsActive=new Set(s.chipsActive);}catch{} }

/* ===================== DANE: próba JSON ===================== */
async function loadData(){
  try{
    const r = await fetch(DATA_SRC, {cache:'no-cache'});
    if(!r.ok) throw 0;
    const arr = await r.json();
    HEATPUMPS = arr.map(x=>({
      brand: x.brand || x.marka || '—',
      model: x.model || x.nazwa || '—',
      kind:  x.kind  || x.type   || 'monoblok',
      phase: x.phase || x.faza   || '',
      pA7:   Number(x.pA7 ?? x.power ?? x.moc) || 0,
      scop:  Number(x.scop) || '',
      ref:   x.ref   || x.refrigerant || x.czynnik || '',
      noise: Number(x.noise ?? x.halas) || '',
      price: Number(x.price ?? x.cena) || 0,
      tags:  Array.isArray(x.tags)?x.tags:(x.tags?String(x.tags).split(',').map(s=>s.trim()):[])
    }));
  }catch{/* fallback zostaje */}
}

/* ===================== NARZĘDZIA ===================== */
function cheapestPumpPrice(){ return Math.min(...HEATPUMPS.map(h=>+h.price||0)); }
function computeBaseOffset(){ return PACK_BASE_TARGETNET - (cheapestPumpPrice() + cheapest(BUFFERS) + cheapest(TANKS_SINGLE)); }
let BASE_OFFSET = computeBaseOffset();
function soloPrice(hp){ return (+hp.price||0) + ONLY_HP_SURCHARGE; }
function sortedHp(){ return HEATPUMPS.slice().sort((a,b)=> a.brand.localeCompare(b.brand,'pl') || a.pA7-b.pA7); }

const QUICK_TAGS = ['R290','R32','monoblok','split','all-in-one','1F','3F','WiFi','premium','T-CAP','High Perf.','PRIMA'];

/* ===================== CHIPS / FILTRY ===================== */
function makeChips(){
  const box=$('#chips'); if(!box) return; box.innerHTML='';
  QUICK_TAGS.forEach(t=>{
    const el=document.createElement('div');
    el.className='tag'; el.textContent=t; el.dataset.tag=t; el.style.cursor='pointer';
    if(state.chipsActive.has(t)) el.style.background='#233261';
    el.addEventListener('click', ()=>{
      if(state.chipsActive.has(t)){ state.chipsActive.delete(t); el.style.background=''; }
      else { state.chipsActive.add(t); el.style.background='#233261'; }
      renderTable(); saveState();
    });
    box.appendChild(el);
  });
  $('#tagsAll').checked = !!state.tagsAll;
}
function fillFilters(){
  const brands=[...new Set(HEATPUMPS.map(x=>x.brand))].sort((a,b)=>a.localeCompare(b,'pl',{sensitivity:'base'}));
  $('#fBrand').innerHTML = '<option value="">Marka (wszystkie)</option>'+brands.map(b=>`<option>${b}</option>`).join('');
  // odtworzenie wyborów
  $('#fBrand').value = state.filters.brand||'';
  $('#fType').value  = state.filters.kind||'';
  $('#fRef').value   = state.filters.ref||'';
  $('#fPhase').value = state.filters.phase||'';
  $('#sort').value   = state.filters.sort||'brand.asc';
  $('#q').value      = state.filters.q||'';
}

/* ===================== SZUKANIE / SORT ===================== */
function parsePowerQuery(q){
  if(!q) return null; q=String(q).trim();
  const kw=q.match(/^([<>]=?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if(kw){ const op=kw[1], val=parseFloat(kw[2]); if(op==='>=')return p=>p>=val; if(op==='<=')return p=>p<=val; if(op==='>')return p=>p>val; if(op==='<')return p=>p<val; return null; }
  const range=q.match(/^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)/);
  if(range){ const a=parseFloat(range[1]), b=parseFloat(range[2]); const lo=Math.min(a,b), hi=Math.max(a,b); return p=>p>=lo && p<=hi; }
  const eq=q.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if(eq){ const v=parseFloat(eq[1]), tol=0.6; return p=>Math.abs(p-v)<=tol; }
  return null;
}
function applyFiltersSort(rows){
  const {q,brand,kind,ref,phase,sort} = state.filters;
  const powerPredicate = parsePowerQuery(q);

  rows=rows.filter(p=>{
    if(brand && p.brand!==brand) return false;
    if(kind  && p.kind !==kind ) return false;
    if(ref   && p.ref  !==ref  ) return false;
    if(phase && p.phase!==phase) return false;

    if(state.chipsActive.size){
      const tags=new Set([p.kind,p.phase,p.ref,...(p.tags||[])].filter(Boolean));
      const hits=[...state.chipsActive].map(t=>tags.has(t));
      if(state.tagsAll ? hits.some(x=>!x) : !hits.some(Boolean)) return false;
    }

    if(q){
      const textHit=[p.brand,p.model,p.ref,p.kind,p.phase,(p.tags||[]).join(' ')].some(v=>(v||'').toLowerCase().includes(q.toLowerCase()));
      if(powerPredicate) return textHit || powerPredicate(p.pA7);
      return textHit;
    }
    return true;
  });

  switch(sort){
    case 'brand.asc':  rows.sort((a,b)=> (a.brand.localeCompare(b.brand,'pl')) || a.pA7-b.pA7); break;
    case 'brand.desc': rows.sort((a,b)=> (b.brand.localeCompare(a.brand,'pl')) || a.pA7-b.pA7); break;
    case 'p.asc':      rows.sort((a,b)=>a.pA7-b.pA7); break;
    case 'p.desc':     rows.sort((a,b)=>b.pA7-a.pA7); break;
    case 'price.asc':  rows.sort((a,b)=>a.price-b.price); break;
    case 'price.desc': rows.sort((a,b)=>b.price-a.price); break;
  }
  return rows;
}

/* ===================== RENDER TABELI ===================== */
function renderTable(){
  const rows=applyFiltersSort(HEATPUMPS.slice());
  $('#cntAll').textContent=HEATPUMPS.length;
  $('#cntVis').textContent=rows.length;
  const tb=$('#tbody'); tb.innerHTML='';
  rows.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><button class="btn tiny" data-pick="${p.brand}|${p.model}">Wybierz</button></td>
      <td><b>${p.brand}</b><div class="small">${p.model}</div></td>
      <td>${p.kind}</td>
      <td>${p.pA7}</td>
      <td>${p.scop||''}</td>
      <td>${p.ref||''}</td>
      <td>${p.phase||''}</td>
      <td>${p.noise||''}</td>
      <td>${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</td>`;
    tb.appendChild(tr);
  });
}

/* ===================== KONFIGURATOR / PREVIEW ===================== */
function sortedOptions(){ return HEATPUMPS.slice().sort((a,b)=> a.brand.localeCompare(b.brand,'pl') || a.pA7 - b.pA7); }
function fillSelects(){
  const arr=sortedOptions(), s=$('#selHp');
  s.innerHTML = arr.map((x,i)=>`<option value="${i}">${x.brand} ${x.model} • ${x.kind} • A7 ${x.pA7} kW</option>`).join('');
  if(!state.selectedHp) state.selectedHp = arr[0] || null;

  $('#selBufor').innerHTML = Object.keys(BUFFERS).map(v=>`<option value="${v}">${v} l • ${INTint.format(BUFFERS[v])} PLN</option>`).join('');
  if(!state.selectedBuf) state.selectedBuf='100'; $('#selBufor').value=state.selectedBuf;

  const src = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  $('#selCwu').innerHTML = Object.keys(src).map(v=>`<option value="${v}">${v} l • ${INTint.format(src[v])} PLN</option>`).join('');
  if(!src[state.selectedTank]) state.selectedTank = Object.keys(src)[0];
  $('#selCwu').value=state.selectedTank;

  applyHpToUi();
}
function activeHp(){ return state.selectedHp; }
function pricePack(hpPrice, bufCost, tankCost, extras){ return (+hpPrice||0)+(+bufCost||0)+(+tankCost||0)+(+extras||0)+BASE_OFFSET; }
function applyHpToUi(){ renderPreview(); renderMustHave(); renderBasket(); saveState(); }
function renderPreview(){
  const b=activeHp(); if(!b){ $('#pricePreview').textContent='—'; return; }
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const bufCost=BUFFERS[state.selectedBuf]||0;
  const tankCost=(b.kind==='all-in-one')?0:(tankSrc[state.selectedTank]||0);
  const extras=(+state.v3d||0)+(+state.safety||0)+(+state.hydro||0)+(+state.glycol||0)+((+state.rads||0)*RAD_PRICE);
  const sum=pricePack(b.price,bufCost,tankCost,extras);
  $('#pricePreview').textContent = `${fmt(sum)} PLN netto (brutto: ${fmt(sum*(1+state.vat))} PLN)`;

  const hint=$('#typeHint');
  if(hint){
    hint.classList.remove('hide');
    if(b.kind==='monoblok') hint.textContent='Monoblok: przy ryzyku zamarzania dodaj glikol na odcinku zewnętrznym.';
    else if(b.kind==='all-in-one') hint.textContent='All-in-One: wbudowany zasobnik CWU – zewnętrzny zwykle niepotrzebny.';
    else hint.textContent='Split: glikol nie dotyczy (obieg chłodniczy).';
  }

  const stdW = +($('#selStd')?.value||50);
  const areaCover = Math.floor((b.pA7*1000)/(stdW*1.15));
  $('#areaByHp').textContent = areaCover>0 ? (areaCover+' m²') : '—';
}
function renderMustHave(){
  const b=activeHp(); const box=$('#mustHave');
  if(!b){ box.textContent='Wybierz pompę, bufor i zasobnik — pokażę skład.'; return; }
  const src = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const tankLabel = b.kind==='all-in-one' ? 'AIO (wbudowany)' : `${state.selectedTank} l (${state.selectedTankType==='dual'?'dwuwężownicowy':'pojedyncza wężownica'})`;
  const items=[
    `Pompa ciepła — ${b.brand} ${b.model} (${b.kind}, ${b.phase||'1F'})`,
    `Bufor — ${state.selectedBuf} l`,
    `Zasobnik CWU — ${tankLabel}`,
    'Armatura: zawór 3D, grupa bezpieczeństwa, zawory serwisowe',
    ...( (+state.glycol>0 && b.kind==='monoblok') ? ['Glikol do obiegu zewnętrznego (monoblok)'] : [] ),
    'Rozdzielacz(e) / hydraulika wg wyboru',
    ...( (+state.rads||0)>0 ? [`Montaż grzejników: ${state.rads} × ${INTint.format(RAD_PRICE)} PLN`] : [] ),
    'Montaż, uruchomienie, konfiguracja sterowania, szkolenie użytkownika'
  ];
  box.innerHTML = '<ul class="small list-offset">'+items.map(t=>`<li>${t}</li>`).join('')+'</ul>';
}

/* ===================== DOBÓR MOCY ===================== */
function showProposalsFromKw(kw){
  const box=$('#recQuick'); if(!box) return;
  const v=Number(kw)||0;
  if(v<=0){ box.classList.add('hide'); box.innerHTML=''; return; }
  const candidates=HEATPUMPS.slice()
    .sort((a,b)=>Math.abs(a.pA7-v)-Math.abs(b.pA7-v))
    .filter(h=>h.pA7>=v*0.9).slice(0,3);
  if(!candidates.length){ box.innerHTML='<span class="small">Brak oczywistych dopasowań.</span>'; box.classList.remove('hide'); return; }
  box.innerHTML = `Propozycje dla ~<b>${v.toFixed(2)} kW</b>:<br>`+
    candidates.map(h=>`<div class="row" style="margin-top:4px"><div class="flex1">${h.brand} <b>${h.model}</b> <span class="small">(A7 ${h.pA7} kW, ${h.kind}, ${h.phase||'1F'})</span></div><button class="btn tiny" data-pick="${h.brand}|${h.model}">Wybierz</button></div>`).join('');
  box.classList.remove('hide');
}
function quickSuggest(){
  const area=+($('#inpArea')?.value||0), wpm2=+($('#selWperm2')?.value||0);
  if(area>0 && wpm2>0){ const kw=(area*wpm2)/1000*1.10; $('#outHeatKw').value=kw.toFixed(2); showProposalsFromKw(kw); }
  else { $('#outHeatKw').value='0.00'; showProposalsFromKw(0); }
}
function recomputeAdvanced(){
  const area=+($('#areaAdv')?.value||0), wpm2=+($('#lossWm2')?.value||0);
  $('#lossWarn')?.classList.toggle('hide', !(wpm2>140));
  if(area<=0||wpm2<=0){ $('#heatLoad').textContent='—'; $('#heatTarget').textContent='—'; $('#recSummary')?.classList.add('hide'); $('#areaHint').textContent=''; return; }
  const req=(area*wpm2)/1000, target=req*1.15;
  $('#heatLoad').textContent=req.toFixed(2)+' kW'; $('#heatTarget').textContent=target.toFixed(2)+' kW';
  const candidates=HEATPUMPS.filter(h=>h.pA7>=target*0.9).slice().sort((a,b)=>Math.abs(a.pA7-target)-Math.abs(b.pA7-target)).slice(0,3);
  const box=$('#recSummary');
  box.innerHTML = `Szac. zapotrzebowanie: <b>${req.toFixed(2)} kW</b><br>Z zapasem 15%: <b>${target.toFixed(2)} kW</b><br>`+
    (candidates.length?('Propozycje: '+candidates.map(h=>`${h.brand} ${h.model} <span class="small">(A7 ${h.pA7} kW)</span>`).join(' • ')):'<span class="small" style="color:#ff9">Brak oczywistego dopasowania.</span>');
  box.classList.remove('hide');

  const use=$('#selCwuUse')?.value;
  $('#areaHint').textContent = use ? `Sugerowana pojemność CWU dla ${use} osób: ${use==='2-3'?'200–250 l':use==='4-5'?'250–300 l':'300 l +'}.` : '';
}

/* ===================== KOSZYK / SUMY ===================== */
function addToBasket(name, price, qty=1){
  const i=state.basket.findIndex(x=>x.name===name && Math.abs(x.price-price)<0.01);
  if(i>=0) state.basket[i].qty+=qty; else state.basket.push({name,price,qty});
  renderBasket(); saveState(); autoSaveToContract();
}
function renderBasket(){
  const tb=$('#basket tbody'); if(!tb) return; tb.innerHTML=''; let sumNet=0;
  state.basket.forEach((it,i)=>{
    sumNet+=it.price*it.qty;
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${it.name}</td>
      <td class="right-align"><input type="number" min="1" value="${it.qty}" data-qty="${i}" style="width:70px;background:#0d1530;border:1px solid #28356c;border-radius:10px;padding:6px 8px;color:#e8edff"></td>
      <td class="right-align">${fmt(it.price)} PLN</td>
      <td class="right-align"><button class="btn bad tiny" data-del="${i}">Usuń</button></td>`;
    tb.appendChild(tr);
  });
  const prov = sumNet*(+state.provPct||0)/100 + (+state.provAbs||0);
  $('#sumNet').textContent = fmt(sumNet)+' PLN';
  $('#sumProv').textContent = fmt(prov)+' PLN';
  $('#sumGross').textContent = fmt((sumNet+prov)*(1+state.vat))+' PLN';
}

/* ===================== KLIENCI / UMOWA ===================== */
function readClients(){ try{ return JSON.parse(localStorage.getItem(DB_CLIENTS_KEY)||'[]'); }catch{return[]} }
function writeClients(list){ try{ localStorage.setItem(DB_CLIENTS_KEY, JSON.stringify(list)); }catch{} }
function populateClientSelect(){
  const sel=$('#selClient'); if(!sel) return;
  const clients=readClients(); sel.innerHTML='<option value="">— wybierz z bazy —</option>';
  clients.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=(c.name||'')+' • '+(c.email||'brak e-mail'); sel.appendChild(o); });
}
function collectClientFromForm(){ return { id:'c_'+Date.now(), name:$('#clName')?.value.trim()||'', email:$('#clEmail')?.value.trim()||'', phone:$('#clPhone')?.value.trim()||'', nip:$('#clNip')?.value.trim()||'', addr:$('#clAddr')?.value.trim()||'' }; }
function loadClientToForm(c){ if(!c) return; if($('#clName'))$('#clName').value=c.name||''; if($('#clEmail'))$('#clEmail').value=c.email||''; if($('#clPhone'))$('#clPhone').value=c.phone||''; if($('#clNip'))$('#clNip').value=c.nip||''; if($('#clAddr'))$('#clAddr').value=c.addr||''; }
function saveClient(){ const c=collectClientFromForm(); if(!c.name){alert('Wpisz nazwę/imię klienta.');return;} const list=readClients(); list.push(c); writeClients(list); populateClientSelect(); alert('Zapisano klienta.'); }

function buildOfferSummary(){
  const sum = state.basket.reduce((a,b)=>a+b.price*b.qty,0);
  const prov = sum*(+state.provPct||0)/100 + (+state.provAbs||0);
  const gross = (sum+prov)*(1+state.vat);
  const lines = state.basket.map(it=>'• '+it.name+' × '+it.qty+' | '+fmt(it.price)+' PLN');
  return {sum, prov, gross, lines};
}
function pushContractDraft(client){
  const b=activeHp();
  const payload = {
    createdAt: new Date().toISOString(),
    client,
    selection:{
      pump: b? {brand:b.brand, model:b.model, kind:b.kind, phase:b.phase, pA7:b.pA7, ref:b.ref}:null,
      buffer: state.selectedBuf,
      tank: {type: state.selectedTankType, vol: state.selectedTank},
      extras:{ v3d: state.v3d, safety: state.safety, hydro: state.hydro, glycol: state.glycol, rads: state.rads },
      vat: state.vat
    },
    sizing:{
      quickKw: $('#outHeatKw')?.value||'',
      std: $('#selStd')?.value||'',
      areaAdv: $('#areaAdv')?.value||'',
      lossWm2: $('#lossWm2')?.value||'',
      heatLoad: $('#heatLoad')?.textContent||'',
      heatTarget: $('#heatTarget')?.textContent||'',
      areaByHp: $('#areaByHp')?.textContent||''
    },
    basket: state.basket,
    totals: buildOfferSummary()
  };
  try{
    sessionStorage.setItem(CONTRACT_DRAFT_KEY, JSON.stringify(payload));
    const hist=JSON.parse(localStorage.getItem(CONTRACTS_HISTORY_KEY)||'[]'); hist.push(payload);
    localStorage.setItem(CONTRACTS_HISTORY_KEY, JSON.stringify(hist));
  }catch{}
  return payload;
}
function goToContract(){
  const selId=$('#selClient')?.value; let client=null;
  if(selId){ client=readClients().find(x=>x.id===selId)||null; }
  if(!client){ const draft=collectClientFromForm(); if(draft.name||draft.email||draft.phone) client=draft; }
  pushContractDraft(client);
  location.href='index.html#umowa';
}
function autoSaveToContract(){
  const selId=$('#selClient')?.value; let client=null;
  if(selId){ client=readClients().find(x=>x.id===selId)||null; }
  if(!client){ const draft=collectClientFromForm(); if(draft.name||draft.email||draft.phone) client=draft; }
  pushContractDraft(client);
}
function mailToClient(){
  const selId=$('#selClient')?.value; let client=null;
  if(selId){ client=readClients().find(x=>x.id===selId); } else { const draft=collectClientFromForm(); if(draft.email) client=draft; }
  const {sum, prov, gross, lines}=buildOfferSummary();
  const subject='Oferta – pompa ciepła / zestaw';
  const body=[
    'Dzień dobry,','', 'Poniżej podsumowanie oferty:', ...lines,'',
    'Suma netto: '+fmt(sum)+' PLN','Prowizja: '+fmt(prov)+' PLN','Razem brutto (VAT '+Math.round(state.vat*100)+'%): '+fmt(gross)+' PLN','',
    'Szczegóły doboru mocy:',
    '• Szybka propozycja: '+($('#outHeatKw')?.value||'—')+' kW',
    '• Obciążenie projektowe: '+($('#heatLoad')?.textContent||'—')+' (zapas: '+($('#heatTarget')?.textContent||'—')+')',
    '• Powierzchnia pokrywana wybraną pompą: '+($('#areaByHp')?.textContent||'—'), '', 'Pozdrawiam'
  ];
  location.href='mailto:'+(client&&client.email?encodeURIComponent(client.email):'')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.join('\n'));
}

/* ===================== ZDARZENIA UI ===================== */
// filtry
['q','fBrand','fType','fRef','fPhase','sort'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  const upd = ()=>{ state.filters={...state.filters,q:$('#q')?.value||'',brand:$('#fBrand')?.value||'',kind:$('#fType')?.value||'',ref:$('#fRef')?.value||'',phase:$('#fPhase')?.value||'',sort:$('#sort')?.value||'brand.asc'}; renderTable(); saveState(); };
  el.addEventListener('input', upd); el.addEventListener('change', upd);
});
$('#tagsAll')?.addEventListener('change', e=>{ state.tagsAll=!!e.target.checked; renderTable(); saveState(); });
$('#btnClear')?.addEventListener('click', ()=>{
  ['q','fBrand','fType','fRef','fPhase'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  state.chipsActive.clear(); makeChips(); state.filters={q:'',brand:'',kind:'',ref:'',phase:'',sort:'brand.asc'};
  $('#sort').value='brand.asc'; renderTable(); saveState();
});

// wybory / koszyk
document.addEventListener('click', e=>{
  const pick=e.target.getAttribute && e.target.getAttribute('data-pick');
  if(pick){ const [brand,model]=pick.split('|'); const arr=sortedHp(); const idx=arr.findIndex(x=>x.brand===brand && x.model===model); if(idx>=0){ $('#selHp').value=String(idx); state.selectedHp=arr[idx]; applyHpToUi(); window.scrollTo({top:0,behavior:'smooth'}); saveState(); } }
  const del =e.target.getAttribute && e.target.getAttribute('data-del');
  if(del!=null){ state.basket.splice(Number(del),1); renderBasket(); saveState(); autoSaveToContract(); }
});
$('#selHp')?.addEventListener('change', ()=>{ const arr=sortedHp(); state.selectedHp=arr[Number($('#selHp').value)||0]; applyHpToUi(); saveState(); });
$('#selBufor')?.addEventListener('change', e=>{ state.selectedBuf=e.target.value; renderPreview(); renderMustHave(); renderBasket(); saveState(); autoSaveToContract(); });
$('#selCwuType')?.addEventListener('change', e=>{ state.selectedTankType=e.target.value; fillSelects(); renderPreview(); renderMustHave(); saveState(); autoSaveToContract(); });
$('#selCwu')?.addEventListener('change', e=>{ state.selectedTank=e.target.value; renderPreview(); renderMustHave(); saveState(); autoSaveToContract(); });
$('#selVat')?.addEventListener('change', e=>{ state.vat=Number(e.target.value)||0.08; renderPreview(); renderBasket(); saveState(); autoSaveToContract(); });
['selV3d','selSafety','selHydro','selGlycol'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener('change', e=>{ state[e.target.id.replace('sel','').toLowerCase()] = Number(e.target.value)||0; renderPreview(); renderMustHave(); saveState(); autoSaveToContract(); });
});
$('#inpRads')?.addEventListener('input', e=>{ state.rads=Math.max(0,Number(e.target.value)||0); renderPreview(); renderMustHave(); saveState(); autoSaveToContract(); });
['provPct','provAbs'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.addEventListener('input', ()=>{ state.provPct=Number($('#provPct')?.value)||0; state.provAbs=Number($('#provAbs')?.value)||0; renderBasket(); saveState(); autoSaveToContract(); }); });

$('#btnAddPack')?.addEventListener('click', ()=>{
  const b=activeHp(); if(!b){ alert('Wybierz pompę.'); return; }
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const extras=(+state.v3d||0)+(+state.safety||0)+(+state.hydro||0)+(+state.glycol||0)+((+state.rads||0)*RAD_PRICE);
  const price=pricePack(b.price, BUFFERS[state.selectedBuf]||0, (b.kind==='all-in-one')?0:(tankSrc[state.selectedTank]||0), extras);
  const labels=[]; if(+state.v3d>0)labels.push('zawór 3D'); if(+state.safety>0)labels.push('gr. bezp.'); if(+state.hydro>0)labels.push('hydraulika+'); if(+state.glycol>0 && b.kind==='monoblok')labels.push('glikol');
  const rlabel=state.rads?` + grzejniki x${state.rads}`:''; const elabel=labels.length?` + ${labels.join(', ')}`:'';
  addToBasket(`Zestaw: ${b.brand} ${b.model} + bufor ${state.selectedBuf} l + ${(b.kind==='all-in-one'?'AIO CWU':('CWU '+state.selectedTank+' l ('+(state.selectedTankType==='dual'?'dual':'single')+')'))}${rlabel}${elabel}`, price, 1);
});
$('#btnAddHp')?.addEventListener('click', ()=>{ const b=activeHp(); if(!b){alert('Wybierz pompę.');return;} addToBasket(`Pompa ciepła: ${b.brand} ${b.model} — tylko urządzenie`, soloPrice(b), 1); });

document.addEventListener('input', e=>{
  if(e.target && e.target.matches && e.target.matches('[data-qty]')){
    const i=Number(e.target.getAttribute('data-qty')); state.basket[i].qty=Math.max(1,Number(e.target.value)||1);
    renderBasket(); saveState(); autoSaveToContract();
  }
});

// eksporty
$('#btnCopy')?.addEventListener('click', ()=>{ const {sum,prov,gross,lines}=buildOfferSummary(); const txt=['Oferta — Pompy ciepła','',...lines,'',`Suma netto: ${fmt(sum)} PLN`,`Prowizja: ${fmt(prov)} PLN`,`Razem brutto: ${fmt(gross)} PLN`].join('\n'); navigator.clipboard.writeText(txt).then(()=>alert('Skopiowano.')).catch(()=>{}); });
$('#btnPrint')?.addEventListener('click', ()=>window.print());
$('#btnXlsx')?.addEventListener('click', ()=>{ if(typeof XLSX==='undefined'){alert('Brak XLSX');return;} const rows=state.basket.map(it=>({Pozycja:it.name,Ilość:it.qty,Cena_PLN:it.price})); const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Koszyk'); XLSX.writeFile(wb,'Koszyk_PompyCiepla.xlsx'); });
$('#btnExportJson')?.addEventListener('click', ()=>{ const blob=new Blob([JSON.stringify(state.basket,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='koszyk.json'; a.click(); URL.revokeObjectURL(url); });
$('#btnImportJson')?.addEventListener('click', ()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json'; inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const arr=JSON.parse(r.result); if(Array.isArray(arr)){ state.basket=arr; renderBasket(); saveState(); autoSaveToContract(); } }catch{ alert('Zły JSON'); } }; r.readAsText(f); }; inp.click(); });

// klienci / umowa
$('#btnSaveClient')?.addEventListener('click', saveClient);
$('#btnLoadClient')?.addEventListener('click', ()=>{ const id=$('#selClient')?.value; if(!id) return; const c=readClients().find(x=>x.id===id); if(c) loadClientToForm(c); });
$('#btnToContract')?.addEventListener('click', goToContract);
$('#btnToContractTop')?.addEventListener('click', goToContract);
$('#btnMailTo')?.addEventListener('click', mailToClient);

// dobór mocy
$('#inpArea')?.addEventListener('input', quickSuggest);
$('#selWperm2')?.addEventListener('change', quickSuggest);
['selStd','areaAdv','lossWm2','selCwuUse'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener('input', ()=>{ recomputeAdvanced(); renderPreview(); });
  el.addEventListener('change', ()=>{ recomputeAdvanced(); renderPreview(); });
});

/* ===================== INIT ===================== */
(async function init(){
  loadState();
  await loadData();
  BASE_OFFSET = computeBaseOffset();
  fillFilters();
  makeChips();
  renderTable();
  fillSelects();
  renderBasket();
  quickSuggest();
  recomputeAdvanced();
  populateClientSelect();

  // odtwórz wybraną pompę
  if(state.selectedHp){
    const arr=sortedHp(); const idx=arr.findIndex(x=>x.brand===state.selectedHp.brand && x.model===state.selectedHp.model);
    if(idx>=0) $('#selHp').value=String(idx);
  }
})();
})();
