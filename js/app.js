/* Retorno de la automatización del ordeño | Datavet — interfaz (modo rápido y modo completo) */
'use strict';
const {LEVELS, LEVEL_GUIDE, DEF, ROWS, SCEN, nf, money, mill, pct, yrs, parse, compute, scenarios, sensitivity, verdict, validate} = window.RM;

const STORE = 'datavet-roi-ordeno-v5';
const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(DEF);
let mode = 'simple';
let step = 1;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const SEMC = {g:'#209B6C', y:'#F5A623', r:'#D0021B'};
const SEMW = {g:'Se paga rápido', y:'Se paga dentro de la vida útil', r:'No conviene con estos datos'};

/* ---------- formatos para los campos (lo que se escribe en los inputs) ---------- */
const ROW = Object.fromEntries(ROWS.filter(r => r.k).map(r => [r.k, r]));
function toField(k, v){
  const t = (ROW[k] || {}).t;
  if (t === 'pct') return nf(v * 100, Math.abs(v * 100 - Math.round(v * 100)) > 1e-9 ? 1 : 0);
  if (t === 'money' || t === 'int') return nf(v, 0);
  return nf(v, Math.abs(v - Math.round(v)) > 1e-9 ? 1 : 0);
}
function fromField(k, s){
  const v = parse(s);
  if (!isFinite(v)) return NaN;
  return (ROW[k] || {}).t === 'pct' ? v / 100 : v;
}

/* ---------- guardar en el dispositivo (solo comodidad; si falla, la página funciona igual) ---------- */
function save(){
  try { localStorage.setItem(STORE, JSON.stringify({S, mode})); } catch (e) { /* sin almacenamiento */ }
}
function load(){
  try {
    const o = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (o && o.S && typeof o.S === 'object') {
      S = {...DEF};
      for (const k of Object.keys(DEF)) if (typeof o.S[k] === typeof DEF[k]) S[k] = o.S[k];
      if (!LEVELS[S.nivel]) S.nivel = DEF.nivel;
      if (o.mode === 'full' || o.mode === 'simple') mode = o.mode;
    }
  } catch (e) { /* datos dañados: se usan los de ejemplo */ }
}

/* ---------- contador de uso anónimo (GoatCounter): nunca envía datos de la finca ---------- */
function initCounter(){
  if (/^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) return;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = 'https://datavet.goatcounter.com/count';
  document.head.appendChild(s);
}
function track(name, title){
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({path:'roi-' + name, title, event:true}); } catch (e) { /* sin contador */ }
}

function toast(msg, err = false, ms = 3200){
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
}

function applyLevel(k){
  const L = LEVELS[k];
  S.nivel = k;
  for (const f of ['inv', 'bprod', 'dconc', 'bord', 'bmast', 'reduc']) S[f] = L[f];
}

/* ====================================================================== */
/* Gráfica de flujo acumulado (SVG): la usan la pantalla y las descargas  */
/* ====================================================================== */
function chartSvg(r, W = 960, H = 360){
  const ml = 92, mr = 24, mt = 26, mb = 46, cw = W - ml - mr, ch = H - mt - mb;
  const s1 = r.cumArr, s2 = r.dcumArr, s3 = r.loan > 0 ? r.ccumArr : null;
  const all = [...s1, ...s2, ...(s3 || []), 0];
  let lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(span / 5)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= 6) || mag * 10;
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const n = s1.length - 1;
  const X = i => ml + i / n * cw, Y = v => mt + (hi - v) / (hi - lo) * ch;
  let g = `<rect width="${W}" height="${H}" fill="#fff"/>`;
  for (let v = lo; v <= hi + 1e-6; v += step) {
    g += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${Math.abs(v) < 1e-6 ? '#07193F' : '#E6EAEE'}" stroke-width="${Math.abs(v) < 1e-6 ? 1.6 : 1}"/>` +
         `<text x="${ml - 10}" y="${Y(v) + 4.5}" font-size="13" text-anchor="end" fill="#4F5B73">${esc(mill(v, Math.abs(step) < 1e6 ? 1 : 0))}</text>`;
  }
  const every = n > 15 ? 5 : n > 10 ? 2 : 1;
  for (let i = 0; i <= n; i++) if (i % every === 0 || i === n)
    g += `<text x="${X(i)}" y="${H - mb + 22}" font-size="13" text-anchor="middle" fill="#4F5B73">${i}</text>`;
  g += `<text x="${ml + cw / 2}" y="${H - 6}" font-size="13" text-anchor="middle" fill="#4F5B73">Año</text>`;
  const path = s => s.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  if (s3) g += `<path d="${path(s3)}" fill="none" stroke="#F5A623" stroke-width="3"/>`;
  g += `<path d="${path(s2)}" fill="none" stroke="#209B6C" stroke-width="3" stroke-dasharray="9 6"/>`;
  g += `<path d="${path(s1)}" fill="none" stroke="#07193F" stroke-width="3.4"/>`;
  s1.forEach((v, i) => { g += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#07193F"/>`; });
  if (r.pbSimple != null && r.pbSimple <= n) {
    const x = X(r.pbSimple);
    g += `<line x1="${x}" x2="${x}" y1="${mt}" y2="${mt + ch}" stroke="#209B6C" stroke-width="1.4" stroke-dasharray="3 4"/>` +
         `<rect x="${Math.min(x + 6, W - mr - 190)}" y="${mt + 2}" width="184" height="26" rx="5" fill="#EAF7F0"/>` +
         `<text x="${Math.min(x + 14, W - mr - 182)}" y="${mt + 20}" font-size="14" font-weight="700" fill="#17784F">Se paga en ${esc(yrs(r.pbSimple))}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Jost, Arial, Helvetica, sans-serif" role="img" aria-label="Flujo de caja acumulado por año">${g}</svg>`;
}
function chartLegend(r){
  return `<div class="lg"><span><i style="background:#07193F"></i>Flujo acumulado</span><span><i class="dash"></i>Acumulado descontado (VPN)</span>` +
    (r.loan > 0 ? `<span><i style="background:#F5A623"></i>Acumulado con crédito</span>` : '') + `</div>`;
}

/* Partidas de beneficio, para barras, PDF y Excel */
function benefitItems(r){
  const P = r.P;
  return [
    {k:'prod', l:'Más leche', d:`+${pct(P.bprod, 1)} por vaca (${nf(P.lts, 1)} → ${nf(r.ltsNew, 1)} L)${P.cmarg ? ', menos ' + money(P.cmarg) + '/L de alimento' : ''}`, v:r.ben.prod, c:'#209B6C'},
    {k:'mast', l:'Menos mastitis', d:`−${nf(P.bmast * 100, 1)} puntos de incidencia`, v:r.ben.mast, c:'#26B0B3'},
    {k:'conc', l:'Concentrado', d:P.dconc === 0 ? 'Sin cambio' : `${P.dconc > 0 ? '−' : '+'}${nf(Math.abs(P.dconc), 1)} kg por vaca al día`, v:r.ben.conc, c:'#66BE8F'},
    {k:'mo', l:'Mano de obra', d:`${nf(Math.min(P.bord, P.ord), 0)} ordeñador(es) menos`, v:r.ben.mo, c:'#07193F'},
    {k:'elec', l:'Energía y tiempo de ordeño', d:`${pct(P.reduc)} menos tiempo`, v:r.ben.elec, c:'#009245'},
    {k:'mant', l:'Mantenimiento del equipo', d:`${pct(P.mant, 1)} de la inversión al año`, v:-r.ben.mant, c:'#B00218'}
  ];
}
function barsHtml(r){
  const items = benefitItems(r);
  const mx = Math.max(1, ...items.map(i => Math.abs(i.v)));
  return items.map(i => `<div class="bar${i.v < 0 ? ' neg' : ''}"><div>${i.l}<small>${esc(i.d)}</small></div>` +
      `<div class="bt"><div class="bf" style="width:${Math.max(1, Math.abs(i.v) / mx * 100)}%;background:${i.c}"></div></div>` +
      `<div class="bv">${mill(i.v)}</div></div>`).join('') +
    `<div class="bar tot"><div>Beneficio neto al año</div><div></div><div class="bv">${mill(r.ben.neto)}</div></div>`;
}

/* ====================================================================== */
/* Modo rápido                                                            */
/* ====================================================================== */
const SIMPLE_KEYS = ['vacas', 'lts', 'precio', 'horas', 'ord'];
function buildSimple(){
  $('#s-nivel').innerHTML = Object.entries(LEVELS).map(([k, L]) =>
    `<button type="button" class="level" role="radio" data-nivel="${k}" aria-checked="false"><b>${L.name}</b><span>${L.desc} Inversión típica: ${mill(L.inv, 0)}.</span></button>`).join('');
}
function fillSimple(){
  $('#s-finca').value = S.finca;
  for (const k of SIMPLE_KEYS) { const el = $(`#s-${k}`); el.value = toField(k, S[k]); el.classList.remove('bad'); }
  $('#s-inv').value = nf(S.inv / 1e6, S.inv % 1e6 ? 1 : 0);
  $$('#s-nivel .level').forEach(b => b.setAttribute('aria-checked', b.dataset.nivel === S.nivel ? 'true' : 'false'));
}

function goStep(n, focus = true){
  if (n === 3) {
    const bad = $$('.simple input.bad');
    if (bad.length) { bad[0].focus(); toast('Revise el dato marcado en rojo.', true); return; }
    const v = validate(S);
    $('#s-errs').innerHTML = v.errs.map(e => `<div class="alert">${esc(e)}</div>`).join('');
    if (v.errs.length) { toast('Revise los datos antes de continuar.', true); return; }
    if (step !== 3) track('resultados-rapido', 'Resultados, modo rápido');
  }
  step = n;
  $$('.simple .step').forEach(s => { s.hidden = +s.dataset.step !== n; });
  $$('.steps li').forEach(li => {
    const k = +li.dataset.step;
    if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.classList.toggle('done', k < n);
  });
  render();
  if (!focus) return;
  window.scrollTo({top:0, behavior:'smooth'});
  const h = $(`.simple .step[data-step="${n}"] .step-h, .simple .step[data-step="${n}"] .r-head h2`);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({preventScroll:true}); }
}

function renderSimple(r){
  if (step !== 3) return;
  const P = r.P, v = verdict(r), sc = scenarios(S);
  const cls = {g:'ok', y:'warn', r:'bad'}[r.sem];
  let h = `<div class="r-head"><p>${esc(S.finca || 'Su finca')} · ${esc(LEVELS[S.nivel].name)} · inversión ${mill(P.inv)}</p>` +
    `<h2>${esc(v.t)}</h2><div class="kpis">` +
    `<div class="kpi hl"><b>${r.pbSimple == null ? '—' : nf(r.pbSimple, 1)}</b><span>${r.pbSimple == null ? 'no se recupera' : 'años para recuperar la inversión'}</span></div>` +
    `<div class="kpi"><b>${mill(r.ben.neto)}</b><span>le deja cada año</span></div>` +
    `<div class="kpi"><b>${money(r.porLitro)}</b><span>más por cada litro que vende</span></div>` +
    `</div></div>`;
  h += `<div class="verdict ${cls}"><h3>${esc(v.t)}</h3><p>${esc(v.m)}</p></div>`;
  h += `<div class="card"><h3>¿De dónde sale la plata?</h3><div class="bars">${barsHtml(r)}</div></div>`;
  h += `<div class="card"><h3>¿Cuándo se paga el equipo?</h3><div class="chart">${chartSvg(r, 430, 300)}${chartLegend(r)}</div></div>`;
  h += `<div class="card"><h3>¿Y si los beneficios son menores?</h3><table class="compare"><thead><tr><th>Si se logra…</th><th>Se paga en</th><th>Deja al año</th></tr></thead><tbody>` +
    sc.map(s => `<tr><td>${s.k === 'esp' ? '<b>Lo esperado</b>' : s.k === 'pes' ? 'Solo el 60 %' : 'El 120 %'}</td><td>${s.r.pbSimple == null ? 'No se paga' : yrs(s.r.pbSimple)}</td><td>${mill(s.r.ben.neto)}</td></tr>`).join('') +
    `</tbody></table></div>`;
  h += `<div class="card"><h3>Lo que la calculadora supuso</h3><ul class="lights">` +
    [['Más leche por vaca', pct(P.bprod, 1)], ['Menos vacas con mastitis', nf(P.bmast * 100, 1) + ' puntos'], ['Menos tiempo de ordeño', pct(P.reduc)],
     ['Ordeñadores que se reducen', nf(Math.min(P.bord, P.ord), 0)], ['Concentrado por vaca', P.dconc ? '−' + nf(P.dconc, 1) + ' kg al día' : 'Sin cambio'],
     ['Mantenimiento al año', pct(P.mant, 1) + ' de la inversión'], ['Precio del concentrado', money(P.pconc) + '/kg'], ['Costo por ordeñador', money(P.sal) + '/mes']]
      .map(([a, b]) => `<li><span class="lt"><b>${a}</b></span><span class="lv">${b}</span></li>`).join('') +
    `</ul><p class="hint" style="margin:10px 0 0">Si alguno no se parece a su finca, ajústelo en el <b>análisis completo</b>.</p></div>`;
  $('#s-result').innerHTML = h;
}

/* ====================================================================== */
/* Modo completo                                                          */
/* ====================================================================== */
function buildFull(){
  $('#nivel').innerHTML = Object.entries(LEVELS).map(([k, L]) => `<option value="${k}">${esc(L.name)}</option>`).join('');
  $('#params tbody').innerHTML = ROWS.map(r => {
    if (r.g) return `<tr class="grp"><th colspan="3" scope="colgroup">${r.g}</th></tr>`;
    return `<tr><td><label for="p-${r.k}">${r.l}</label></td><td><input id="p-${r.k}" inputmode="decimal" autocomplete="off" data-k="${r.k}"></td><td class="unit">${r.u}</td></tr>` +
      (r.h ? `<tr class="hint"><td colspan="3">${r.h}</td></tr>` : '');
  }).join('');
}
function fillFull(){
  $('#finca').value = S.finca;
  $('#nivel').value = S.nivel;
  $$('#params input[data-k]').forEach(el => { el.value = toField(el.dataset.k, S[el.dataset.k]); el.classList.remove('bad'); });
}

function fechaTxt(){
  const f = $('#fecha').value;
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function kboxes(r){
  const P = r.P, c = r.sem;
  const b = (cls, t, v, s) => `<div class="kbox ${cls}"><span>${t}</span><b>${v}</b><small>${s}</small></div>`;
  let h = b(c, 'Recuperación simple', yrs(r.pbSimple), 'inversión ÷ beneficio neto') +
    b(r.pbDesc != null ? c : 'r', 'Recuperación descontada', r.pbDesc != null ? yrs(r.pbDesc) : `Más de ${P.vida} años`, `a ${pct(P.tasa)} de tasa`) +
    b(r.van > 0 ? 'g' : 'r', `VPN a ${P.vida} años`, mill(r.van), r.van > 0 ? 'crea valor' : 'no crea valor a esta tasa') +
    b(r.tir != null && r.tir > P.tasa ? 'g' : 'r', 'TIR', r.tir == null ? '–' : pct(r.tir, 1), `frente a ${pct(P.tasa)} exigido`) +
    b('n', 'Beneficio neto al año', mill(r.ben.neto), `ROI anual ${pct(r.roi, 1)}`) +
    b('n', 'Por litro vendido', money(r.porLitro), `${money(r.porVaca)} por vaca al año`);
  if (r.loan > 0) h += b(r.minCaja >= 0 ? 'g' : 'y', 'Caja con crédito (peor año)', mill(r.minCaja), `cuota ${mill(r.cuota)} al año por ${P.fplazo} años`);
  return h;
}

function scenRows(r){
  return scenarios(S).map(s => [s.l, s.d, s.r.pbSimple == null ? 'No se recupera' : yrs(s.r.pbSimple), mill(s.r.ben.neto), mill(s.r.van), s.r.tir == null ? '–' : pct(s.r.tir, 1)]);
}

function renderFull(r){
  const P = r.P, v = verdict(r), val = validate(S);
  $('#errors').innerHTML = val.errs.map(e => `<div class="alert">${esc(e)}</div>`).join('') + val.warns.map(e => `<div class="alert warn">${esc(e)}</div>`).join('');
  $('#printMeta').textContent = [S.finca || 'Finca sin nombre', fechaTxt(), LEVELS[S.nivel].name].filter(Boolean).join(' · ');
  if (val.errs.length) { $('#lead').textContent = 'Hay datos por corregir.'; $('#sub').textContent = ''; return; }
  $('#lead').innerHTML = `<span class="dot ${r.sem}" role="img" aria-label="${SEMW[r.sem]}"></span>${esc(v.t)}`;
  $('#sub').textContent = v.m;
  $('#kgrid').innerHTML = kboxes(r);
  $('#bars').innerHTML = barsHtml(r);
  $('#chart').innerHTML = chartSvg(r) + chartLegend(r);

  $('#scen').innerHTML = `<thead><tr><th>Escenario</th><th>Supuesto</th><th>Recuperación</th><th>Beneficio neto/año</th><th>VPN</th><th>TIR</th></tr></thead><tbody>` +
    scenRows(r).map((row, i) => `<tr${i === 1 ? ' style="font-weight:600"' : ''}>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') + '</tbody>';

  const credit = r.loan > 0;
  $('#flow').innerHTML = `<thead><tr><th>Año</th><th>Beneficio</th><th>Mantenimiento</th><th>Rescate</th><th>Flujo neto</th><th>Acumulado</th><th>Descontado acumulado</th>` +
    (credit ? '<th>Cuota crédito</th><th>Flujo con crédito</th><th>Saldo crédito</th>' : '') + `</tr></thead><tbody>` +
    `<tr><td>0</td><td></td><td></td><td></td><td>${mill(-P.inv)}</td><td>${mill(-P.inv)}</td><td>${mill(-P.inv)}</td>` +
    (credit ? `<td></td><td>${mill(-(P.inv - r.loan))}</td><td>${mill(r.loan)}</td>` : '') + '</tr>' +
    r.years.map(y => `<tr><td>${y.y}</td><td>${mill(y.beneficio)}</td><td>${mill(-y.mant)}</td><td>${y.rescate ? mill(y.rescate) : ''}</td><td>${mill(y.flujo)}</td>` +
      `<td class="${y.cum >= 0 ? 'up' : 'down'}">${mill(y.cum)}</td><td class="${y.dcum >= 0 ? 'up' : 'down'}">${mill(y.dcum)}</td>` +
      (credit ? `<td>${y.pago ? mill(-y.pago) : ''}</td><td class="${y.conCredito >= 0 ? '' : 'down'}">${mill(y.conCredito)}</td><td>${mill(y.saldo)}</td>` : '') + '</tr>').join('') + '</tbody>';
  $('#flowNote').textContent = credit
    ? `Crédito de ${mill(r.loan)} (${pct(P.fpct)} de la inversión) a ${pct(P.ftasa, 1)} E.A. y ${P.fplazo} años: cuota fija de ${mill(r.cuota)} al año. La finca pone ${mill(P.inv - r.loan)} de contado.`
    : 'Sin crédito: toda la inversión se paga de contado en el año 0. Puede simular un crédito en la sección «Crédito» de los parámetros.';

  const sens = sensitivity(S);
  const curL = sens.lv.reduce((a, b) => Math.abs(b - P.lts) < Math.abs(a - P.lts) ? b : a);
  const curP = sens.pv.reduce((a, b) => Math.abs(b - P.precio) < Math.abs(a - P.precio) ? b : a);
  const cc = pb => pb == null ? 'c-r' : pb <= 4 ? 'c-g' : pb <= 8 ? 'c-y' : 'c-r';
  $('#sens').innerHTML = `<thead><tr><th>Precio / Litros</th>${sens.lv.map(l => `<th>${nf(l, 0)} L</th>`).join('')}</tr></thead><tbody>` +
    sens.pv.map((pr, i) => `<tr><td>${money(pr)}</td>${sens.cells[i].map((pb, j) =>
      `<td class="${cc(pb)}${pr === curP && sens.lv[j] === curL ? ' cur' : ''}">${pb == null ? '—' : nf(pb, 1)}</td>`).join('')}</tr>`).join('') + '</tbody>';

  $('#base').innerHTML = `<thead><tr><th>Concepto (sin automatizar)</th><th>Al año</th><th>Cómo se calcula</th></tr></thead><tbody>` +
    baseRows(r).map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="ref">${esc(c)}</td></tr>`).join('') + '</tbody>';

  $('#lvlGuide').innerHTML = Object.entries(LEVELS).map(([k, L]) =>
    `<div class="${k === S.nivel ? 'on' : ''}"><h3>${esc(L.name)}</h3><ul>${LEVEL_GUIDE[k].map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('');
  $('#paramsPrint').innerHTML = '<tbody>' + paramRows().map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('') + '</tbody>';
}
function baseRows(r){
  const P = r.P, b = r.base;
  return [
    ['Ingreso por leche', mill(b.ingreso), `${nf(P.vacas)} vacas × ${nf(P.lts, 1)} L × ${nf(P.dias)} días × ${money(P.precio)}`],
    ['Concentrado', mill(-b.conc), `${nf(P.vacas)} vacas × ${nf(P.conc, 1)} kg × ${nf(P.dias)} días × ${money(P.pconc)}`],
    ['Mano de obra de ordeño', mill(-b.mo), `${nf(P.ord)} ordeñadores × ${money(P.sal)} × 12`],
    ['Pérdida por mastitis', mill(-b.mast), `${pct(P.mast)} de ${nf(P.vacas)} vacas × ${nf(P.lmast)} L × ${money(P.precio)}`],
    ['Energía de la sala', mill(-b.elec), `${nf(P.horas, 1)} h × ${money(P.celec)} × ${nf(P.dias)} días`],
    ['Margen sobre estos costos', mill(b.margen), 'No incluye forraje, sanidad ni otros costos de la finca']
  ];
}
function paramRows(){
  return [['Nivel de automatización', LEVELS[S.nivel].name], ...ROWS.filter(r => r.k).map(r => {
    const v = S[r.k], t = r.t;
    const txt = t === 'pct' ? pct(v, 1) : t === 'money' ? money(v) : nf(v, t === 'd1' ? 1 : 0);
    return [r.l, txt + (t === 'pct' || t === 'money' ? '' : ' ' + r.u)];
  })];
}

/* ====================================================================== */
/* Render general y modos                                                 */
/* ====================================================================== */
function render(){
  const r = compute(S);
  if (mode === 'full') renderFull(r); else renderSimple(r);
  save();
}
function setMode(m, push = true){
  mode = m;
  document.body.dataset.mode = m;
  $$('.modes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
  $$('[data-view]').forEach(v => { v.hidden = v.dataset.view !== m; });
  if (m === 'full') fillFull(); else fillSimple();
  if (push) history.replaceState(null, '', m === 'full' ? '#completo' : location.pathname + location.search);
  render();
}

/* Datos para las descargas (Excel y PDF) */
function report(){
  const r = compute(S);
  return {S:clone(S), r, finca:S.finca, fecha:$('#fecha').value, fechaTxt:fechaTxt(), mode, level:LEVELS[S.nivel],
          verdict:verdict(r), items:benefitItems(r), scen:scenarios(S), scenRows:scenRows(r), sens:sensitivity(S),
          base:baseRows(r), params:paramRows(), chartSvg:(w, h) => chartSvg(r, w, h), guide:LEVEL_GUIDE, levels:LEVELS};
}
function fileName(ext){
  const slug = S.finca.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `roi_automatizacion_ordeno_${slug ? slug + '_' : ''}${$('#fecha').value || 'datavet'}.${ext}`;
}

/* Carga perezosa de librerías (solo al descargar) */
const loaded = {};
function loadScript(src){
  if (!loaded[src]) loaded[src] = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => { delete loaded[src]; ko(new Error('No se pudo cargar ' + src)); };
    document.head.appendChild(s);
  });
  return loaded[src];
}

async function download(kind){
  if (validate(S).errs.length) { toast('Hay datos por corregir antes de descargar.', true); return; }
  const btns = $$(`[data-action="${kind}"]`);
  btns.forEach(b => { b.disabled = true; });
  toast(kind === 'xlsx' ? 'Preparando el Excel…' : 'Preparando el PDF…', false, 15000);
  try {
    if (kind === 'xlsx') { await window.DVX.exportXlsx(report(), fileName('xlsx'), loadScript); toast('Excel descargado.'); }
    else if (kind === 'pdf') { await window.DVP.exportPdf(report(), fileName('pdf'), loadScript); toast('PDF descargado.'); }
    else if (kind === 'share') {
      const blob = await window.DVP.exportPdf(report(), fileName('pdf'), loadScript, true);
      const file = new File([blob], fileName('pdf'), {type:'application/pdf'});
      await navigator.share({files:[file], title:'Retorno de la automatización del ordeño', text:`Análisis de ROI${S.finca ? ' · ' + S.finca : ''} — Datavet`});
      toast('Listo.');
    }
    track(`descarga-${kind}-${mode === 'full' ? 'completo' : 'rapido'}`, `Descarga ${kind}, modo ${mode}`);
  } catch (e) {
    if (e && e.name === 'AbortError') { toast('Se canceló el envío.'); return; }
    console.error(e);
    toast('No se pudo generar el archivo. Revise su conexión e inténtelo de nuevo.', true, 6000);
  } finally {
    btns.forEach(b => { b.disabled = false; });
  }
}

/* ---------- eventos ---------- */
function bind(){
  $$('.modes button').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode === 'full' && mode !== 'full') track('modo-completo', 'Abrió el modo completo'); setMode(b.dataset.mode); }));
  $$('[data-mode-go]').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.modeGo); window.scrollTo({top:0}); }));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.go)));
  $$('[data-action]').forEach(b => b.addEventListener('click', () => { if (b.dataset.action === 'print') window.print(); else download(b.dataset.action); }));
  $$('[data-bind=finca]').forEach(el => el.addEventListener('input', () => {
    S.finca = el.value.trim();
    $$('[data-bind=finca]').forEach(o => { if (o !== el) o.value = el.value; });
    render();
  }));

  // modo rápido
  $$('#s-nivel .level').forEach(b => b.addEventListener('click', () => {
    applyLevel(b.dataset.nivel); fillSimple(); render();
  }));
  $$('.simple .stepper').forEach(st => {
    const k = st.dataset.k, inc = +st.dataset.step, min = +st.dataset.min, max = +st.dataset.max;
    const inp = st.querySelector('input');
    const dec = String(inc).includes('.') ? 1 : 0;
    const commit = v => { inp.classList.remove('bad'); S[k] = v; render(); };
    inp.addEventListener('input', () => {
      const v = parse(inp.value), ok = isFinite(v) && v >= min && v <= max;
      inp.classList.toggle('bad', !ok);
      if (ok) commit(v);
    });
    inp.addEventListener('blur', () => { if (!inp.classList.contains('bad')) inp.value = toField(k, S[k]); });
    const bump = d => {
      const cur = isFinite(parse(inp.value)) ? parse(inp.value) : S[k];
      const v = Math.min(max, Math.max(min, +(Math.round((cur + d * inc) / inc) * inc).toFixed(dec)));
      inp.value = toField(k, v); commit(v);
    };
    st.querySelector('.minus').addEventListener('click', () => bump(-1));
    st.querySelector('.plus').addEventListener('click', () => bump(1));
  });
  const invIn = $('#s-inv');
  invIn.addEventListener('input', () => {
    const v = parse(invIn.value), ok = isFinite(v) && v > 0 && v <= 100000;
    invIn.classList.toggle('bad', !ok);
    if (ok) { S.inv = v * 1e6; render(); }
  });
  invIn.addEventListener('blur', () => { if (!invIn.classList.contains('bad')) invIn.value = nf(S.inv / 1e6, S.inv % 1e6 ? 1 : 0); });

  // modo completo
  $('#params').addEventListener('input', e => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    const v = fromField(k, el.value), R = ROW[k];
    const ok = isFinite(v) && v >= R.min && v <= R.max;
    el.classList.toggle('bad', !ok);
    if (ok) { S[k] = v; render(); }
  });
  $('#params').addEventListener('focusout', e => {
    const el = e.target, k = el.dataset.k;
    if (k && !el.classList.contains('bad')) el.value = toField(k, S[k]);
  });
  $('#nivel').addEventListener('change', e => { applyLevel(e.target.value); fillFull(); render(); toast('Se cargaron la inversión y los beneficios típicos del nivel.'); });
  $('#reset').addEventListener('click', () => { const f = S.finca; S = clone(DEF); S.finca = f; fillFull(); render(); toast('Se restablecieron los valores de ejemplo.'); });
  $('#fecha').addEventListener('input', render);
  $('#wipe').addEventListener('click', () => {
    if (!confirm('¿Borrar los datos guardados en este dispositivo? La calculadora volverá a los valores de ejemplo.')) return;
    try { localStorage.removeItem(STORE); } catch (e) { /* sin almacenamiento */ }
    S = clone(DEF);
    if (mode === 'full') fillFull(); else { fillSimple(); goStep(1, false); }
    render();
    toast('Se borraron los datos de este dispositivo.');
  });
}

/* Compartir el PDF solo si el navegador puede compartir archivos (celulares) */
function initShare(){
  try {
    const f = new File(['x'], 'x.pdf', {type:'application/pdf'});
    if (navigator.canShare && navigator.canShare({files:[f]})) $$('[data-action="share"]').forEach(b => { b.hidden = false; });
  } catch (e) { /* sin compartir */ }
}

/* ---------- inicio ---------- */
initCounter();
load();
buildFull();
buildSimple();
$('#fecha').value = today();
bind();
initShare();
setMode(location.hash === '#completo' ? 'full' : mode, false);
goStep(1, false);

/* Para pruebas automáticas y depuración */
window.APP = {get S(){ return S; }, report, render, setMode, goStep, compute, applyLevel};
