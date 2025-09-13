/* pompy.js — ARKON • Pompy ciepła: katalog + konfigurator + koszyk + auto-umowa
   Wersja: v3
   UWAGI:
   - Szkic umowy zapisujemy do localStorage ('contract_draft_v3') po KAŻDEJ istotnej zmianie.
   - Plik umowy (np. umowa2.html) powinien odczytać i wypełnić danymi z tego szkicu.
   - Ceny i offset można dopasować w CONFIG na początku.
*/
'use strict';

/* =============================== CONFIG ================================== */
const CONFIG = {
  // bazowy cel netto za najtańszy pakiet (pompa + minimalny bufor + CWU single min)
  PACK_BASE_TARGETNET: 36000,   // możesz zmienić na 34–38 tys. aby sterować cenami pakietów
  ONLY_HP_SURCHARGE:    3000,   // dopłata przy sprzedaży samej pompy (logist./uruchomienie)
  RAD_PRICE:            750,    // grzejnik (robocizna/szt.)
  VAT_DEFAULT:          0.08,   // 8% mieszkaniowe
  STORAGE_KEYS: {
    STATE:     'kp_state_v3',
    CLIENT_DB: 'kp_clients_db_v2',
    CONTRACT:  'contract_draft_v3'
  },
  // „szybkie tagi” do filtrowania jednym kliknięciem
  QUICK_TAGS: ['R290','R32','monoblok','split','all-in-one','1F','3F','WiFi','premium','T-CAP','High Perf.','PRIMA','Quiet','AIO','K-gen']
};

/* =============================== DANE ==================================== */
// Bufory i CWU (netto)
const BUFFERS = { '50':1200, '80':1450, '100':1650, '150':2200, '200':2600, '300':3600 };
const TANKS_SINGLE = { '150':2450, '200':2900, '250':3400, '300':3800 };
const TANKS_DUAL   = { '200':3450, '250':3990, '300':4450 };

// Katalog pomp (przykładowe, sensownie długie; możesz dopisywać kolejne)
const HEATPUMPS = [
  // ===== MIDEA =====
  {brand:'Midea', model:'M-Thermal Arctic 4.5 kW Monoblok MHC-V4WD2N7-E30',  kind:'monoblok', phase:'1F', pA7:4.5, scop:5.0, ref:'R290', noise:55, price:10686, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal PRO 6 kW Monoblok',                        kind:'monoblok', phase:'1F', pA7:6.0, scop:4.9, ref:'R32',  noise:55, price:12276, tags:['PRO','R32']},
  {brand:'Midea', model:'M-Thermal Arctic 6.3 kW Monoblok MHC-V6W/D2N8-E30',  kind:'monoblok', phase:'1F', pA7:6.3, scop:5.0, ref:'R290', noise:55, price:11890, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal Arctic 8.4 kW Monoblok MHC-V8W/D2N8-BE30', kind:'monoblok', phase:'1F', pA7:8.4, scop:4.9, ref:'R290', noise:55, price: 9350, tags:['Arctic','R290','WiFi']},
  {brand:'Midea', model:'M-Thermal PRO 8 kW Split',                           kind:'split',    phase:'1F', pA7:8.0, scop:4.9, ref:'R32',  noise:54, price:14500, tags:['PRO','split']},
  {brand:'Midea', model:'M-Thermal PRO 8 kW Monoblok',                        kind:'monoblok', phase:'1F', pA7:8.0, scop:4.9, ref:'R32',  noise:55, price: 9349, tags:['PRO','monoblok']},
  {brand:'Midea', model:'M-Thermal 9 kW Monoblok (R32)',                      kind:'monoblok', phase:'1F', pA7:9.0, scop:4.8, ref:'R32',  noise:55, price:15000, tags:['R32']},
  {brand:'Midea', model:'M-Thermal 10 kW Monoblok MHC-V10W/D2N8-B',           kind:'monoblok', phase:'1F', pA7:10.0,scop:4.8, ref:'R32',  noise:56, price:16080, tags:['WiFi']},
  {brand:'Midea', model:'M-Thermal Arctic 10 kW Monoblok V10WD2RN7-E30',      kind:'monoblok', phase:'1F', pA7:10.0,scop:4.9, ref:'R290', noise:56, price:13990, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal 12 kW Monoblok (R32)',                     kind:'monoblok', phase:'1F', pA7:12.0,scop:4.8, ref:'R32',  noise:56, price:13170, tags:['R32']},
  {brand:'Midea', model:'M-Thermal 12 kW Monoblok 3F',                        kind:'monoblok', phase:'3F', pA7:12.0,scop:4.7, ref:'R32',  noise:56, price:14873, tags:['3F']},
  {brand:'Midea', model:'M-Thermal Arctic 12 kW Monoblok V12WD2RN7-E30',      kind:'monoblok', phase:'1F', pA7:12.0,scop:4.8, ref:'R290', noise:56, price:15438, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal Arctic 14 kW Monoblok V14WD2RN7-E30',      kind:'monoblok', phase:'3F', pA7:14.0,scop:4.7, ref:'R290', noise:56, price:16260, tags:['Arctic','R290','3F']},
  {brand:'Midea', model:'M-Thermal PRO 10 kW Split',                          kind:'split',    phase:'1F', pA7:10.0,scop:4.9, ref:'R32',  noise:54, price:16980, tags:['PRO','split']},
  {brand:'Midea', model:'M-Thermal PRO 12 kW Split 3F',                       kind:'split',    phase:'3F', pA7:12.0,scop:4.8, ref:'R32',  noise:55, price:18950, tags:['PRO','split','3F']},
  {brand:'Midea', model:'M-Thermal PRO 14 kW Split 3F',                       kind:'split',    phase:'3F', pA7:14.0,scop:4.7, ref:'R32',  noise:56, price:21990, tags:['PRO','split','3F']},
  {brand:'Midea', model:'M-Thermal 16 kW Monoblok (R32) 16W/D2N8-BE30',       kind:'monoblok', phase:'3F', pA7:16.0,scop:4.6, ref:'R32',  noise:57, price:20516, tags:['3F']},
  {brand:'Midea', model:'M-Thermal PRO 16 kW Monoblok 3F',                    kind:'monoblok', phase:'3F', pA7:16.0,scop:4.6, ref:'R32',  noise:57, price:23490, tags:['PRO','3F']},
  {brand:'Midea', model:'M-Thermal 26 kW Monoblok MHC-V26W/D2RN8-B',          kind:'monoblok', phase:'3F', pA7:26.0,scop:4.3, ref:'R32',  noise:60, price:20320, tags:['wysoka moc','3F']},
  {brand:'Midea', model:'M-Thermal All-in-One 8 kW (R32)',                    kind:'all-in-one', phase:'1F', pA7:8.0, scop:4.8, ref:'R32',noise:53, price:18490, tags:['AIO']},
  {brand:'Midea', model:'M-Thermal All-in-One 12 kW 3F (R32)',                kind:'all-in-one', phase:'3F', pA7:12.0,scop:4.7, ref:'R32',noise:54, price:22990, tags:['AIO','3F']},
  {brand:'Midea', model:'M-Thermal PRO 14 kW Monoblok (premium)',             kind:'monoblok', phase:'3F', pA7:14.0,scop:4.8, ref:'R32',  noise:56, price:36350, tags:['premium']},

  // ===== PANASONIC =====
  {brand:'Panasonic', model:'Aquarea Monoblok 5 kW WH-MDC05J3E5',             kind:'monoblok', phase:'1F', pA7:5.0,  scop:5.0, ref:'R32', noise:53, price:20745, tags:['J-gen']},
  {brand:'Panasonic', model:'Aquarea Monoblok 7 kW WH-MDC07J3E5',             kind:'monoblok', phase:'1F', pA7:7.0,  scop:4.9, ref:'R32', noise:54, price:11370, tags:['J-gen']},
  {brand:'Panasonic', model:'Aquarea Monoblok 9 kW WH-MXC09J3E5 (T-CAP)',     kind:'monoblok', phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:55, price:15300, tags:['T-CAP']},
  {brand:'Panasonic', model:'Aquarea Monoblok 9 kW WH-MDC09H3E5',             kind:'monoblok', phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:55, price:14459, tags:['High Perf.']},
  {brand:'Panasonic', model:'Aquarea Monoblok 12 kW WH-MDC12H6E5',            kind:'monoblok', phase:'1F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:13090, tags:['High Perf.']},
  {brand:'Panasonic', model:'Aquarea Split 7 kW KIT-ADC07K3E5 (All-in-One)',  kind:'all-in-one', phase:'1F', pA7:7.0,scop:4.9, ref:'R32', noise:53, price:19041, tags:['AIO']},
  {brand:'Panasonic', model:'Aquarea Split 9 kW KIT-WC09K3E5',                kind:'split',    phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:54, price:14930, tags:['split']},
  {brand:'Panasonic', model:'Aquarea All-in-One 9 kW 3F',                     kind:'all-in-one', phase:'3F',pA7:9.0, scop:4.8, ref:'R32', noise:54, price:22764, tags:['AIO','3F']},
  {brand:'Panasonic', model:'Aquarea Split 12 kW 1F',                         kind:'split',    phase:'1F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:18600, tags:['split']},
  {brand:'Panasonic', model:'Aquarea T-CAP 16 kW 3F Quiet',                   kind:'split',    phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:56, price:28455, tags:['T-CAP','3F','Quiet']},
  {brand:'Panasonic', model:'Aquarea High Perf. 5 kW KIT-WC05J3E5',           kind:'split',    phase:'1F', pA7:5.0,  scop:5.0, ref:'R32', noise:52, price:13250, tags:['High Perf.','split']},
  {brand:'Panasonic', model:'Aquarea High Perf. 12 kW KIT-WC12J3E5',          kind:'split',    phase:'1F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:19890, tags:['High Perf.','split']},
  {brand:'Panasonic', model:'Aquarea T-CAP 9 kW Split Quiet',                 kind:'split',    phase:'1F', pA7:9.0,  scop:4.8, ref:'R32', noise:54, price:21490, tags:['T-CAP','Quiet']},
  {brand:'Panasonic', model:'Aquarea T-CAP 12 kW Split 3F',                   kind:'split',    phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:55, price:25490, tags:['T-CAP','3F']},
  {brand:'Panasonic', model:'Aquarea K-Gen 7 kW All-in-One 1F',               kind:'all-in-one', phase:'1F',pA7:7.0,scop:4.9, ref:'R32', noise:52, price:20990, tags:['K-gen','AIO']},
  {brand:'Panasonic', model:'Aquarea K-Gen 12 kW All-in-One 3F',              kind:'all-in-one', phase:'3F',pA7:12.0,scop:4.8,ref:'R32', noise:53, price:28990, tags:['K-gen','AIO','3F']},
  {brand:'Panasonic', model:'Aquarea Monoblok 16 kW WH-MXC16J9E8 3F',         kind:'monoblok', phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:58, price:27990, tags:['monoblok','3F']},

  // ===== GALMET (orientacyjnie) =====
  {brand:'Galmet', model:'PRIMA 6GT Monoblok',     kind:'monoblok', phase:'1F', pA7:6.0,  scop:4.8, ref:'R32', noise:55, price:22000, tags:['PRIMA','GT']},
  {brand:'Galmet', model:'PRIMA 8GT Monoblok',     kind:'monoblok', phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:55, price:24000, tags:['PRIMA','GT']},
  {brand:'Galmet', model:'PRIMA 10GT Monoblok',    kind:'monoblok', phase:'1F', pA7:10.0, scop:4.7, ref:'R32', noise:56, price:26000, tags:['PRIMA','GT']},
  {brand:'Galmet', model:'PRIMA 12GT Monoblok 3F', kind:'monoblok', phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:32000, tags:['PRIMA','GT','3F']},
  {brand:'Galmet', model:'PRIMA 16GT Monoblok 3F', kind:'monoblok', phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:57, price:36000, tags:['PRIMA','GT','3F']},
  {brand:'Galmet', model:'PRIMA S 6GT Split',      kind:'split',    phase:'1F', pA7:6.0,  scop:4.8, ref:'R32', noise:54, price:22000, tags:['PRIMA','GT','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 8GT Split',      kind:'split',    phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:54, price:24000, tags:['PRIMA','GT','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 10GT Split',     kind:'split',    phase:'1F', pA7:10.0, scop:4.7, ref:'R32', noise:55, price:26000, tags:['PRIMA','GT','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 12GT Split 3F',  kind:'split',    phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:55, price:32000, tags:['PRIMA','GT','SPLIT','3F']},
  {brand:'Galmet', model:'PRIMA S 16GT Split 3F',  kind:'split',    phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:56, price:36000, tags:['PRIMA','GT','SPLIT','3F']},
];

/* =============================== STAN ==================================== */
const state = {
  vat: CONFIG.VAT_DEFAULT,
  rads: 0, v3d: 0, safety: 0, hydro: 0, glycol: 0,
  selectedHp: null, selectedBuf: '100', selectedTankType: 'single', selectedTank: '200',
  provPct: 0, provAbs: 0,
  chipsActive: new Set(),
  tagsAll: false,
  basket: [],

  client: { id:'', name:'', email:'', phone:'', nip:'', addr:'' }
};

/* ============================ HELPERY/UI ================================= */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const INTmoney = new Intl.NumberFormat('pl-PL',{minimumFractionDigits:2, maximumFractionDigits:2});
const INTint   = new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0});
const fmt = n => INTmoney.format(+n || 0);

function cheapest(obj){ return Math.min(...Object.values(obj).map(Number)); }
function cheapestPumpPrice() { return Math.min(...HEATPUMPS.map(h => +h.price || 0)); }
function computeBaseOffset(){
  return CONFIG.PACK_BASE_TARGETNET - (cheapestPumpPrice() + cheapest(BUFFERS) + cheapest(TANKS_SINGLE));
}
let BASE_OFFSET = computeBaseOffset();

function sortedHp(){
  return HEATPUMPS.slice().sort((a,b)=> a.brand.localeCompare(b.brand,'pl') || a.pA7 - b.pA7);
}

function saveLocal(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
function loadLocal(k, d){ try{ return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }catch{ return d } }

/* ============================ PERSIST / DRAFT ============================ */
function serializeDraft(){
  const b = state.selectedHp;
  const bufKey  = state.selectedBuf;
  const tankKey = state.selectedTank;
  const tankSrc = state.selectedTankType === 'dual' ? TANKS_DUAL : TANKS_SINGLE;

  const bufCost  = BUFFERS[bufKey] || 0;
  const tankCost = (b && b.kind==='all-in-one') ? 0 : (tankSrc[tankKey]||0);

  const extras = (+state.v3d||0) + (+state.safety||0) + (+state.hydro||0) +
                 (+state.glycol||0) + ((+state.rads||0) * CONFIG.RAD_PRICE);

  const sumNet = state.basket.reduce((a,it)=>a + it.price*it.qty, 0);
  const prov   = sumNet*(+state.provPct||0)/100 + (+state.provAbs||0);
  const gross  = (sumNet+prov) * (1 + state.vat);

  const draft = {
    createdAt: new Date().toISOString(),
    client: {...state.client},
    selection: {
      pump: b ? { brand:b.brand, model:b.model, kind:b.kind, phase:b.phase, pA7:b.pA7, ref:b.ref, price:b.price } : null,
      buffer: bufKey,
      tank: {type: state.selectedTankType, vol: state.selectedTank, cost: tankCost},
      extras: { v3d: state.v3d, safety: state.safety, hydro: state.hydro, glycol: state.glycol, rads: state.rads },
      vat: state.vat,
      priceParams: { BASE_OFFSET, PACK_BASE_TARGETNET: CONFIG.PACK_BASE_TARGETNET }
    },
    sizing: {
      quickKw: $('#outHeatKw')?.value || '',
      std: $('#selStd')?.value || '',
      areaAdv: $('#areaAdv')?.value || '',
      lossWm2: $('#lossWm2')?.value || '',
      heatLoad: $('#heatLoad')?.textContent || '',
      heatTarget: $('#heatTarget')?.textContent || '',
      areaByHp: $('#areaByHp')?.textContent || ''
    },
    basket: state.basket.slice(),
    totals: { sumNet, prov, gross }
  };
  return draft;
}
function pushDraftToStorage(){
  const draft = serializeDraft();
  saveLocal(CONFIG.STORAGE_KEYS.CONTRACT, draft);
}

/* =============================== FILTRY ================================== */
function fillFilters(){
  const brands = [...new Set(HEATPUMPS.map(x=>x.brand))].sort((a,b)=>a.localeCompare(b,'pl',{sensitivity:'base'}));
  $('#fBrand').innerHTML = '<option value="">Marka (wszystkie)</option>' + brands.map(b=><option>${b}</option>).join('');
  $('#tagsAll').checked = !!state.tagsAll;

  // chips
  const box = $('#chips'); box.innerHTML='';
  CONFIG.QUICK_TAGS.forEach(t=>{
    const el = document.createElement('div');
    el.className='chip'; el.textContent=t; el.dataset.tag=t;
    if(state.chipsActive.has(t)) el.classList.add('active');
    el.addEventListener('click', ()=>{
      if(state.chipsActive.has(t)) state.chipsActive.delete(t);
      else state.chipsActive.add(t);
      el.classList.toggle('active');
      renderTable(); persistState();
    });
    box.appendChild(el);
  });
}

function parsePowerQuery(q){
  if(!q) return null;
  q = String(q).toLowerCase().replace('kw','').trim();

  // Operatory: >=, <=, >, <
  const cmp = q.match(/^([<>]=?)\s*([0-9]+(?:\.[0-9]+)?)/);
  if(cmp){
    const op = cmp[1], v = parseFloat(cmp[2]);
    if(op === '>=') return p => p >= v;
    if(op === '<=') return p => p <= v;
    if(op === '>')  return p => p >  v;
    if(op === '<')  return p => p <  v;
  }
  // Zakres: 8-12
  const range = q.match(/^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)/);
  if(range){
    const a = parseFloat(range[1]), b = parseFloat(range[2]);
    const lo = Math.min(a,b), hi = Math.max(a,b);
    return p => p >= lo && p <= hi;
  }
  // Liczba ± tolerancja
  const eq = q.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if(eq){
    const v = parseFloat(eq[1]), tol = 0.6;
    return p => Math.abs(p - v) <= tol;
  }
  return null;
}

function applyFiltersSort(rows){
  const q = ($('#q')?.value||'').trim().toLowerCase();
  const brand = $('#fBrand')?.value || '';
  const kind  = $('#fType')?.value || '';
  const ref   = $('#fRef')?.value  || '';
  const ph    = $('#fPhase')?.value|| '';
  const powerPredicate = parsePowerQuery(q.includes('kw')?q:q.replace(/\s*k\s*w/,'kw'));

  rows = rows.filter(p=>{
    if(brand && p.brand !== brand) return false;
    if(kind  && p.kind  !== kind ) return false;
    if(ref   && p.ref   !== ref  ) return false;
    if(ph    && p.phase !== ph   ) return false;

    if(state.chipsActive.size){
      const tags = new Set([p.kind, p.phase, p.ref, ...(p.tags||[])].filter(Boolean));
      const hits = [...state.chipsActive].map(t => tags.has(t));
      if(state.tagsAll ? hits.some(x=>!x) : !hits.some(Boolean)) return false;
    }

    if(q){
      const textHit = [p.brand,p.model,p.ref,p.kind,p.phase,(p.tags||[]).join(' ')].some(v => (v||'').toLowerCase().includes(q));
      if(powerPredicate){
        const powerHit = powerPredicate(p.pA7);
        return textHit || powerHit;
      }
      return textHit;
    }
    return true;
  });

  switch($('#sort')?.value){
    case 'brand.asc':  rows.sort((a,b)=> a.brand.localeCompare(b.brand,'pl') || a.pA7-b.pA7); break;
    case 'brand.desc': rows.sort((a,b)=> b.brand.localeCompare(a.brand,'pl') || a.pA7-b.pA7); break;
    case 'p.asc':      rows.sort((a,b)=> a.pA7-b.pA7); break;
    case 'p.desc':     rows.sort((a,b)=> b.pA7-a.pA7); break;
    case 'price.asc':  rows.sort((a,b)=> a.price-b.price); break;
    case 'price.desc': rows.sort((a,b)=> b.price-a.price); break;
  }
  return rows;
}

/* ============================= RENDER TABELI ============================= */
function renderTable(){
  const rows = applyFiltersSort(HEATPUMPS.slice());
  $('#cntAll').textContent = HEATPUMPS.length;
  $('#cntVis').textContent = rows.length;

  const tb = $('#tbody'); tb.innerHTML='';
  rows.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><button class="btn tiny" data-pick="${p.brand}|${p.model}">Wybierz</button></td>
      <td><b>${p.brand}</b><div class="small">${p.model}</div></td>
      <td>${p.kind}</td>
      <td class="num">${p.pA7}</td>
      <td class="num">${p.scop||''}</td>
      <td>${p.ref||''}</td>
      <td>${p.phase||''}</td>
      <td class="num">${p.noise||''}</td>
      <td>${(p.tags||[]).map(t=><span class="pill">${t}</span>).join(' ')}</td>
    `;
    tb.appendChild(tr);
  });
}

/* ======================= KONFIGURATOR — SELECTY/UI ====================== */
function optionsForTanks(){ return state.selectedTankType==='dual' ? Object.keys(TANKS_DUAL) : Object.keys(TANKS_SINGLE); }

function fillSelects(){
  const arr = sortedHp();
  const s = $('#selHp');
  s.innerHTML = arr.map((x,i)=><option value="${i}">${x.brand} ${x.model} • ${x.kind} • A7 ${x.pA7} kW</option>).join('');
  state.selectedHp = state.selectedHp || arr[0] || null;

  const b  = $('#selBufor');
  b.innerHTML = Object.keys(BUFFERS).map(v=><option value="${v}">${v} l • ${INTint.format(BUFFERS[v])} PLN</option>).join('');
  if(!state.selectedBuf) state.selectedBuf='100';
  b.value = state.selectedBuf;

  const t = $('#selCwu');
  const src = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  t.innerHTML = Object.keys(src).map(v=><option value="${v}">${v} l • ${INTint.format(src[v])} PLN</option>).join('');
  if(!src[state.selectedTank]) state.selectedTank = Object.keys(src)[0];
  t.value = state.selectedTank;

  applyHpToUi();
}

function activeHp(){ return state.selectedHp; }

function pricePack(hpPrice, bufCost, tankCost, extras){
  return (+hpPrice||0) + (+bufCost||0) + (+tankCost||0) + (+extras||0) + BASE_OFFSET;
}
function soloPrice(hp){ return (+hp.price||0) + CONFIG.ONLY_HP_SURCHARGE; }

function renderPreview(){
  const b = activeHp(); if(!b){ $('#pricePreview').textContent='—'; return; }

  const bufKey  = state.selectedBuf;
  const tankKey = state.selectedTank;
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;

  const bufCost  = BUFFERS[bufKey]||0;
  const tankCost = (b.kind==='all-in-one') ? 0 : (tankSrc[tankKey]||0);
  const extras   = (+state.v3d||0) + (+state.safety||0) + (+state.hydro||0) + (+state.glycol||0) + ((+state.rads||0)*CONFIG.RAD_PRICE);

  const sum = pricePack(b.price, bufCost, tankCost, extras);
  $('#pricePreview').textContent = ${fmt(sum)} PLN netto (brutto: ${fmt(sum*(1+state.vat))} PLN);

  const hint = $('#typeHint'); hint.style.display='block';
  if(b.kind==='monoblok') hint.textContent='Monoblok: jeśli ryzyko zamarzania — rozważ glikol w obiegu zewnętrznym.';
  else if(b.kind==='all-in-one') hint.textContent='All-in-One: wbudowany zasobnik CWU — zwykle nie dodajemy zewnętrznego.';
  else hint.textContent='Split: glikol nie dotyczy (obieg chłodniczy).';

  // Powierzchnia pokrywana wybraną pompą dla podanego standardu
  const stdW   = +($('#selStd')?.value||50);
  const margin = 1.15;
  const areaCover = Math.floor((b.pA7*1000)/(stdW*margin));
  $('#areaByHp').textContent = areaCover>0 ? (areaCover + ' m²') : '—';

  // auto-draft
  pushDraftToStorage();
}

function renderMustHave(){
  const b=activeHp(); const buf=state.selectedBuf; const t=state.selectedTank; const box=$('#mustHave');
  if(!b||!buf||!t){ box.textContent='Wybierz pompę, bufor i zasobnik — pokażę proponowany skład.'; return; }

  const items=[];
  items.push(Pompa ciepła — ${b.brand} ${b.model} (${b.kind}, ${b.phase||'1F'}));
  items.push(Bufor — ${buf} l);
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const tankLabel = state.selectedTankType==='dual' ? 'dwuwężownicowy' : 'pojedyncza wężownica';
  items.push(b.kind==='all-in-one' ? 'Zasobnik CWU — AIO (wbudowany)' : Zasobnik CWU — ${state.selectedTank} l (${tankLabel}));
  items.push('Armatura: zawór 3D, grupa bezpieczeństwa, zawory serwisowe');
  if((+state.glycol)>0 && b.kind==='monoblok') items.push('Glikol do obiegu zewnętrznego (monoblok)');
  items.push('Rozdzielacz(e) / hydraulika wg wyboru');
  const r=+state.rads||0; if(r>0) items.push(Montaż grzejników: ${r} × ${INTint.format(CONFIG.RAD_PRICE)} PLN);
  items.push('Montaż, uruchomienie, konfiguracja sterowania, szkolenie użytkownika');
  box.innerHTML = '<ul class="small" style="margin:6px 0 0 18px">' + items.map(t=><li>${t}</li>).join('') + '</ul>';

  pushDraftToStorage();
}

function applyHpToUi(){
  const arr = sortedHp();
  const idx = Number($('#selHp')?.value) || 0;
  state.selectedHp = arr[idx] || state.selectedHp || null;
  renderPreview();
  renderMustHave();
  renderBasket();   // odśwież sumy
  persistState();
}

/* ========================== DOBÓR MOCY / REKOS ========================== */
function quickSuggest(){
  const area = +($('#inpArea')?.value||0);
  const wpm2 = +($('#selWperm2')?.value||0);
  const out  = $('#outHeatKw');
  if(area>0 && wpm2>0){
    const kw = (area*wpm2)/1000 * 1.10; // margines 10%
    out.value = kw.toFixed(2);

    // szybkie propozycje
    showProposalsFromKw(kw);
  }else{
    out.value = '0.00';
    $('#recQuick').classList.add('hide');
    $('#recQuick').innerHTML = '';
  }
  pushDraftToStorage();
}
function showProposalsFromKw(kw){
  const box = $('#recQuick'); if(!box) return;
  const v = Number(kw)||0;
  if(v<=0){ box.classList.add('hide'); box.innerHTML=''; return; }

  const candidates = HEATPUMPS
    .slice()
    .sort((a,b)=> Math.abs(a.pA7 - v) - Math.abs(b.pA7 - v))
    .filter(h => h.pA7 >= v*0.9)
    .slice(0,3);

  if(!candidates.length){
    box.innerHTML = <span class="small">Brak oczywistych dopasowań dla ~${v.toFixed(2)} kW.</span>;
    box.classList.remove('hide');
    return;
  }
  const items = candidates.map(h => `
    <div class="row" style="margin-top:6px">
      <div style="flex:1">${h.brand} <b>${h.model}</b> <span class="small">(A7 ${h.pA7} kW, ${h.kind}, ${h.phase||'1F'})</span></div>
      <button class="btn tiny" data-pick="${h.brand}|${h.model}">Wybierz</button>
    </div>
  `).join('');
  box.innerHTML = Propozycje dla <b>~${v.toFixed(2)} kW</b>:<br>${items};
  box.classList.remove('hide');
}

function recomputeAdvanced(){
  const area = +($('#areaAdv')?.value||0);
  const wpm2 = +($('#lossWm2')?.value||0);
  const warn = $('#lossWarn');
  warn.style.display = (wpm2>140)?'block':'none';

  if(area<=0 || wpm2<=0){
    $('#heatLoad').textContent='—';
    $('#heatTarget').textContent='—';
    $('#recSummary').classList.add('hide');
    $('#areaHint').textContent='';
    pushDraftToStorage();
    return;
  }

  const req_kw = (area*wpm2)/1000;
  const margin = 1.15;
  const target = req_kw*margin;
  $('#heatLoad').textContent = req_kw.toFixed(2) + ' kW';
  $('#heatTarget').textContent = target.toFixed(2) + ' kW';

  const candidates = HEATPUMPS
    .filter(h=>h.pA7>=target*0.9)
    .slice()
    .sort((a,b)=>Math.abs(a.pA7-target)-Math.abs(b.pA7-target))
    .slice(0,3);

  const parts = [
    Szac. zapotrzebowanie (A7): <b>${req_kw.toFixed(2)} kW</b>,
    Z zapasem 15%: <b>${target.toFixed(2)} kW</b>
  ];
  if(candidates.length){
    parts.push('Propozycje: ' + candidates.map(h=>${h.brand} ${h.model} <span class="small">(A7 ${h.pA7} kW)</span>).join(' • '));
  }else{
    parts.push('<span class="small" style="color:#ff9">Brak oczywistego dopasowania — rozważ wyższą moc/model.</span>');
  }
  const box=$('#recSummary'); box.innerHTML = parts.join('<br>'); box.classList.remove('hide');

  const use = $('#selCwuUse')?.value || '4-5';
  const suggest = (use==='2-3'?'200–250 l':use==='4-5'?'250–300 l':'300 l +');
  $('#areaHint').textContent = Sugerowana pojemność CWU dla ${use} osób: ${suggest}.;

  pushDraftToStorage();
}

/* ================================ KOSZYK ================================= */
function addToBasket(name, price, qty=1){
  const i = state.basket.findIndex(x=>x.name===name && Math.abs(x.price-price)<0.01);
  if(i>=0) state.basket[i].qty += qty;
  else state.basket.push({name, price, qty});
  renderBasket();
  persistState();
  pushDraftToStorage();
}
function renderBasket(){
  const tb = $('#basket tbody'); tb.innerHTML=''; let sumNet=0;
  state.basket.forEach((it,i)=>{
    sumNet += it.price*it.qty;
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${it.name}</td>
      <td class="num"><input type="number" min="1" value="${it.qty}" data-qty="${i}" class="w70" style="background:#0d1530;border:1px solid #28356c;border-radius:10px;padding:6px 8px;color:#e8edff"></td>
      <td class="num">${fmt(it.price)} PLN</td>
      <td class="num"><button class="btn bad tiny" data-del="${i}">Usuń</button></td>`;
    tb.appendChild(tr);
  });
  const prov = sumNet*(+state.provPct||0)/100 + (+state.provAbs||0);
  $('#sumNet').textContent  = fmt(sumNet) + ' PLN';
  $('#sumProv').textContent = fmt(prov) + ' PLN';
  $('#sumGross').textContent= fmt( (sumNet+prov) * (1+state.vat) ) + ' PLN';
}

/* ============================== KLIENCI DB =============================== */
function readClients(){ return loadLocal(CONFIG.STORAGE_KEYS.CLIENT_DB, []); }
function writeClients(list){ saveLocal(CONFIG.STORAGE_KEYS.CLIENT_DB, list); }
function populateClientSelect(){
  const sel=$('#selClient'); const clients=readClients();
  sel.innerHTML='<option value="">— wybierz z bazy —</option>';
  clients.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id; o.textContent = (c.name || '') + ' • ' + (c.email || 'brak e-mail');
    sel.appendChild(o);
  });
}
function collectClientFromForm(){
  return {
    id: state.client.id || ('c_'+Date.now()),
    name: $('#clName')?.value.trim() || '',
    email: $('#clEmail')?.value.trim() || '',
    phone: $('#clPhone')?.value.trim() || '',
    nip: $('#clNip')?.value.trim() || '',
    addr: $('#clAddr')?.value.trim() || ''
  };
}
function loadClientToForm(c){
  if(!c) return;
  state.client = {...c};
  $('#clName').value = c.name||'';
  $('#clEmail').value = c.email||'';
  $('#clPhone').value = c.phone||'';
  $('#clNip').value   = c.nip||'';
  $('#clAddr').value  = c.addr||'';
  pushDraftToStorage();
}

/* ============================= PERSIST STAN ============================== */
function persistState(){
  const st = {...state, chipsActive: Array.from(state.chipsActive)};
  saveLocal(CONFIG.STORAGE_KEYS.STATE, st);
}
function restoreState(){
  const d = loadLocal(CONFIG.STORAGE_KEYS.STATE, null);
  if(!d) return;
  const { chipsActive, ...rest } = d;
  Object.assign(state, rest);
  state.chipsActive = new Set(Array.isArray(chipsActive) ? chipsActive : []);
}

/* ================================ MAILTO ================================= */
function buildOfferSummary(){
  const sum = state.basket.reduce((a,b)=>a+b.price*b.qty,0);
  const prov = sum*(+state.provPct||0)/100 + (+state.provAbs||0);
  const gross = (sum+prov)*(1+state.vat);
  const lines = state.basket.map(it=>'• ' + it.name + ' × ' + it.qty + ' | ' + fmt(it.price) + ' PLN');
  return {sum, prov, gross, lines};
}
function mailToClient(){
  const selId = $('#selClient')?.value;
  let client = null;
  if(selId){ client = readClients().find(x=>x.id===selId) || null; }
  if(!client){
    const draft = collectClientFromForm();
    if(draft.email) client=draft;
  }
  const {sum, prov, gross, lines} = buildOfferSummary();
  const subject = 'Oferta – pompa ciepła / zestaw';
  const bodyLines = [
    'Dzień dobry,',
    '',
    'Poniżej podsumowanie oferty:',
    ...lines,
    '',
    'Suma netto: ' + fmt(sum) + ' PLN',
    'Prowizja: ' + fmt(prov) + ' PLN',
    'Razem brutto (VAT ' + Math.round(state.vat*100) + '%): ' + fmt(gross) + ' PLN',
    '',
    'Szczegóły doboru mocy:',
    '• Szybka propozycja: ' + ($('#outHeatKw')?.value || '-') + ' kW',
    '• Obciążenie projektowe: ' + ($('#heatLoad')?.textContent || '—') + ' (zapas: ' + ($('#heatTarget')?.textContent || '—') + ')',
    '• Powierzchnia pokrywana wybraną pompą: ' + ($('#areaByHp')?.textContent || '—'),
    '',
    'Pozdrawiam'
  ];
  const mail = 'mailto:' + (client&&client.email?encodeURIComponent(client.email):'') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyLines.join('\n'));
  location.href = mail;
}

/* =============================== ZDARZENIA =============================== */
// Filtry i sort
['q','fBrand','fType','fRef','fPhase','sort','tagsAll'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  const sync = ()=>{ if(id==='tagsAll'){ state.tagsAll=el.checked; } renderTable(); persistState(); };
  el.addEventListener('input', sync);
  el.addEventListener('change', sync);
});
$('#btnClear')?.addEventListener('click', ()=>{
  ['q','fBrand','fType','fRef','fPhase'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  state.chipsActive.clear();
  fillFilters();           // odśwież chipsy
  $('#sort').value='brand.asc';
  renderTable(); persistState();
});
// wybór z tabeli (delegacja)
document.addEventListener('click', (e)=>{
  const pick = e.target?.getAttribute && e.target.getAttribute('data-pick');
  if(pick){
    const [brand,model]=pick.split('|');
    const arr=sortedHp(); const idx=arr.findIndex(x=>x.brand===brand && x.model===model);
    if(idx>=0){
      $('#selHp').value=String(idx);
      state.selectedHp=arr[idx];
      applyHpToUi();
      window.scrollTo({top:0,behavior:'smooth'});
    }
  }
  const del = e.target?.getAttribute && e.target.getAttribute('data-del');
  if(del!=null){ state.basket.splice(Number(del),1); renderBasket(); persistState(); pushDraftToStorage(); }
});

// Selecty konfiguratora
$('#selHp')?.addEventListener('change', ()=>{
  const arr=sortedHp(); state.selectedHp = arr[Number($('#selHp').value)||0];
  applyHpToUi();
});
$('#selBufor')?.addEventListener('change', e=>{ state.selectedBuf=e.target.value; renderPreview(); renderBasket(); renderMustHave(); persistState(); pushDraftToStorage(); });
$('#selVat')?.addEventListener('change', e=>{ state.vat=Number(e.target.value)||CONFIG.VAT_DEFAULT; renderPreview(); renderBasket(); persistState(); pushDraftToStorage(); });
$('#selCwuType')?.addEventListener('change', e=>{
  state.selectedTankType = e.target.value;
  fillSelects(); renderPreview(); renderMustHave(); persistState(); pushDraftToStorage();
});
$('#selCwu')?.addEventListener('change', e=>{ state.selectedTank=e.target.value; renderPreview(); renderMustHave(); persistState(); pushDraftToStorage(); });
$('#selCwuUse')?.addEventListener('change', ()=>{ recomputeAdvanced(); });

// dodatki
['selV3d','selSafety','selHydro','selGlycol'].forEach(id=>{
  const el = document.getElementById(id); if(!el) return;
  el.addEventListener('change', (e)=>{
    const key = e.target.id.replace('sel','').toLowerCase();
    state[key] = Number(e.target.value)||0;
    renderPreview(); renderMustHave(); persistState(); pushDraftToStorage();
  });
});
$('#inpRads')?.addEventListener('input', e=>{
  state.rads=Math.max(0,Number(e.target.value)||0);
  renderPreview(); renderMustHave(); persistState(); pushDraftToStorage();
});

// Prowizje
['provPct','provAbs'].forEach(id=>{
  const el = document.getElementById(id); if(!el) return;
  el.addEventListener('input', ()=>{
    state.provPct=Number($('#provPct').value)||0;
    state.provAbs=Number($('#provAbs').value)||0;
    renderBasket(); persistState(); pushDraftToStorage();
  });
});

// Koszyk – dodawanie
$('#btnAddPack')?.addEventListener('click', ()=>{
  const b=activeHp(); if(!b){ alert('Wybierz pompę.'); return; }
  const bufKey=state.selectedBuf;
  const tankKey=state.selectedTank;
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const bufCost = BUFFERS[bufKey]||0;
  const tankCost = (b.kind==='all-in-one')? 0 : (tankSrc[tankKey]||0);
  const extras = (+state.v3d||0) + (+state.safety||0) + (+state.hydro||0) + (+state.glycol||0) + ((+state.rads||0)*CONFIG.RAD_PRICE);
  const price  = pricePack(b.price, bufCost, tankCost, extras);
  const labels=[]; if(+state.v3d>0) labels.push('zawór 3D'); if(+state.safety>0) labels.push('gr. bezp.'); if(+state.hydro>0) labels.push('hydraulika+'); if(+state.glycol>0 && b.kind==='monoblok') labels.push('glikol');
  const rlabel = state.rads? ` + grzejniki x${state.rads}` : '';
  const elabel = labels.length? ` + ${labels.join(', ')}` : '';
  addToBasket(Zestaw: ${b.brand} ${b.model} + bufor ${bufKey} l + ${(b.kind==='all-in-one' ? 'AIO CWU' : ('CWU '+tankKey+' l ('+(state.selectedTankType==='dual'?'dual':'single')+')'))}${rlabel}${elabel}, price, 1);
});
$('#btnAddHp')?.addEventListener('click', ()=>{
  const b=activeHp(); if(!b){ alert('Wybierz pompę.'); return; }
  addToBasket(Pompa ciepła: ${b.brand} ${b.model} — tylko urządzenie, soloPrice(b), 1);
});

// Koszyk – ilości live
document.addEventListener('input', (e)=>{
  if(e.target && e.target.matches && e.target.matches('[data-qty]')){
    const i=Number(e.target.getAttribute('data-qty'));
    state.basket[i].qty=Math.max(1,Number(e.target.value)||1);
    renderBasket(); persistState(); pushDraftToStorage();
  }
});

// Kopiuj / Drukuj / XLSX / Import-Export JSON
$('#btnCopy')?.addEventListener('click', ()=>{
  const {sum, prov, gross, lines} = buildOfferSummary();
  let txt = 'Oferta — Pompy ciepła (zestaw)\n\n' + lines.join('\n');
  txt += '\n\nSuma netto: ' + fmt(sum) + ' PLN';
  txt += '\nProwizja: ' + fmt(prov) + ' PLN';
  txt += '\nRazem brutto (z VAT): ' + fmt(gross) + ' PLN';
  navigator.clipboard.writeText(txt).then(()=>alert('Skopiowano do schowka')).catch(()=>{});
});
$('#btnPrint')?.addEventListener('click', ()=> window.print());
$('#btnXlsx')?.addEventListener('click', ()=>{
  try{
    if(typeof XLSX==='undefined'){ alert('Brak biblioteki XLSX — dołącz ją w HTML, aby eksportować.'); return; }
    const rows = state.basket.map(it=>({ Pozycja: it.name, Ilosc: it.qty, Cena_PLN: it.price }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Koszyk');
    XLSX.writeFile(wb, 'Koszyk_PompyCiepla.xlsx');
  }catch(e){ alert('Eksport XLSX nie powiódł się.'); }
});
$('#btnExportJson')?.addEventListener('click', ()=>{
  const data = JSON.stringify(state.basket, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='koszyk.json'; a.click();
  URL.revokeObjectURL(url);
});
$('#btnImportJson')?.addEventListener('click', ()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const arr=JSON.parse(reader.result);
        if(Array.isArray(arr)){ state.basket = arr; renderBasket(); persistState(); pushDraftToStorage(); }
      }catch(err){ alert('Nieprawidłowy plik JSON.'); }
    };
    reader.readAsText(file);
  };
  inp.click();
});

// Klienci – CRUD + wysyłki
$('#btnSaveClient')?.addEventListener('click', ()=>{
  const c = collectClientFromForm();
  if(!c.name){ alert('Wpisz nazwę/imię klienta.'); return; }
  const list=readClients(); const i=list.findIndex(x=>x.id===c.id);
  if(i>=0) list[i] = c; else list.push(c);
  writeClients(list); populateClientSelect();
  state.client = c;
  alert('Zapisano klienta do bazy.');
  pushDraftToStorage();
});
$('#btnLoadClient')?.addEventListener('click', ()=>{
  const id=$('#selClient')?.value; if(!id) return;
  const c=readClients().find(x=>x.id===id); if(c) loadClientToForm(c);
});
$('#btnToContract')?.addEventListener('click', ()=>{ pushDraftToStorage(); alert('Szkic umowy zaktualizowany. Otwórz umowę, aby wczytać dane.'); });
$('#btnMailTo')?.addEventListener('click', mailToClient);

// Szybki dobór mocy
$('#inpArea')?.addEventListener('input', quickSuggest);
$('#selWperm2')?.addEventListener('change', quickSuggest);

// Zaawansowany dobór mocy
['selStd','areaAdv','lossWm2','selCwuUse'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener('input', ()=>{ recomputeAdvanced(); renderPreview(); });
  el.addEventListener('change', ()=>{ recomputeAdvanced(); renderPreview(); });
});

// Globalne: klik „Wybierz” z rekomendacji i tabeli już obsługujemy delegacją (data-pick)

/* =============================== INIT ==================================== */
function init(){
  // Odtwórz stan
  restoreState();
  // Filtry + katalog
  fillFilters();
  renderTable();
  // Selecty i UI konfiguratora
  fillSelects();
  // Koszyk i klient
  renderBasket();
  populateClientSelect();
  if(state.client && (state.client.name || state.client.email || state.client.phone || state.client.addr)) loadClientToForm(state.client);

  // Odtwórz wybraną pompę w selekcie
  if(state.selectedHp){
    const arr=sortedHp(); const idx=arr.findIndex(x=>x.brand===state.selectedHp.brand && x.model===state.selectedHp.model);
    if(idx>=0) $('#selHp').value=String(idx);
  }
  // Pierwsze przeliczenia
  quickSuggest();
  recomputeAdvanced();
  renderPreview();
  renderMustHave();

  // Auto-draft na starcie (po odtworzeniu stanu)
  pushDraftToStorage();
}
init();
