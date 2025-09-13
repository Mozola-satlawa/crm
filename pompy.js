/* pompy.js — katalog + konfigurator + auto-zapis do umowy */
'use strict';

/* ===================== DANE ===================== */

// przykładowa baza (uzupełnij wg potrzeb; dodałem większość z wcześniejszej listy)
const HEATPUMPS = [
  // MIDEA (fragment – uzupełnij gdy trzeba)
  {brand:'Midea', model:'M-Thermal Arctic 6.3 kW Monoblok MHC-V6W/D2N8-E30',  kind:'monoblok', phase:'1F', pA7:6.3, scop:5.0, ref:'R290', noise:55, price:11890, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal 10 kW Monoblok MHC-V10W/D2N8-B',           kind:'monoblok', phase:'1F', pA7:10.0,scop:4.8, ref:'R32', noise:56, price:16080, tags:['WiFi']},
  {brand:'Midea', model:'M-Thermal Arctic 12 kW Monoblok MHC-V12WD2RN7-E30',  kind:'monoblok', phase:'1F', pA7:12.0,scop:4.8, ref:'R290', noise:56, price:15438, tags:['Arctic','R290']},
  {brand:'Midea', model:'M-Thermal PRO 14 kW Split 3F',                       kind:'split',    phase:'3F', pA7:14.0,scop:4.7, ref:'R32', noise:56, price:21990, tags:['PRO','split','3F']},
  {brand:'Midea', model:'M-Thermal All-in-One 8 kW (R32)',                    kind:'all-in-one', phase:'1F', pA7:8.0, scop:4.8, ref:'R32', noise:53, price:18490, tags:['AIO']},

  // PANASONIC (fragment)
  {brand:'Panasonic', model:'Aquarea Monoblok 9 kW WH-MXC09J3E5 (T-CAP)',     kind:'monoblok', phase:'1F', pA7:9.0, scop:4.8, ref:'R32', noise:55, price:15300, tags:['T-CAP']},
  {brand:'Panasonic', model:'Aquarea Split 12 kW 1F',                         kind:'split',    phase:'1F', pA7:12.0,scop:4.7, ref:'R32', noise:56, price:18600, tags:['split']},
  {brand:'Panasonic', model:'Aquarea All-in-One 9 kW 3F',                     kind:'all-in-one', phase:'3F', pA7:9.0, scop:4.8, ref:'R32', noise:54, price:22764, tags:['AIO','3F']},

  // GALMET – PRIMA (monoblok)
  {brand:'Galmet', model:'PRIMA 8GT Monoblok',     kind:'monoblok', phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:55, price:24000, tags:['PRIMA']},
  {brand:'Galmet', model:'PRIMA 10GT Monoblok',    kind:'monoblok', phase:'1F', pA7:10.0, scop:4.7, ref:'R32', noise:56, price:26000, tags:['PRIMA']},
  {brand:'Galmet', model:'PRIMA 12GT Monoblok 3F', kind:'monoblok', phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:56, price:32000, tags:['PRIMA','3F']},
  {brand:'Galmet', model:'PRIMA 16GT Monoblok 3F', kind:'monoblok', phase:'3F', pA7:16.0, scop:4.6, ref:'R32', noise:57, price:36000, tags:['PRIMA','3F']},

  // GALMET – PRIMA S (split)
  {brand:'Galmet', model:'PRIMA S 8GT Split',      kind:'split', phase:'1F', pA7:8.0,  scop:4.8, ref:'R32', noise:54, price:24000, tags:['PRIMA','SPLIT']},
  {brand:'Galmet', model:'PRIMA S 12GT Split 3F',  kind:'split', phase:'3F', pA7:12.0, scop:4.7, ref:'R32', noise:55, price:32000, tags:['PRIMA','SPLIT','3F']},
];

const BUFFERS = { '0':0,'50':1200,'80':1450,'100':1650,'150':2200,'200':2600,'300':3600 };
const TANKS_SINGLE = { '150':2450, '200':2900, '250':3400, '300':3800 };
const TANKS_DUAL   = { '200':3450, '250':3990, '300':4450 };

const RAD_PRICE = 750;
const ONLY_HP_SURCHARGE = 4000;         // sama pompa – dopłata wewnętrzna
const AUDIT_FEE = 1500;                 // audyt Galmet

/* ===================== STAN ===================== */

const state = {
  vat:0.08, rads:0, v3d:0, safety:0, hydro:0, glycol:0,
  basket:[],
  selectedHp:null, selectedBuf:'100', selectedTankType:'single', selectedTank:'200',
  provPct:0, provAbs:0,
  chipsActive:new Set(), tagsAll:false,
  install:'podlogowka',
  audit:true,
  filters:{ q:'', brand:'', kind:'', ref:'', phase:'', sort:'brand.asc' }
};

/* ===================== HELPERY ===================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const INTmoney = new Intl.NumberFormat('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2});
const INTint   = new Intl.NumberFormat('pl-PL');
const fmt = n => INTmoney.format(+n||0);
const debounce = (fn,ms=120)=>{let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const toast = (msg='Zapisano do umowy')=>{
  const el = $('#toast'); if(!el) return; el.textContent=msg; el.classList.remove('hide'); setTimeout(()=>el.classList.add('hide'),1200);
};

/* ====== Umowa – live sync ====== */
const CONTRACT_KEY='contract_live';
const ATTACH_KEY='contract_live_attachments';

function pushContractDraft(client=null){
  const hp = state.selectedHp;
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const payload = {
    createdAt: new Date().toISOString(),
    client: client || {
      name: $('#clName')?.value?.trim()||'',
      email: $('#clEmail')?.value?.trim()||'',
      phone: $('#clPhone')?.value?.trim()||'',
      addr: $('#clAddr')?.value?.trim()||'',
    },
    selection:{
      pump: hp? {brand:hp.brand, model:hp.model, kind:hp.kind, phase:hp.phase, pA7:hp.pA7, ref:hp.ref, price:+hp.price||0} : null,
      buffer: state.selectedBuf,
      tank: {type: state.selectedTankType, vol: state.selectedTank, price: (hp&&hp.kind==='all-in-one')?0:(tankSrc[state.selectedTank]||0)},
      extras:{
        v3d:+state.v3d||0, safety:+state.safety||0, hydro:+state.hydro||0, glycol:+state.glycol||0, rads:+state.rads||0,
        audit: (hp && hp.brand==='Galmet' && state.audit) ? AUDIT_FEE : 0
      },
      install: state.install,
      vat: state.vat
    },
    basket: state.basket.slice(),
    totals: computeTotals()
  };
  try{ localStorage.setItem(CONTRACT_KEY, JSON.stringify(payload)); }catch(e){}
  toast();
}
const autoSaveToContract = debounce(()=>pushContractDraft(), 200);

/* ====== Logika cenowa (Galmet, baza dynamiczna) ====== */
function cheapest(obj){ return Math.min(...Object.values(obj).map(Number)); }
function cheapestPumpPrice(){ return Math.min(...HEATPUMPS.map(h=>+h.price||0)); }

function baseTargetFor(hp){
  let t = 38000; // domyślnie
  if (hp && hp.brand==='Galmet' && state.install==='podlogowka'){
    if (hp.pA7 >= 8 && hp.pA7 <= 10)      t = 36500;
    else if (hp.pA7 >= 12 && hp.pA7 <= 16) t = 38000;
  }
  return t;
}
function dynamicOffsetFor(hp){
  const target = baseTargetFor(hp);
  return target - (cheapestPumpPrice() + cheapest(BUFFERS) + cheapest(TANKS_SINGLE));
}

function soloPrice(hp){ return (+hp.price||0) + ONLY_HP_SURCHARGE; }
function sortedHp(){ return HEATPUMPS.slice().sort((a,b)=> a.brand.localeCompare(b.brand,'pl') || a.pA7 - b.pA7); }

function pricePack(hpPrice, bufCost, tankCost, extras, hp){
  const off = dynamicOffsetFor(hp);
  return (+hpPrice||0) + (+bufCost||0) + (+tankCost||0) + (+extras||0) + off;
}

/* ===================== FILTRY / TABELA ===================== */
const QUICK_TAGS = ['R290','R32','monoblok','split','all-in-one','1F','3F','AIO','PRO','T-CAP','PRIMA'];
function makeChips(){
  const box = $('#chips'); box.innerHTML='';
  QUICK_TAGS.forEach(t=>{
    const el=document.createElement('div'); el.className='chip'; el.textContent=t; el.dataset.tag=t;
    if(state.chipsActive.has(t)) el.classList.add('active');
    el.addEventListener('click', ()=>{
      state.chipsActive.has(t) ? state.chipsActive.delete(t) : state.chipsActive.add(t);
      el.classList.toggle('active'); renderTable(); autoSaveToContract();
    });
    box.appendChild(el);
  });
}

function fillFilters(){
  const brands=[...new Set(HEATPUMPS.map(x=>x.brand))].sort((a,b)=>a.localeCompare(b,'pl',{sensitivity:'base'}));
  $('#fBrand').innerHTML = '<option value="">Marka (wszystkie)</option>' + brands.map(b=><option>${b}</option>).join('');
}

function parsePowerQuery(q){
  if(!q) return null;
  q = String(q).trim();
  const kw = q.match(/^([<>]=?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if(kw){ const op=kw[1], v=parseFloat(kw[2]);
    if(op==='>=') return p=>p>=v; if(op==='<=') return p=>p<=v; if(op==='>') return p=>p>v; if(op==='<') return p=>p<v;
  }
  const range = q.match(/^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)/);
  if(range){ const a=parseFloat(range[1]), b=parseFloat(range[2]); const lo=Math.min(a,b),hi=Math.max(a,b); return p=>p>=lo&&p<=hi; }
  const eq = q.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if(eq){ const v=parseFloat(eq[1]), tol=0.6; return p=>Math.abs(p-v)<=tol; }
  return null;
}

function applyFiltersSort(rows){
  const q=$('#q').value.trim().toLowerCase();
  const brand=$('#fBrand').value, kind=$('#fType').value, ref=$('#fRef').value, ph=$('#fPhase').value;
  const powerPredicate = parsePowerQuery(q);
  rows=rows.filter(p=>{
    if(brand && p.brand!==brand) return false;
    if(kind && p.kind!==kind) return false;
    if(ref && p.ref!==ref) return false;
    if(ph && p.phase!==ph) return false;
    if(state.chipsActive.size){
      const tags = new Set([p.kind, p.phase, p.ref, ...(p.tags||[])].filter(Boolean));
      const hits = [...state.chipsActive].map(t=>tags.has(t));
      if(!hits.some(Boolean)) return false;
    }
    if(q){
      const textHit = [p.brand,p.model,p.ref,p.kind,p.phase,(p.tags||[]).join(' ')].some(v=>(v||'').toLowerCase().includes(q));
      const powerHit = powerPredicate ? powerPredicate(p.pA7) : false;
      return textHit || powerHit;
    }
    return true;
  });
  switch($('#sort').value){
    case 'brand.asc': rows.sort((a,b)=> (a.brand.localeCompare(b.brand,'pl')) || a.pA7-b.pA7); break;
    case 'brand.desc': rows.sort((a,b)=> (b.brand.localeCompare(a.brand,'pl')) || a.pA7-b.pA7); break;
    case 'p.asc': rows.sort((a,b)=>a.pA7-b.pA7); break;
    case 'p.desc': rows.sort((a,b)=>b.pA7-a.pA7); break;
    case 'price.asc': rows.sort((a,b)=>a.price-b.price); break;
    case 'price.desc': rows.sort((a,b)=>b.price-a.price); break;
  }
  return rows;
}

function renderTable(){
  let rows=applyFiltersSort(HEATPUMPS.slice());
  $('#cntAll').textContent=HEATPUMPS.length;
  $('#cntVis').textContent=rows.length;
  const tb=$('#tbody'); tb.innerHTML='';
  rows.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><button class="btn tiny" data-pick="${p.brand}|${p.model}">Wybierz</button></td>
      <td><b>${p.brand}</b><div class="small">${p.model}</div></td>
      <td>${p.kind}</td><td>${p.pA7}</td><td>${p.scop||''}</td>
      <td>${p.ref||''}</td><td>${p.phase||''}</td><td>${p.noise||''}</td>
      <td>${(p.tags||[]).map(t=><span class="tag">${t}</span>).join('')}</td>
    `;
    tb.appendChild(tr);
  });
}

/* ===================== SELECTY / PODGLĄD / MUST-HAVE ===================== */
function optionsForTanks(){ return Object.keys(state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE); }

function fillSelects(){
  const arr=sortedHp();
  const s=$('#selHp');
  s.innerHTML = arr.map((x,i)=><option value="${i}">${x.brand} ${x.model} • ${x.kind} • A7 ${x.pA7} kW</option>).join('');
  state.selectedHp = state.selectedHp || arr[0] || null;

  const b=$('#selBufor');
  b.innerHTML = Object.keys(BUFFERS).map(v=><option value="${v}">${v} l • ${INTint.format(BUFFERS[v])} PLN</option>).join('');
  if(state.install==='podlogowka') state.selectedBuf = state.selectedBuf ?? '0';
  b.value = state.selectedBuf;

  const t=$('#selCwu');
  const src = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  t.innerHTML = Object.keys(src).map(v=><option value="${v}">${v} l • ${INTint.format(src[v])} PLN</option>).join('');
  if(!src[state.selectedTank]) state.selectedTank = Object.keys(src)[0];
  t.value=state.selectedTank;

  applyHpToUi();
}

function applyHpToUi(){
  const arr = sortedHp();
  const idx = Number($('#selHp')?.value)||0;
  state.selectedHp = arr[idx] || state.selectedHp || null;
  renderPreview(); renderMustHave(); renderBasket();
  autoSaveToContract();
}

function activeHp(){ return state.selectedHp; }

function renderPreview(){
  const b=activeHp(); if(!b){ $('#pricePreview').textContent='—'; return; }

  if (state.install!=='podlogowka' && state.selectedBuf==='0'){
    state.selectedBuf='100'; const sel=$('#selBufor'); if(sel) sel.value='100';
  }

  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const bufCost  = BUFFERS[state.selectedBuf]||0;
  const tankCost = (b.kind==='all-in-one')?0:(tankSrc[state.selectedTank]||0);

  let extras = (+state.v3d||0)+(+state.safety||0)+(+state.hydro||0)+(+state.glycol||0)+((+state.rads||0)*RAD_PRICE);
  if (b.brand==='Galmet' && state.audit) extras += AUDIT_FEE;

  const sum=pricePack(b.price,bufCost,tankCost,extras,b);
  $('#pricePreview').textContent = ${fmt(sum)} PLN netto (brutto: ${fmt(sum*(1+state.vat))} PLN);

  const hint=$('#typeHint'); hint.classList.remove('hide');
  hint.textContent = (b.kind==='monoblok') ? 'Monoblok: przy ryzyku zamarzania dodaj glikol.' :
                     (b.kind==='all-in-one') ? 'All-in-One: wbudowany zasobnik CWU.' :
                     'Split: glikol nie dotyczy.';
}

function renderMustHave(){
  const b=activeHp(); const buf=state.selectedBuf; const t=state.selectedTank; const box=$('#mustHave');
  if(!b||!buf||!t){ box.textContent='Wybierz pompę, bufor i zasobnik — pokażę skład.'; return; }
  const items=[];
  items.push(Pompa ciepła — ${b.brand} ${b.model} (${b.kind}, ${b.phase||'1F'}));
  items.push(Bufor — ${buf} l);
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const tankLabel = state.selectedTankType==='dual' ? 'dwuwężownicowy' : 'pojedyncza wężownica';
  items.push(b.kind==='all-in-one' ? 'Zasobnik CWU — AIO (wbudowany)' : Zasobnik CWU — ${state.selectedTank} l (${tankLabel}));
  items.push('Armatura: zawór 3D, grupa bezpieczeństwa, zawory serwisowe');
  if((+state.glycol)>0 && b.kind==='monoblok') items.push('Glikol (monoblok)');
  const r=+state.rads||0; if(r>0) items.push(Grzejniki: ${r} × ${INTint.format(RAD_PRICE)} PLN);
  items.push('Montaż, uruchomienie, konfiguracja, szkolenie');
  box.innerHTML = '<ul class="small" style="margin:6px 0 0 16px">'+items.map(t=><li>${t}</li>).join('')+'</ul>';
}

/* ===================== KOSZYK / SUMY ===================== */
function addToBasket(name, price, qty=1){
  const i=state.basket.findIndex(x=>x.name===name && Math.abs(x.price-price)<0.01);
  if(i>=0) state.basket[i].qty += qty;
  else state.basket.push({name, price, qty});
  renderBasket(); autoSaveToContract();
}
function computeTotals(){
  const sumNet = state.basket.reduce((a,b)=>a+b.price*b.qty,0);
  const prov   = sumNet*(+state.provPct||0)/100 + (+state.provAbs||0);
  const gross  = (sumNet+prov)*(1+state.vat);
  return {sum:sumNet, prov, gross};
}
function renderBasket(){
  const tb=$('#basket tbody'); tb.innerHTML=''; let sumNet=0;
  state.basket.forEach((it,i)=>{
    sumNet += it.price*it.qty;
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${it.name}</td>
      <td class="right-align"><input type="number" min="1" value="${it.qty}" data-qty="${i}" style="width:70px;background:#0d1530;border:1px solid #28356c;border-radius:10px;padding:6px 8px;color:#e8edff"></td>
      <td class="right-align">${fmt(it.price)} PLN</td>
      <td class="right-align"><button class="btn bad tiny" data-del="${i}">Usuń</button></td>`;
    tb.appendChild(tr);
  });
  const {prov,gross} = computeTotals();
  $('#sumNet').textContent = fmt(sumNet) + ' PLN';
  $('#sumProv').textContent = fmt(prov) + ' PLN';
  $('#sumGross').textContent = fmt(gross) + ' PLN';
}

/* ===================== UPLOAD → UMOwa ===================== */
$('#btnAttach')?.addEventListener('click', ()=>$('#fileAttach').click());
$('#fileAttach')?.addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return;
  const item = await fileToAttachment(f);
  try{
    const arr = JSON.parse(localStorage.getItem(ATTACH_KEY)||'[]');
    arr.push(item);
    localStorage.setItem(ATTACH_KEY, JSON.stringify(arr));
    toast('Załącznik dodany do umowy');
  }catch(err){}
  e.target.value='';
});

async function fileToAttachment(file){
  if(file.type.startsWith('image/')){
    const dataUrl = await resizeImageToDataURL(file, 1600);
    return {type:'image', name:file.name, mime:file.type, data:dataUrl, ts:Date.now()};
  }
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return {type:'file', name:file.name, mime:file.type||'application/octet-stream', data:data:application/octet-stream;base64,${b64}, ts:Date.now()};
}
function resizeImageToDataURL(file, maxDim=1600){
  return new Promise(res=>{
    const img=new Image(); img.onload=()=>{
      const {width:W,height:H}=img; const r=Math.min(1, maxDim/Math.max(W,H));
      const w=Math.round(W*r), h=Math.round(H*r);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',0.85));
    };
    const fr=new FileReader(); fr.onload=()=>{ img.src=fr.result; }; fr.readAsDataURL(file);
  });
}

/* ===================== ZDARZENIA UI ===================== */
// Filtry
;['q','fBrand','fType','fRef','fPhase','sort'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener('input', debounce(()=>{ renderTable(); },150));
  el.addEventListener('change', ()=>{ renderTable(); });
});
$('#btnClear')?.addEventListener('click', ()=>{
  ['q','fBrand','fType','fRef','fPhase'].forEach(id=>document.getElementById(id).value='');
  state.chipsActive.clear(); makeChips(); $('#sort').value='brand.asc'; renderTable();
});

// Katalog – wybór pompy
document.addEventListener('click', (e)=>{
  const pick = e.target.getAttribute && e.target.getAttribute('data-pick');
  if(pick){
    const [brand,model]=pick.split('|');
    const arr=sortedHp(); const idx=arr.findIndex(x=>x.brand===brand && x.model===model);
    if(idx>=0){ $('#selHp').value=String(idx); state.selectedHp=arr[idx]; applyHpToUi(); window.scrollTo({top:0,behavior:'smooth'}); }
  }
  const del = e.target.getAttribute && e.target.getAttribute('data-del');
  if(del!=null){ state.basket.splice(Number(del),1); renderBasket(); autoSaveToContract(); }
});

$('#selHp')?.addEventListener('change', ()=>{ const arr=sortedHp(); state.selectedHp = arr[Number($('#selHp').value)||0]; applyHpToUi(); });
$('#selBufor')?.addEventListener('change', e=>{ state.selectedBuf=e.target.value; renderPreview(); renderBasket(); renderMustHave(); autoSaveToContract(); });
$('#selVat')?.addEventListener('change', e=>{ state.vat=Number(e.target.value)||0.08; renderPreview(); renderBasket(); autoSaveToContract(); });
$('#selCwuType')?.addEventListener('change', e=>{ state.selectedTankType=e.target.value; fillSelects(); renderPreview(); renderMustHave(); autoSaveToContract(); });
$('#selCwu')?.addEventListener('change', e=>{ state.selectedTank=e.target.value; renderPreview(); renderMustHave(); autoSaveToContract(); });
$('#selInstall')?.addEventListener('change', e=>{ state.install=e.target.value; renderPreview(); renderMustHave(); autoSaveToContract(); });
$('#chkAudit')?.addEventListener('change', e=>{ state.audit=!!e.target.checked; renderPreview(); renderBasket(); autoSaveToContract(); });

['selV3d','selSafety','selHydro','selGlycol'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener('change', (e)=>{ state[e.target.id.replace('sel','').toLowerCase()] = Number(e.target.value)||0; renderPreview(); renderMustHave(); autoSaveToContract(); });
});

['provPct','provAbs'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener('input', debounce(()=>{
    state.provPct=Number($('#provPct').value)||0; state.provAbs=Number($('#provAbs').value)||0;
    renderBasket(); autoSaveToContract();
  },150));
});

// Koszyk
$('#btnAddPack')?.addEventListener('click', ()=>{
  const b=activeHp(); if(!b){ alert('Wybierz pompę.'); return; }
  if (state.install!=='podlogowka' && state.selectedBuf==='0'){ state.selectedBuf='100'; $('#selBufor').value='100'; alert('Dla grzejników bufor jest wymagany. Ustawiono 100 l.'); }
  const tankSrc = state.selectedTankType==='dual' ? TANKS_DUAL : TANKS_SINGLE;
  const bufCost  = BUFFERS[state.selectedBuf]||0;
  const tankCost = (b.kind==='all-in-one') ? 0 : (tankSrc[state.selectedTank]||0);
  let extras = (+state.v3d||0)+(+state.safety||0)+(+state.hydro||0)+(+state.glycol||0)+((+state.rads||0)*RAD_PRICE);
  if (b.brand==='Galmet' && state.audit) extras += AUDIT_FEE;
  const price = pricePack(b.price, bufCost, tankCost, extras, b);
  const labels=[]; if(+state.v3d>0) labels.push('zawór 3D'); if(+state.safety>0) labels.push('gr. bezp.'); if(+state.hydro>0) labels.push('hydraulika+'); if(+state.glycol>0 && b.kind==='monoblok') labels.push('glikol'); if(b.brand==='Galmet' && state.audit) labels.push('audyt');
  const rlabel = state.rads ? ` + grzejniki x${state.rads}` : ''; const elabel = labels.length ? ` + ${labels.join(', ')}` : '';
  addToBasket(Zestaw: ${b.brand} ${b.model} + bufor ${state.selectedBuf} l + ${(b.kind==='all-in-one'?'AIO CWU':('CWU '+state.selectedTank+' l ('+(state.selectedTankType==='dual'?'dual':'single')+')'))}${rlabel}${elabel}, price, 1);
});
$('#btnAddHp')?.addEventListener('click', ()=>{
  const b=activeHp(); if(!b){ alert('Wybierz pompę.'); return; }
  addToBasket(Pompa ciepła: ${b.brand} ${b.model} — tylko urządzenie, soloPrice(b), 1);
});
document.addEventListener('input', (e)=>{
  if(e.target && e.target.matches && e.target.matches('[data-qty]')){
    const i=Number(e.target.getAttribute('data-qty'));
    state.basket[i].qty=Math.max(1,Number(e.target.value)||1);
    renderBasket(); autoSaveToContract();
  }
});

// Kopiuj / Drukuj / XLSX
$('#btnCopy')?.addEventListener('click', ()=>{
  const {sum,prov,gross} = computeTotals();
  const lines = state.basket.map(it=>'• ' + it.name + ' × ' + it.qty + ' | ' + fmt(it.price) + ' PLN');
  let txt = 'Oferta — Pompy ciepła (zestaw)\n\n' + lines.join('\n');
  txt += '\n\nSuma netto: ' + fmt(sum) + ' PLN';
  txt += '\nProwizja: ' + fmt(prov) + ' PLN';
  txt += '\nRazem brutto (z VAT): ' + fmt(gross) + ' PLN';
  navigator.clipboard.writeText(txt).then(()=>toast('Skopiowano')).catch(()=>{});
});
$('#btnPrint')?.addEventListener('click', ()=> window.print());
$('#btnXlsx')?.addEventListener('click', ()=>{
  const rows = state.basket.map(it=>({ Pozycja: it.name, Ilosc: it.qty, Cena_PLN: it.price }));
  const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Koszyk'); XLSX.writeFile(wb, 'Koszyk_PompyCiepla.xlsx');
});

// Klienci – baza + autosave
const DB_CLIENTS_KEY='kp_clients_db';
function readClients(){ try{ return JSON.parse(localStorage.getItem(DB_CLIENTS_KEY)||'[]'); }catch(e){ return []; } }
function writeClients(list){ try{ localStorage.setItem(DB_CLIENTS_KEY, JSON.stringify(list)); }catch(e){} }
function populateClientSelect(){
  const sel=$('#selClient'); const clients=readClients();
  sel.innerHTML='<option value="">— wybierz z bazy —</option>';
  clients.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=(c.name||'') + ' • ' + (c.email||'brak e-mail'); sel.appendChild(o); });
}
function collectClientFromForm(){
  return { id:'c_'+Date.now(), name:$('#clName').value.trim(), email:$('#clEmail').value.trim(), phone:$('#clPhone').value.trim(), addr:$('#clAddr').value.trim() };
}
function loadClientToForm(c){ $('#clName').value=c.name||''; $('#clEmail').value=c.email||''; $('#clPhone').value=c.phone||''; $('#clAddr').value=c.addr||''; autoSaveToContract(c); }

$('#btnSaveClient')?.addEventListener('click', ()=>{ const c=collectClientFromForm(); if(!c.name){ alert('Wpisz nazwę/imię klienta.'); return; } const list=readClients(); list.push(c); writeClients(list); populateClientSelect(); autoSaveToContract(c); toast('Klient zapisany'); });
$('#btnLoadClient')?.addEventListener('click', ()=>{ const id=$('#selClient').value; if(!id) return; const c=readClients().find(x=>x.id===id); if(c) loadClientToForm(c); });
;['clName','clEmail','clPhone','clAddr','provPct','provAbs'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.addEventListener('input', debounce(()=>autoSaveToContract(),200)); });

/* Dobór mocy – szybki */
function quickSuggest(){ const area=+($('#inpArea')?.value||0), wpm2=+($('#selWperm2')?.value||0); $('#outHeatKw').value = (area>0 && wpm2>0) ? ((area*wpm2)/1000*1.10).toFixed(2) : '0.00'; }
$('#inpArea')?.addEventListener('input', debounce(()=>{ quickSuggest(); autoSaveToContract(); },120));
$('#selWperm2')?.addEventListener('change', ()=>{ quickSuggest(); autoSaveToContract(); });

/* ===================== INIT ===================== */
function init(){
  fillFilters(); makeChips(); renderTable(); fillSelects(); renderBasket(); quickSuggest(); populateClientSelect();
  // ustaw focusy nie kasując kursora (bez natychmiastowego recompute na keypress)
}
init();
