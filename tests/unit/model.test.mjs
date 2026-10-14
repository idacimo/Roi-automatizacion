import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../js/model.js');

const near = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test('reproduce la versión 4 con 305 días y sin mantenimiento', () => {
  /* Escenario «Inversión baja» de la v4: beneficio total $63,86 M */
  const r = M.compute({dias:305, mant:0, conc:5, dconc:0});
  near(r.ben.elec, 2628000 * 305 / 365);              // la v4 usaba 365 días solo para la electricidad
  near(r.ben.prod, 59292000);
  near(r.ben.mast, 1944000);
  near(r.ben.mo, 0);
  const v4elec = 4 * 0.15 * 12000 * 365;
  const v4total = v4elec + 59292000 + 1944000;
  near(r.ben.bruto + (v4elec - r.ben.elec), v4total);
  near(v4total, 63864000);
});

test('beneficios con los valores por defecto (365 días, mantenimiento 2 %)', () => {
  const r = M.compute({});
  near(r.ben.elec, 4 * 0.15 * 12000 * 365);
  near(r.ben.prod, 200 * 18 * 0.03 * 365 * 1800);
  near(r.ben.mast, 200 * 0.03 * 180 * 1800);
  near(r.ben.mant, 80e6 * 0.02);
  near(r.ben.neto, r.ben.bruto - 1.6e6);
  near(r.pbSimple, 80e6 / r.ben.neto, 1e-9);
});

test('VPN, TIR y recuperación descontada son coherentes', () => {
  const r = M.compute({});
  let v = -80e6;
  for (let y = 1; y <= 10; y++) v += r.ben.neto / Math.pow(1.12, y);
  near(r.van, v, 1e-3);
  near(M.npv(r.tir, r.flows), 0, 1e-2);
  assert.ok(r.pbDesc > r.pbSimple, 'la recuperación descontada tarda más que la simple');
  assert.equal(r.years.length, 10);
  near(r.years.at(-1).cum, -80e6 + 10 * r.ben.neto, 1e-3);
});

test('valor de rescate entra en el último año', () => {
  const a = M.compute({resid:0}), b = M.compute({resid:0.1});
  near(b.years.at(-1).flujo - a.years.at(-1).flujo, 8e6, 1e-6);
  near(b.van - a.van, 8e6 / Math.pow(1.12, 10), 1e-3);
});

test('crédito: cuota francesa y saldo en cero al final del plazo', () => {
  const r = M.compute({fpct:0.5, ftasa:0.15, fplazo:5});
  near(r.cuota, M.pmt(0.15, 5, 40e6), 1e-6);
  near(r.years[4].saldo, 0, 1e-3);
  near(r.years[5].pago, 0);
  const pagado = r.years.reduce((s, y) => s + y.pago, 0);
  near(pagado, r.cuota * 5, 1e-3);
  near(r.years[0].interes, 40e6 * 0.15, 1e-6);
});

test('no paga: beneficios menores que el mantenimiento', () => {
  const r = M.compute({bprod:0, bmast:0, reduc:0, dconc:0, bord:0, mant:0.05});
  assert.equal(r.pbSimple, null);
  assert.equal(r.sem, 'r');
  assert.equal(M.verdict(r).t, 'Con estos datos, la inversión no se paga');
});

test('alimento extra por litro descuenta el valor de la leche adicional', () => {
  const a = M.compute({}), b = M.compute({cmarg:333});
  near(a.ben.prod - b.ben.prod, 200 * 18 * 0.03 * 365 * 333);
  assert.ok(M.validate({}).warns.some(w => w.includes('precio completo')));
  assert.ok(!M.validate({cmarg:333}).warns.some(w => w.includes('precio completo')));
});

test('no se reducen más ordeñadores ni más mastitis de los que hay', () => {
  const r = M.compute({ord:2, bord:5, mast:0.05, bmast:0.2});
  near(r.ben.mo, 2 * 2200000 * 12);
  near(r.ben.mast, 200 * 0.05 * 180 * 1800);
});

test('escenarios y sensibilidad', () => {
  const s = M.scenarios({});
  assert.deepEqual(s.map(x => x.k), ['pes', 'esp', 'opt']);
  assert.ok(s[0].r.pbSimple > s[1].r.pbSimple && s[1].r.pbSimple > s[2].r.pbSimple);
  const t = M.sensitivity({});
  assert.equal(t.cells.length, t.pv.length);
  assert.ok(t.pv.includes(1800) && t.lv.includes(18));
});

test('parse acepta formatos colombianos e internacionales', () => {
  assert.equal(M.parse('15.000'), 15000);
  assert.equal(M.parse('3,9'), 3.9);
  assert.equal(M.parse('1.234,5'), 1234.5);
  assert.equal(M.parse('1,234.5'), 1234.5);
  assert.equal(M.parse('$ 80.000.000'), 80000000);
  assert.equal(M.parse('12 %'), 12);
  assert.ok(Number.isNaN(M.parse('')));
});

test('niveles: el concentrado solo cambia con el sistema completo', () => {
  assert.equal(M.LEVELS.basico.dconc, 0);
  assert.equal(M.LEVELS.medicion.dconc, 0);
  assert.ok(M.LEVELS.completo.dconc > 0);
});
