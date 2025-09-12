'use strict';

/* ====== USTAWIENIA FIRMY ====== */
const BASE_PROFIT_PLN = 8000;  // ukryty narzut firmy na każdą instalację (nie w UI)

/* ====== MARKI DOPUSZCZONE ====== */
const ALLOWED = {
  panels: ['Q-CELLS','HYUNDAI','JA SOLAR','JOLYWOOD','LONGI','TRINA','JINKO','AIKO'],
  inverters: ['DEYE','HUAWEI','SOLAREDGE','SOFAR','FOXESS','GOODWE','GROWATT','SOLAX','FELICITY'],
  accessoriesBrands: ['SOLAREDGE','HUAWEI','SOFAR','FOXESS','GROWATT','TIGO','DEYE','CHINT','FRONIUS','EASTRON']
};
const norm = s=>String(s||'').trim().toUpperCase();
const PLN0 = new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0});
const money = n => PLN0.format(Math.round(+n))+' zł';
const el = id => document.getElementById(id);

/* ====== KATALOG ====== */
function loadCatalog(){
  try{
    const fromLS = JSON.parse(localStorage.getItem('arkon_calc_catalog')||'null');
    if(fromLS && fromLS.panels && fromLS.inverters){
      const filter = cat=>{
        const p=(cat.panels||[]).filter(x=>ALLOWED.panels.includes(norm(x.brand)));
        const i=(cat.inverters||[]).filter(x=>ALLOWED.inverters.includes(norm(x.brand)));
        const a=(cat.accessories||[]).filter(x=>ALLOWED.accessoriesBrands.includes(norm(x.brand)));
        return {panels:p,inverters:i,accessories:a};
      };
      return filter(fromLS);
    }
  }catch{}
  // fallback minimum, gdy brak eksportu
  return {
    panels: [
      {brand:'TRINA',model:'Vertex S+ 440 FB',price:200},
      {brand:'JINKO',model:'JKM445N-54HL4R-B Full black',price:240}
    ],
    inverters: [
      {brand:'HUAWEI',model:'SUN2000-10KTL-M1-HC',price:3953},
      {brand:'SOFAR',model:'HYD 10KTL 3F',price:6227}
    ],
    accessories: [
      {brand:'HUAWEI',name:'DTSU666-H 3F 250A',price:497},
      {brand:'SOLAREDGE',name:'Optymalizator S500',price:176}
    ]
  };
}
const CATALOG = loadCatalog();

/* ====== UI FILL ====== */
function fillSelects(){
  const brandsP=[...new Set(CATALOG.panels.map(x=>x.brand))].sort();
  el('brandPanel').innerHTML = brandsP.map(b=><option>${b}</option>).join('');
  syncModels('panel');

  const brandsI=[...new Set(CATALOG.inverters.map(x=>x.brand))].sort();
  el('brandInv').innerHTML = brandsI.map(b=><option>${b}</option>).join('');
  syncModels('inv');

  const acc = CATALOG.accessories.slice().sort((a,b)=>(a.brand+a.name).localeCompare(b.brand+b.name,'pl'));
  el('acc').innerHTML = acc.map(a=><option value="${a.brand}||${a.name}">${a.brand} — ${a.name} (${money(a.price)})</option>).join('');
}
function syncModels(kind){
  if(kind==='panel'){
    const b = el('brandPanel').value;
    const models = CATALOG.panels.filter(x=>x.brand===b);
    el('modelPanel').innerHTML = models.map(m=><option value="${m.model}">${m.model} (${money(m.price)})</option>).join('');
  }else{
    const b = el('brandInv').value;
    const models = CATALOG.inverters.filter(x=>x.brand===b);
    el('modelInv').innerHTML = models.map(m=><option value="${m.model}">${m.model} (${money(m.price)})</option>).join('');
  }
}
el('brandPanel').addEventListener('change', ()=>syncModels('panel'));
el('brandInv').addEventListener('change', ()=>syncModels('inv'));

/* ====== PREFILL Z PARAMS ====== */
function prefillFromQuery(){
  const p = new URLSearchParams(location.search);
  const bp=p.get('brandPanel'), mp=p.get('modelPanel');
  const bi=p.get('brandInv'),   mi=p.get('modelInv');
  const qty=p.get('qty'),       acc=p.get('acc'); // CSV: BRAND::NAME,...

  if(bp && CATALOG.panels.some(x=>x.brand===bp)){ el('brandPanel').value=bp; syncModels('panel'); if(mp && CATALOG.panels.some(x=>x.brand===bp && x.model===mp)) el('modelPanel').value=mp; }
  if(bi && CATALOG.inverters.some(x=>x.brand===bi)){ el('brandInv').value=bi; syncModels('inv'); if(mi && CATALOG.inverters.some(x=>x.brand===bi && x.model===mi)) el('modelInv').value=mi; }
  if(qty) el('qtyPanels').value = Math.max(1, parseInt(qty,10)||10);
  if(acc){
    const wanted = acc.split(',').map(s=>s.split('::'));
    Array.from(el('acc').options).forEach(o=>{
      const [b,n] = o.value.split('||');
      if(wanted.find(([wb,wn])=>wb===b && wn===n)) o.selected = true;
    });
  }
}

/* ====== LICZENIE ====== */
function findItem(arr, brand, key, val){ return arr.find(x=>x.brand===brand && x[key]===val); }
function recalc(){
  const qty = +el('qtyPanels').value || 0;

  const bP=el('brandPanel').value, mP=el('modelPanel').value;
  const pPanel = findItem(CATALOG.panels, bP, 'model', mP)?.price || 0;
  const sumPanels = pPanel * qty;

  const bI=el('brandInv').value, mI=el('modelInv').value;
  const pInv = findItem(CATALOG.inverters, bI, 'model', mI)?.price || 0;

  const accSel = Array.from(el('acc').selectedOptions).map(o=>o.value.split('||'));
  const sumAcc = accSel.reduce((a,[brand,name])=>{
    const it = CATALOG.accessories.find(x=>x.brand===brand && x.name===name);
    return a + (it?.price || 0);
  },0);

  const commission = Math.max(0, +el('commission').value || 0);

  const subtotal = sumPanels + pInv + sumAcc;
  const grand = subtotal + BASE_PROFIT_PLN + commission;

  const rows = [
    ['Panele', ${bP} • ${mP} × ${qty} = ${money(sumPanels)}],
    ['Inwerter', ${bI} • ${mI} = ${money(pInv)}],
    ['Akcesoria', accSel.length? accSel.map(([brand,name])=>${brand} ${name}).join(', ')+' = '+money(sumAcc) : '—'],
    ['Prowizja handlowca (opc.)', money(commission)],
  ];
  document.getElementById('tBody').innerHTML = rows.map(([k,v])=><tr><th>${k}</th><td>${v}</td></tr>).join('');
  document.getElementById('grand').textContent = money(grand);
}
el('recalc').addEventListener('click', recalc);

/* ====== START ====== */
fillSelects();
prefillFromQuery();
recalc();
