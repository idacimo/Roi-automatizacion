// Pruebas de punta a punta: npm run test:e2e
import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

const noHScroll = async page => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

test('modo básico: tres pasos, resultados y descargas', async ({ page }) => {
  await page.fill('#s-finca', 'La Esperanza');
  await page.fill('#s-vacas', '120');
  await page.click('.step[data-step="1"] [data-go="2"]');
  await expect(page.locator('.step[data-step="2"]')).toBeVisible();
  await page.click('[data-nivel="medicion"]');
  await expect(page.locator('#s-inv')).toHaveValue('150');
  await page.fill('#s-inv', '140');
  await page.click('.step[data-step="2"] [data-go="3"]');
  await expect(page.locator('.r-head')).toBeVisible();
  const st = await page.evaluate(() => window.APP.S);
  expect(st.vacas).toBe(120); expect(st.inv).toBe(140e6); expect(st.nivel).toBe('medicion'); expect(st.bord).toBe(1);
  const r = await page.evaluate(() => window.APP.report().r);
  await expect(page.locator('.kpi b').first()).toHaveText(new Intl.NumberFormat('es-CO', {minimumFractionDigits:1, maximumFractionDigits:1}).format(r.pbSimple));
  await expect(page.locator('#s-result svg')).toBeVisible();
  await noHScroll(page);

  // Excel
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="xlsx"]')]);
  expect(dx.suggestedFilename()).toMatch(/^roi_automatizacion_ordeno_La_Esperanza_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await readFile(await dx.path()));
  expect(wb.worksheets.map(w => w.name)).toEqual(['Resumen', 'Parámetros', 'Flujo de caja', 'Escenarios', 'Sensibilidad', 'Gráfico']);
  const par = wb.getWorksheet('Parámetros');
  expect(par.getCell('B9').value).toBe(120);                               // vacas
  const res = wb.getWorksheet('Resumen');
  const neto = [...Array(40).keys()].map(i => res.getRow(i + 1)).find(row => row.getCell(1).value === 'Beneficio neto al año');
  expect(neto.getCell(2).value.formula).toBe('b_bruto+b_mant');
  expect(Math.abs(neto.getCell(2).value.result - r.ben.neto)).toBeLessThan(1);
  const fl = wb.getWorksheet('Flujo de caja');
  expect(fl.getCell('F9').value.result).toBe(-140e6);
  expect(fl.getCell('G19').value.formula).toBe('G18+F19');
  expect(Math.abs(fl.getCell('G19').value.result - r.years[9].cum)).toBeLessThan(1);

  // PDF
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="pdf"]')]);
  expect(dp.suggestedFilename()).toMatch(/\.pdf$/);
  const pdf = await readFile(await dp.path());
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const pages = (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
  expect(pages).toBeGreaterThanOrEqual(2);
  expect(pages).toBeLessThanOrEqual(4);
});

test('modo básico: datos inválidos no dejan avanzar', async ({ page }) => {
  await page.fill('#s-lts', '0');
  await expect(page.locator('#s-lts')).toHaveClass(/bad/);
  await page.click('.step[data-step="1"] [data-go="2"]');
  await page.click('.step[data-step="2"] [data-go="3"]');
  await expect(page.locator('.step[data-step="3"]')).toBeHidden();
});

test('modo completo: crédito, escenarios, sensibilidad y descargas', async ({ page }) => {
  await page.click('.modes [data-mode="full"]');
  await expect(page.locator('#kgrid .kbox')).toHaveCount(6);
  await page.fill('#p-fpct', '50');
  await page.fill('#p-resid', '10');
  await expect(page.locator('#kgrid .kbox')).toHaveCount(7);
  await expect(page.locator('#flow thead th')).toHaveCount(10);
  await expect(page.locator('#flow tbody tr')).toHaveCount(11);
  await expect(page.locator('#scen tbody tr')).toHaveCount(3);
  await expect(page.locator('#sens td.cur')).toHaveCount(1);
  await page.selectOption('#nivel', 'completo');
  await expect(page.locator('#p-inv')).toHaveValue('300.000.000');
  await page.fill('#p-dconc', '9');
  await expect(page.locator('#errors .alert').first()).toContainText('concentrado');
  await page.fill('#p-dconc', '1');
  await expect(page.locator('#errors .alert:not(.warn)')).toHaveCount(0);
  await noHScroll(page);
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.full-bar [data-action="xlsx"]')]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await readFile(await dx.path()));
  expect(wb.getWorksheet('Flujo de caja').getCell('M9').value.result).toBe(150e6);
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('.full-bar [data-action="pdf"]')]);
  expect((await readFile(await dp.path())).subarray(0, 5).toString()).toBe('%PDF-');
});

test('guarda los datos en el dispositivo y los borra', async ({ page }) => {
  await page.fill('#s-vacas', '75');
  await page.reload();
  await expect(page.locator('#s-vacas')).toHaveValue('75');
  page.once('dialog', d => d.accept());
  await page.click('#wipe');
  await expect(page.locator('#s-vacas')).toHaveValue('200');
});

test('alimento extra por litro: automático, manual y de vuelta a automático', async ({ page }) => {
  await page.click('.modes [data-mode="full"]');
  await expect(page.locator('#p-cmarg')).toHaveValue('528');          // 1.900 × 5 ÷ 18
  await expect(page.locator('#cmargAuto')).toBeHidden();
  await page.fill('#p-lts', '25');
  await expect(page.locator('#p-cmarg')).toHaveValue('380');          // 1.900 × 5 ÷ 25
  await page.fill('#p-cmarg', '0');
  await expect(page.locator('#cmargAuto')).toBeVisible();
  await expect(page.locator('#errors .alert.warn')).toContainText('precio completo');
  await page.click('#cmargAuto');
  await expect(page.locator('#p-cmarg')).toHaveValue('380');
  await expect(page.locator('#cmargAuto')).toBeHidden();
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.full-bar [data-action="xlsx"]')]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await readFile(await dx.path()));
  let f = null;
  wb.getWorksheet('Parámetros').eachRow(r => r.eachCell(c => { if (c.value && c.value.formula && c.value.formula.includes('p_pconc')) f = c.value; }));
  expect(f.formula).toBe('p_pconc*p_conc/p_lts');
  expect(Math.round(f.result)).toBe(380);
});
