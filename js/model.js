/* Retorno de la inversión en automatización del ordeño | Datavet
   Modelo de cálculo, constantes y formatos. No depende del navegador: se usa también en las pruebas (Node). */
(function (root) {
'use strict';

/* Niveles de automatización. Los beneficios por defecto siguen la guía de la propia herramienta:
   el concentrado solo se optimiza con el sistema completo (alimentación + software). */
const LEVELS = {
  basico:   {name:'Solo retiro automático', short:'Retiro automático',
             desc:'Retiradores automáticos de pezoneras.',
             inv:80e6,  bprod:0.03, dconc:0,   bord:0, bmast:0.03, reduc:0.15},
  medicion: {name:'Retiro + medición por vaca', short:'Retiro + medición',
             desc:'Retiro automático y medidores de leche por vaca con alertas.',
             inv:150e6, bprod:0.04, dconc:0,   bord:1, bmast:0.04, reduc:0.20},
  completo: {name:'Sistema completo + alimentación + software', short:'Sistema completo',
             desc:'Retiro, medición, alimentación por vaca y software de gestión.',
             inv:300e6, bprod:0.06, dconc:1.0, bord:2, bmast:0.06, reduc:0.25}
};

/* Qué beneficios aplica cada nivel (para la guía en pantalla y el PDF) */
const LEVEL_GUIDE = {
  basico:   ['Tiempo de ordeño y electricidad: menos', 'Producción: sube un poco (menos estrés)', 'Mastitis: baja un poco (retiro a tiempo)', 'Concentrado: sin cambio', 'Mano de obra: sin reducción real'],
  medicion: ['Tiempo de ordeño y electricidad: menos', 'Producción: sube (se detecta la vaca que baja)', 'Mastitis: baja (alerta temprana)', 'Concentrado: sin cambio sin software', 'Mano de obra: reducción posible'],
  completo: ['Todos los beneficios activos', 'Concentrado ajustado por vaca (mejor conversión)', 'Mastitis: baja más (conductividad)', 'Producción: sube más (datos por animal)', 'Mano de obra: reducción real posible']
};

const DEF = {
  finca:'', nivel:'basico',
  /* operación actual */
  vacas:200, lts:18, precio:1800, conc:5, pconc:1900, ord:3, sal:2200000, mast:0.18, lmast:180,
  horas:4, celec:12000, dias:365,
  /* inversión */
  inv:80e6, vida:10, tasa:0.12, mant:0.02, resid:0,
  /* beneficios esperados */
  reduc:0.15, bprod:0.03, cmarg:0, cmargAuto:true, dconc:0, bord:0, bmast:0.03,
  /* crédito (opcional) */
  fpct:0, ftasa:0.15, fplazo:5
};

/* Filas de parámetros del modo completo: k = clave, u = unidad, t = tipo de formato, h = ayuda */
const ROWS = [
  {g:'Operación actual de la finca'},
  {k:'vacas', l:'Vacas en ordeño (promedio del año)', u:'vacas', t:'int', min:1, max:20000},
  {k:'lts', l:'Litros por vaca al día', u:'L', t:'d1', min:1, max:80},
  {k:'precio', l:'Precio del litro de leche', u:'$/L', t:'money', min:100, max:20000},
  {k:'dias', l:'Días de ordeño al año', u:'días', t:'int', min:1, max:366, h:'365 si las vacas en ordeño son el promedio del año.'},
  {k:'conc', l:'Concentrado por vaca al día', u:'kg', t:'d1', min:0, max:30},
  {k:'pconc', l:'Precio del concentrado', u:'$/kg', t:'money', min:0, max:20000},
  {k:'ord', l:'Ordeñadores actuales', u:'personas', t:'int', min:0, max:100},
  {k:'sal', l:'Costo mensual por ordeñador', u:'$/mes', t:'money', min:0, max:50e6, h:'Salario más prestaciones y seguridad social.'},
  {k:'mast', l:'Vacas con mastitis clínica al año', u:'%', t:'pct', min:0, max:1},
  {k:'lmast', l:'Leche perdida por caso de mastitis', u:'L', t:'int', min:0, max:3000, h:'Leche descartada más la producción que se deja de ordeñar.'},
  {k:'horas', l:'Horas de ordeño al día', u:'h', t:'d1', min:0, max:24},
  {k:'celec', l:'Costo de la sala por hora de ordeño', u:'$/h', t:'money', min:0, max:1e6, h:'Energía de vacío, bombas y enfriamiento.'},
  {g:'Inversión'},
  {k:'inv', l:'Inversión total', u:'$', t:'money', min:1, max:1e11},
  {k:'vida', l:'Vida útil del equipo', u:'años', t:'int', min:1, max:30},
  {k:'tasa', l:'Tasa de descuento', u:'% año', t:'pct', min:0, max:1, h:'Costo del crédito o rentabilidad mínima que exige al capital propio.'},
  {k:'mant', l:'Mantenimiento y repuestos al año', u:'% inv.', t:'pct', min:0, max:0.5, h:'Servicio técnico, repuestos y licencias de software.'},
  {k:'resid', l:'Valor de rescate al final', u:'% inv.', t:'pct', min:0, max:1},
  {g:'Beneficios esperados con la automatización'},
  {k:'reduc', l:'Menos tiempo de ordeño', u:'%', t:'pct', min:0, max:0.9},
  {k:'bprod', l:'Más leche por vaca', u:'%', t:'pct', min:0, max:1},
  {k:'cmarg', l:'Alimento extra por litro adicional', u:'$/L', t:'money', min:0, max:20000, h:'Lo que cuesta alimentar la leche extra. Automático: el costo de concentrado por litro de hoy (precio del kg × kg por vaca ÷ litros por vaca).'},
  {k:'dconc', l:'Menos concentrado por vaca al día', u:'kg', t:'d1', min:-10, max:20, h:'Negativo si da más concentrado.'},
  {k:'bord', l:'Ordeñadores que se pueden reducir', u:'personas', t:'int', min:0, max:100},
  {k:'bmast', l:'Menos vacas con mastitis', u:'puntos %', t:'pct', min:0, max:1},
  {g:'Crédito (opcional)'},
  {k:'fpct', l:'Parte de la inversión con crédito', u:'%', t:'pct', min:0, max:1},
  {k:'ftasa', l:'Tasa del crédito', u:'% E.A.', t:'pct', min:0, max:1},
  {k:'fplazo', l:'Plazo del crédito', u:'años', t:'int', min:1, max:30}
];

/* Referencias de semáforo para el período de recuperación (años) */
const PB_OK = 4, PB_WARN = 8;

/* ---------- formatos (convención colombiana: punto = miles, coma = decimales) ---------- */
const nf = (x, d = 0) => isFinite(x) ? x.toLocaleString('es-CO', {minimumFractionDigits:d, maximumFractionDigits:d}) : '–';
const money = (x, d = 0) => isFinite(x) ? (x < 0 ? '−' : '') + '$ ' + nf(Math.abs(x), d) : '–';
const mill = (x, d = 1) => isFinite(x) ? (x < 0 ? '−' : '') + '$ ' + nf(Math.abs(x) / 1e6, d) + ' M' : '–';
const pct = (x, d = 0) => isFinite(x) ? nf(x * 100, d) + ' %' : '–';
const yrs = x => x == null || !isFinite(x) ? 'No se recupera' : nf(x, 1) + (Math.abs(x - 1) < 0.05 ? ' año' : ' años');

/* Acepta 15.000 · 3,90 · 1.234,5 · y también 1,234.56 o 3.90 */
const parse = s => {
  let t = String(s).trim().replace(/\s|\$|%/g, '');
  if (t === '') return NaN;
  const hasD = t.includes('.'), hasC = t.includes(',');
  if (hasD && hasC) {
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (hasC) {
    t = /^-?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  } else if (hasD && /^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  return Number(t);
};

/* ---------- finanzas ---------- */
const pmt = (rate, n, pv) => n <= 0 ? 0 : rate === 0 ? pv / n : pv * rate / (1 - Math.pow(1 + rate, -n));
const npv = (rate, flows) => flows.reduce((s, f, t) => s + f / Math.pow(1 + rate, t), 0);
function irr(flows){
  /* bisección entre −99 % y 1.000 %: estable con flujos convencionales */
  let lo = -0.99, hi = 10, flo = npv(lo, flows), fhi = npv(hi, flows);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = npv(mid, flows);
    if (Math.abs(fm) < 1e-6) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}
/* Año (con decimales) en que el acumulado pasa de negativo a positivo; null si no ocurre */
function crossing(cum){
  for (let t = 1; t < cum.length; t++) {
    if (cum[t] >= 0 && cum[t - 1] < 0) return t - 1 + (-cum[t - 1]) / (cum[t] - cum[t - 1]);
  }
  return cum[0] >= 0 ? 0 : null;
}

/* Alimento extra por litro adicional: automático = costo de concentrado por litro de hoy */
const autoCmarg = P => P.lts > 0 ? P.pconc * P.conc / P.lts : 0;
const effCmarg = P => P.cmargAuto === false ? P.cmarg : autoCmarg(P);

/* ---------- cálculo principal ---------- */
function compute(p, scale = 1){
  const P = {...DEF, ...p};
  const {vacas, lts, precio, conc, pconc, ord, sal, mast, lmast, horas, celec, dias, inv, vida, tasa, mant, resid,
         reduc, bprod, dconc, bord, bmast, fpct, ftasa, fplazo} = P;
  const cmarg = effCmarg(P);

  /* Situación actual (sin automatizar) */
  const base = {
    ingreso: vacas * lts * dias * precio,
    conc: vacas * conc * dias * pconc,
    mo: ord * sal * 12,
    mast: vacas * mast * lmast * precio,
    elec: horas * celec * dias
  };
  base.margen = base.ingreso - base.conc - base.mo - base.mast - base.elec;

  /* Beneficios anuales de automatizar; scale permite escenarios pesimista/optimista */
  const ben = {
    elec: horas * reduc * celec * dias * scale,
    prod: vacas * lts * bprod * dias * (precio - cmarg) * scale,
    conc: vacas * dconc * dias * pconc * scale,
    mo: Math.min(bord, ord) * sal * 12 * scale,
    mast: vacas * Math.min(bmast, mast) * lmast * precio * scale
  };
  ben.bruto = ben.elec + ben.prod + ben.conc + ben.mo + ben.mast;
  ben.mant = inv * mant;
  ben.neto = ben.bruto - ben.mant;

  const ltsNew = lts * (1 + bprod), concNew = conc - dconc;
  const fce = {act: conc > 0 ? lts / conc : null, nuevo: concNew > 0 ? ltsNew / concNew : null};

  /* Flujo de caja anual (año 0 = compra) */
  const years = [];
  const flows = [-inv];
  const loan = inv * fpct, cuota = pmt(ftasa, fplazo, loan);
  let saldo = loan, cum = -inv, dcum = -inv, ccum = -(inv - loan);
  const cumArr = [cum], dcumArr = [dcum], ccumArr = [ccum];
  for (let y = 1; y <= vida; y++) {
    const rescate = y === vida ? inv * resid : 0;
    const flujo = ben.neto + rescate;
    const desc = flujo / Math.pow(1 + tasa, y);
    let interes = 0, abono = 0, pago = 0;
    if (y <= fplazo && loan > 0) {
      interes = saldo * ftasa; pago = cuota; abono = pago - interes; saldo = Math.max(0, saldo - abono);
    }
    cum += flujo; dcum += desc; ccum += flujo - pago;
    flows.push(flujo);
    cumArr.push(cum); dcumArr.push(dcum); ccumArr.push(ccum);
    years.push({y, beneficio:ben.bruto, mant:ben.mant, rescate, flujo, cum, desc, dcum, pago, interes, abono, saldo, conCredito:flujo - pago, ccum});
  }

  const van = npv(tasa, flows);
  const tir = irr(flows);
  const pbSimple = ben.neto > 0 ? inv / ben.neto : null;
  const pbDesc = crossing(dcumArr);
  const pbCaja = loan > 0 ? crossing(ccumArr) : pbSimple;
  const roi = ben.neto / inv;
  const litrosAno = vacas * lts * dias;
  const porLitro = litrosAno > 0 ? ben.neto / litrosAno : 0;
  const porVaca = vacas > 0 ? ben.neto / vacas : 0;
  const minCaja = Math.min(...years.map(r => r.conCredito));

  let sem = 'r';
  if (pbSimple != null && van > 0 && pbSimple <= PB_OK) sem = 'g';
  else if (pbSimple != null && van > 0 && pbSimple <= Math.min(PB_WARN, vida)) sem = 'y';

  return {P:{...P, cmarg}, base, ben, ltsNew, concNew, fce, years, flows, van, tir, pbSimple, pbDesc, pbCaja, roi,
          porLitro, porVaca, litrosAno, loan, cuota, minCaja, sem, cumArr, dcumArr, ccumArr};
}

/* Escenarios: ¿y si los beneficios son menores o mayores a lo esperado? */
const SCEN = [
  {k:'pes', l:'Pesimista', d:'Se logra el 60 % de los beneficios', f:0.6},
  {k:'esp', l:'Esperado', d:'Los beneficios que usted escribió', f:1},
  {k:'opt', l:'Optimista', d:'Se logra el 120 % de los beneficios', f:1.2}
];
const scenarios = p => SCEN.map(s => ({...s, r:compute(p, s.f)}));

/* Sensibilidad: años para recuperar la inversión según precio del litro y litros por vaca */
function sensitivity(p){
  const P = {...DEF, ...p};
  const lv = [...new Set([0.67, 0.83, 1, 1.17, 1.33].map(f => Math.max(1, Math.round(P.lts * f))))];
  const pv = [...new Set([0.7, 0.85, 1, 1.15, 1.3].map(f => Math.max(50, Math.round(P.precio * f / 50) * 50)))];
  return {lv, pv, cells:pv.map(pr => lv.map(l => compute({...P, lts:l, precio:pr}).pbSimple))};
}

/* Texto del veredicto (mismo mensaje en pantalla, PDF y Excel) */
function verdict(r){
  const P = r.P;
  if (r.sem === 'g') return {t:'La inversión se paga rápido', m:`Recupera la inversión en ${yrs(r.pbSimple)} y deja ${mill(r.ben.neto)} al año. A ${pct(P.tasa)} de tasa, el valor presente neto es positivo: la inversión crea valor.`};
  if (r.sem === 'y') return {t:'La inversión se paga dentro de la vida del equipo', m:`Recupera la inversión en ${yrs(r.pbSimple)}, antes de que termine la vida útil (${P.vida} años). Revise que los beneficios sean realistas para su finca.`};
  if (r.pbSimple == null) return {t:'Con estos datos, la inversión no se paga', m:'Los beneficios esperados no cubren el mantenimiento del equipo. Revise los supuestos o considere un nivel de automatización menor.'};
  return {t:'La inversión tarda mucho en pagarse', m:`Recupera la inversión en ${yrs(r.pbSimple)}${r.van <= 0 ? ' y, a ' + pct(P.tasa) + ' de tasa, no crea valor (valor presente neto negativo)' : ''}. Revise los supuestos o el nivel de automatización.`};
}

/* Validación: errores impiden calcular; avisos solo advierten */
function validate(p){
  const P = {...DEF, ...p}, errs = [], warns = [];
  for (const r of ROWS) {
    if (!r.k) continue;
    const v = P[r.k];
    if (!isFinite(v) || v < r.min || v > r.max) errs.push(`«${r.l}» está fuera del rango permitido.`);
  }
  if (P.dconc > P.conc) errs.push('No se puede reducir más concentrado del que se da hoy.');
  if (P.bord > P.ord) warns.push(`Se reducen ${P.bord} ordeñadores pero hoy hay ${P.ord}: se cuentan solo ${P.ord}.`);
  if (P.bmast > P.mast) warns.push('La reducción de mastitis es mayor que la mastitis actual: se cuenta solo hasta la actual.');
  if (P.bprod > 0 && P.cmargAuto === false && P.cmarg === 0 && P.lts > 0) warns.push(`La leche extra se valora a precio completo, sin costo de alimento. Para ser conservador, escriba en «Alimento extra por litro adicional» el costo de concentrado por litro de hoy: ${money(Math.round(P.pconc * P.conc / P.lts))}.`);
  if (effCmarg(P) >= P.precio && P.bprod > 0) warns.push('El alimento extra por litro es igual o mayor al precio del litro: producir más no deja ganancia.');
  if (P.bprod > 0.15) warns.push('Un aumento de leche mayor al 15 % es poco común solo por automatizar el ordeño. Verifíquelo.');
  if (P.fpct > 0 && P.fplazo > P.vida) warns.push('El plazo del crédito es mayor que la vida útil del equipo.');
  return {errs, warns};
}

const API = {LEVELS, LEVEL_GUIDE, DEF, ROWS, PB_OK, PB_WARN, SCEN, nf, money, mill, pct, yrs, parse, pmt, npv, irr, crossing,
             compute, scenarios, sensitivity, verdict, validate, autoCmarg, effCmarg};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.RM = API;
})(typeof window !== 'undefined' ? window : globalThis);
