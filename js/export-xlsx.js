/* Retorno de la automatización del ordeño | Datavet — Excel con marca Datavet y FÓRMULAS VIVAS (ExcelJS, todo en el navegador)
   Hojas: Resumen · Parámetros (editables) · Flujo de caja · Escenarios · Sensibilidad · Gráfico.
   Cada fórmula lleva el resultado ya calculado, para que se vea bien aun en visores de celular que no recalculan. */
'use strict';
(function () {
const {ROWS, nf} = window.RM;

const NAVY = 'FF07193F', GREEN = 'FF209B6C', LINE = 'FFE0E0E0', ALT = 'FFF5F5F5', MUTED = 'FF4F5B73', WHITE = 'FFFFFFFF';
const RED_T = 'FFB00218', GREEN_T = 'FF17784F', INPUT = 'FFEAF7F0', INPUT_B = 'FF8CC9AE';
const FONT = 'Jost';
const fill = argb => ({type:'pattern', pattern:'solid', fgColor:{argb}});
const thin = argb => ({style:'thin', color:{argb}});
const F = {money:'"$" #,##0;-"$" #,##0', int:'#,##0', d1:'#,##0.0', d2:'#,##0.00', pct:'0.0%', pct0:'0%', yrs:'0.0" años"', lts:'#,##0" L"'};
const FMT = {int:F.int, d1:F.d1, money:F.money, pct:F.pct};

async function exportXlsx(rep, fileName, loadScript){
  await loadScript('vendor/exceljs.min.js');
  const {r, S} = rep, P = r.P;
  const wb = new window.ExcelJS.Workbook();
  wb.creator = 'Datavet · Iván Darío Cifuentes Moreno';
  wb.title = 'Retorno de la automatización del ordeño';
  wb.company = 'Datavet';
  wb.created = new Date();
  wb.calcProperties = {fullCalcOnLoad:true};
  const logoId = wb.addImage({base64:await window.DVC.fetchB64('assets/logo-datavet-negativo.png'), extension:'png'});
  const metaLine = [`Finca: ${rep.finca || 'sin nombre'}`, rep.fechaTxt ? `Fecha: ${rep.fechaTxt}` : '', `Nivel: ${rep.level.name}`].filter(Boolean).join('   ·   ');

  function sheet(name, title, widths, landscape = false){
    const ws = wb.addWorksheet(name, {
      properties:{tabColor:{argb:name === 'Resumen' ? GREEN : NAVY}, defaultRowHeight:18},
      views:[{showGridLines:false}],
      pageSetup:{paperSize:1, orientation:landscape ? 'landscape' : 'portrait', fitToPage:true, fitToWidth:1, fitToHeight:0,
                 horizontalCentered:true, margins:{left:0.5, right:0.5, top:0.75, bottom:0.75, header:0.3, footer:0.3}},
      headerFooter:{
        oddHeader:`&L&"${FONT},Bold"&10Datavet&R&"${FONT},Regular"&9Retorno de la automatización del ordeño · ${title}`,
        oddFooter:`&L&"${FONT},Regular"&7Iván Darío Cifuentes Moreno · Datavet — Analizar para innovar, innovar para evolucionar · Medellín, Colombia&R&"${FONT},Regular"&8Página &P de &N`
      }
    });
    ws.columns = widths.map(w => ({width:w}));
    const n = widths.length;
    [30, 22, 26, 20].forEach((h, i) => { const row = ws.getRow(i + 1); row.height = h; for (let c = 1; c <= n; c++) row.getCell(c).fill = fill(NAVY); });
    ws.addImage(logoId, {tl:{col:0.12, row:0.25}, ext:{width:150, height:51}, editAs:'absolute'});
    const brand = ws.getCell(1, n);
    brand.value = 'Retorno de la automatización del ordeño';
    brand.font = {name:FONT, size:10, color:{argb:'FFB9C7DA'}}; brand.alignment = {horizontal:'right', vertical:'middle'};
    const t = ws.getCell(3, 1); t.value = title; t.font = {name:FONT, size:15, bold:true, color:{argb:WHITE}}; t.alignment = {vertical:'middle'};
    const m = ws.getCell(4, 1); m.value = metaLine; m.font = {name:FONT, size:10, color:{argb:'FFDDE6F0'}}; m.alignment = {vertical:'top'};
    const sep = ws.getRow(5); sep.height = 4; for (let c = 1; c <= n; c++) sep.getCell(c).fill = fill(GREEN);
    ws.getRow(6).height = 10;
    ws.__n = n;
    return ws;
  }
  function head(ws, r0, labels, aligns = []){
    const row = ws.getRow(r0); row.height = 30;
    labels.forEach((h, j) => {
      const c = row.getCell(j + 1);
      c.value = h; c.font = {name:FONT, size:10, bold:true, color:{argb:WHITE}}; c.fill = fill(NAVY);
      c.alignment = {horizontal:aligns[j] || (j === 0 ? 'left' : 'right'), vertical:'middle', wrapText:true};
    });
  }
  const style = (cell, {fmt, bold, color, bg, align, italic, size} = {}) => {
    cell.font = {name:FONT, size:size || 10, bold:!!bold, italic:!!italic, color:{argb:color || NAVY}};
    if (fmt) cell.numFmt = fmt;
    if (bg) cell.fill = fill(bg);
    cell.alignment = {horizontal:align || (typeof cell.value === 'string' ? 'left' : 'right'), vertical:'middle', wrapText:align === 'left'};
    cell.border = {bottom:thin(LINE)};
  };
  function note(ws, row, text, opts = {}){
    ws.mergeCells(row, 1, row, ws.__n);
    const c = ws.getCell(row, 1);
    c.value = text;
    c.font = {name:FONT, size:opts.size || 10, italic:!!opts.italic, bold:!!opts.bold, color:{argb:opts.color || MUTED}};
    c.alignment = {wrapText:true, vertical:'top'};
    const chars = ws.columns.reduce((a, col) => a + (col.width || 10), 0);
    ws.getRow(row).height = Math.max(16, Math.ceil(text.length / (chars * 1.05)) * 14 + 4);
    return row;
  }
  function footer(ws, row){
    const c = note(ws, row + 2, window.DVC.FOOTER, {size:9});
    ws.getCell(c, 1).border = {top:thin(GREEN)};
    const chars = ws.columns.reduce((a, col) => a + (col.width || 10), 0) * 1.15;
    ws.getRow(c).height = window.DVC.FOOTER_LINES.reduce((a, l) => a + Math.ceil(l.length / chars), 0) * 12.5 + 6;
  }
  const fx = (formula, result) => ({formula, result: typeof result === 'number' && !isFinite(result) ? undefined : result});

  /* Nombres definidos de los parámetros (p_vacas…): se calculan antes para crear las hojas en orden */
  const NAME = {}, PROW = {};
  {
    let row = 8;
    for (const R of ROWS) { if (!R.g) { NAME[R.k] = 'p_' + R.k; PROW[R.k] = row; wb.definedNames.add(`'Parámetros'!$B$${row}`, NAME[R.k]); } row++; }
  }
  const n = k => NAME[k];

  /* ===================== Resumen ===================== */
  const wsR = sheet('Resumen', 'Resumen del análisis', [44, 20, 50]);
  const wsP = sheet('Parámetros', 'Parámetros (puede cambiarlos)', [50, 20, 14, 56]);
  {
    head(wsP, 7, ['Parámetro', 'Valor', 'Unidad', 'Nota'], ['left', 'right', 'left', 'left']);
    let row = 8;
    for (const R of ROWS) {
      if (R.g) {
        wsP.mergeCells(row, 1, row, 4);
        const c = wsP.getCell(row, 1); c.value = R.g;
        c.font = {name:FONT, size:10.5, bold:true, color:{argb:GREEN_T}}; c.border = {bottom:thin(GREEN)};
        wsP.getRow(row).height = 22; row++; continue;
      }
      const a = wsP.getCell(row, 1), v = wsP.getCell(row, 2), u = wsP.getCell(row, 3), h = wsP.getCell(row, 4);
      a.value = R.l; v.value = S[R.k]; u.value = R.t === 'pct' ? '' : R.u; h.value = R.h || '';
      style(a); style(u, {color:MUTED, align:'left'}); style(h, {color:MUTED, align:'left', size:9});
      style(v, {fmt:FMT[R.t] || F.d1, bold:true, bg:INPUT});
      v.border = {top:thin(INPUT_B), bottom:thin(INPUT_B), left:thin(INPUT_B), right:thin(INPUT_B)};
      v.dataValidation = {type:'decimal', operator:'between', allowBlank:false, formulae:[R.min, R.max], showErrorMessage:true,
                          errorTitle:'Valor fuera de rango', error:`Escriba un valor entre ${R.min} y ${R.max}.`};
      row++;
    }
    note(wsP, row + 1, 'Las celdas verdes son editables: al cambiarlas se recalculan el Resumen y el Flujo de caja (VPN y TIR incluidos). Los porcentajes se escriben como porcentaje (12 %). Si cambia la vida útil, el Flujo de caja muestra solo los años que se descargaron; descargue de nuevo desde la calculadora para ver otro número de años.', {italic:true, size:9});
    footer(wsP, row + 1);
  }
  const B = {};   // celdas de beneficio con nombre
  {
    let row = 7;
    wsR.mergeCells(row, 1, row, 3);
    const v = wsR.getCell(row, 1);
    v.value = rep.verdict.t; v.font = {name:FONT, size:14, bold:true, color:{argb:{g:GREEN_T, y:'FF8A5A00', r:RED_T}[r.sem]}};
    wsR.getRow(row).height = 24;
    note(wsR, ++row, rep.verdict.m, {color:NAVY});
    row += 2;

    head(wsR, row, ['¿De dónde sale el beneficio? (al año)', 'Valor', 'Detalle'], ['left', 'right', 'left']);
    const items = [
      ['elec', 'Energía y tiempo de ordeño', `${n('horas')}*${n('reduc')}*${n('celec')}*${n('dias')}`, r.ben.elec],
      ['prod', 'Más leche', `${n('vacas')}*${n('lts')}*${n('bprod')}*${n('dias')}*(${n('precio')}-${n('cmarg')})`, r.ben.prod],
      ['conc', 'Concentrado', `${n('vacas')}*${n('dconc')}*${n('dias')}*${n('pconc')}`, r.ben.conc],
      ['mo', 'Mano de obra', `MIN(${n('bord')},${n('ord')})*${n('sal')}*12`, r.ben.mo],
      ['mast', 'Menos mastitis', `${n('vacas')}*MIN(${n('bmast')},${n('mast')})*${n('lmast')}*${n('precio')}`, r.ben.mast]
    ];
    const det = Object.fromEntries(rep.items.map(i => [i.k, i.d]));
    for (const [k, l, f, val] of items) {
      row++;
      wsR.getCell(row, 1).value = l; style(wsR.getCell(row, 1));
      wsR.getCell(row, 2).value = fx(f, val); style(wsR.getCell(row, 2), {fmt:F.money});
      wsR.getCell(row, 3).value = det[k]; style(wsR.getCell(row, 3), {color:MUTED, align:'left'});
      B[k] = `'Resumen'!$B$${row}`;
    }
    const first = row - 4;
    row++;
    wsR.getCell(row, 1).value = 'Beneficio bruto'; style(wsR.getCell(row, 1), {bold:true});
    wsR.getCell(row, 2).value = fx(`SUM(B${first}:B${row - 1})`, r.ben.bruto); style(wsR.getCell(row, 2), {fmt:F.money, bold:true});
    wb.definedNames.add(`'Resumen'!$B$${row}`, 'b_bruto');
    row++;
    wsR.getCell(row, 1).value = 'Mantenimiento del equipo'; style(wsR.getCell(row, 1));
    wsR.getCell(row, 2).value = fx(`-${n('inv')}*${n('mant')}`, -r.ben.mant); style(wsR.getCell(row, 2), {fmt:F.money, color:RED_T});
    wsR.getCell(row, 3).value = det.mant; style(wsR.getCell(row, 3), {color:MUTED, align:'left'});
    wb.definedNames.add(`'Resumen'!$B$${row}`, 'b_mant');
    row++;
    wsR.getCell(row, 1).value = 'Beneficio neto al año'; style(wsR.getCell(row, 1), {bold:true});
    wsR.getCell(row, 2).value = fx('b_bruto+b_mant', r.ben.neto); style(wsR.getCell(row, 2), {fmt:F.money, bold:true});
    [1, 2, 3].forEach(c => { wsR.getCell(row, c).border = {top:{style:'medium', color:{argb:GREEN}}, bottom:thin(LINE)}; });
    wb.definedNames.add(`'Resumen'!$B$${row}`, 'b_neto');
    row += 2;

    head(wsR, row, ['Indicador', 'Valor', 'Qué significa'], ['left', 'right', 'left']);
    const last = P.vida + 1;   // fila del flujo en la hoja Flujo de caja: año 0 en fila 9
    const kp = [
      ['Recuperación simple', fx(`IF(b_neto>0,${n('inv')}/b_neto,"No se recupera")`, r.pbSimple == null ? 'No se recupera' : r.pbSimple), F.yrs, 'Inversión ÷ beneficio neto anual'],
      ['Valor presente neto (VPN)', fx(`'Flujo de caja'!F9+NPV(${n('tasa')},'Flujo de caja'!F10:F${8 + last})`, r.van), F.money, `Mayor que cero: la inversión crea valor a la tasa exigida`],
      ['Tasa interna de retorno (TIR)', fx(`IFERROR(IRR('Flujo de caja'!F9:F${8 + last}),"–")`, r.tir == null ? '–' : r.tir), F.pct, 'Rentabilidad anual del proyecto; compárela con la tasa exigida'],
      ['ROI anual', fx(`b_neto/${n('inv')}`, r.roi), F.pct, 'Beneficio neto anual ÷ inversión'],
      ['Beneficio por litro vendido', fx(`b_neto/(${n('vacas')}*${n('lts')}*${n('dias')})`, r.porLitro), '"$" #,##0.0', 'Cuánto aporta la automatización por cada litro'],
      ['Beneficio por vaca al año', fx(`b_neto/${n('vacas')}`, r.porVaca), F.money, ''],
      ['Recuperación descontada', r.pbDesc == null ? `Más de ${P.vida} años` : r.pbDesc, F.yrs, 'Calculada al descargar; vea la columna «Descontado acumulado» del Flujo de caja']
    ];
    for (const [l, val, fmt, d] of kp) {
      row++;
      wsR.getCell(row, 1).value = l; style(wsR.getCell(row, 1));
      wsR.getCell(row, 2).value = val; style(wsR.getCell(row, 2), {fmt, bold:true});
      wsR.getCell(row, 3).value = d; style(wsR.getCell(row, 3), {color:MUTED, align:'left'});
    }
    row += 2;
    head(wsR, row, ['Situación actual sin automatizar', 'Al año', 'Cómo se calcula'], ['left', 'right', 'left']);
    const baseF = [
      [`${n('vacas')}*${n('lts')}*${n('dias')}*${n('precio')}`, r.base.ingreso],
      [`-${n('vacas')}*${n('conc')}*${n('dias')}*${n('pconc')}`, -r.base.conc],
      [`-${n('ord')}*${n('sal')}*12`, -r.base.mo],
      [`-${n('vacas')}*${n('mast')}*${n('lmast')}*${n('precio')}`, -r.base.mast],
      [`-${n('horas')}*${n('celec')}*${n('dias')}`, -r.base.elec]
    ];
    const b0 = row + 1;
    rep.base.forEach(([l, , d], i) => {
      row++;
      wsR.getCell(row, 1).value = l; style(wsR.getCell(row, 1), {bold:i === 5});
      wsR.getCell(row, 2).value = i < 5 ? fx(...baseF[i]) : fx(`SUM(B${b0}:B${row - 1})`, r.base.margen);
      style(wsR.getCell(row, 2), {fmt:F.money, bold:i === 5});
      wsR.getCell(row, 3).value = d; style(wsR.getCell(row, 3), {color:MUTED, align:'left'});
    });
    note(wsR, row + 2, 'Valores antes de impuestos y a precios constantes. Herramienta de apoyo a la decisión: valide los beneficios con su asesor técnico y la cotización del proveedor.', {italic:true, size:9});
    footer(wsR, row + 2);
  }

  /* ===================== Flujo de caja ===================== */
  {
    const ws = sheet('Flujo de caja', 'Flujo de caja año por año', [8, 16, 16, 14, 14, 16, 16, 16, 16, 14, 14, 14, 16, 16], true);
    head(ws, 8, ['Año', 'Beneficio bruto', 'Mantenimiento', 'Rescate', 'Inversión', 'Flujo neto', 'Acumulado', 'Descontado', 'Desc. acumulado',
                 'Cuota crédito', 'Intereses', 'Abono capital', 'Saldo crédito', 'Flujo con crédito'], ['center']);
    const loan0 = r.loan;
    for (let y = 0; y <= P.vida; y++) {
      const row = 9 + y, t = r.years[y - 1], R0 = row - 1;
      const c = col => ws.getCell(row, col);
      c(1).value = y;
      if (y === 0) {
        c(2).value = 0; c(3).value = 0; c(4).value = 0;
        c(5).value = fx(`-${n('inv')}`, -P.inv);
        c(6).value = fx(`SUM(B${row}:E${row})`, -P.inv);
        c(7).value = fx(`F${row}`, -P.inv);
        c(8).value = fx(`F${row}`, -P.inv); c(9).value = fx(`H${row}`, -P.inv);
        c(10).value = 0; c(11).value = 0; c(12).value = 0;
        c(13).value = fx(`${n('inv')}*${n('fpct')}`, loan0);
        c(14).value = fx(`F${row}+M${row}`, -(P.inv - loan0));
      } else {
        c(2).value = fx('b_bruto', t.beneficio);
        c(3).value = fx('b_mant', -t.mant);
        c(4).value = fx(`IF(A${row}=${n('vida')},${n('inv')}*${n('resid')},0)`, t.rescate);
        c(5).value = 0;
        c(6).value = fx(`SUM(B${row}:E${row})`, t.flujo);
        c(7).value = fx(`G${R0}+F${row}`, t.cum);
        c(8).value = fx(`F${row}/(1+${n('tasa')})^A${row}`, t.desc);
        c(9).value = fx(`I${R0}+H${row}`, t.dcum);
        c(10).value = fx(`IF(AND(A${row}<=${n('fplazo')},M$9>0),PMT(${n('ftasa')},${n('fplazo')},-M$9),0)`, t.pago);
        c(11).value = fx(`IF(J${row}>0,M${R0}*${n('ftasa')},0)`, t.interes);
        c(12).value = fx(`J${row}-K${row}`, t.abono);
        c(13).value = fx(`MAX(0,M${R0}-L${row})`, t.saldo);
        c(14).value = fx(`F${row}-J${row}`, t.conCredito);
      }
      for (let k = 1; k <= 14; k++) {
        const cell = c(k);
        style(cell, {fmt:k === 1 ? '0' : F.money, align:k === 1 ? 'center' : 'right', bg:y % 2 ? ALT : WHITE});
      }
      [7, 9, 14].forEach(k => {
        const v = y === 0 ? (k === 14 ? -(P.inv - loan0) : -P.inv) : (k === 7 ? t.cum : k === 9 ? t.dcum : t.conCredito);
        c(k).font = {name:FONT, size:10, bold:true, color:{argb:v >= 0 ? GREEN_T : RED_T}};
      });
    }
    ws.views = [{state:'frozen', ySplit:8, xSplit:1, topLeftCell:'B9', showGridLines:false}];
    ws.pageSetup.printTitlesRow = '8:8';
    const end = 9 + P.vida;
    note(ws, end + 2, 'Las columnas de crédito solo tienen valores si en Parámetros hay una parte de la inversión con crédito. Cuota fija anual (sistema francés). Los colores de los acumulados son los del momento de la descarga.', {italic:true, size:9});
    footer(ws, end + 2);
  }

  /* ===================== Escenarios ===================== */
  {
    const ws = sheet('Escenarios', 'Escenarios de beneficio', [16, 40, 18, 20, 20, 12]);
    head(ws, 7, ['Escenario', 'Supuesto', 'Recuperación', 'Beneficio neto/año', 'VPN', 'TIR']);
    rep.scen.forEach((s, i) => {
      const row = 8 + i, rr = s.r;
      const vals = [s.l, s.d, rr.pbSimple == null ? 'No se recupera' : rr.pbSimple, rr.ben.neto, rr.van, rr.tir == null ? '–' : rr.tir];
      const fmts = [null, null, F.yrs, F.money, F.money, F.pct];
      vals.forEach((v, j) => { const c = ws.getCell(row, j + 1); c.value = v; style(c, {fmt:fmts[j], bold:i === 1, bg:i % 2 ? ALT : WHITE, align:j < 2 ? 'left' : 'right'}); });
    });
    note(ws, 12, 'Pesimista: se logra el 60 % de los beneficios esperados; optimista: el 120 %. El mantenimiento no cambia entre escenarios. Valores calculados al descargar.', {italic:true, size:9});
    footer(ws, 12);
  }

  /* ===================== Sensibilidad ===================== */
  {
    const sn = rep.sens;
    const ws = sheet('Sensibilidad', 'Sensibilidad: años para recuperar la inversión', [22, ...sn.lv.map(() => 13)]);
    head(ws, 7, ['Precio del litro / Litros por vaca', ...sn.lv.map(l => `${nf(l, 0)} L`)]);
    const cc = pb => pb == null ? ['FFFDEDEC', 'FF922B21'] : pb <= 4 ? ['FFD5F5E3', 'FF1E5631'] : pb <= 8 ? ['FFFEF5E1', 'FF8A5A00'] : ['FFFDEDEC', 'FF922B21'];
    sn.pv.forEach((pr, i) => {
      const row = 8 + i;
      const a = ws.getCell(row, 1); a.value = pr; style(a, {fmt:F.money, bold:true, bg:'FFF1F6F3'});
      sn.cells[i].forEach((pb, j) => {
        const c = ws.getCell(row, j + 2); c.value = pb == null ? 'No se recupera' : Math.round(pb * 10) / 10;
        const [bg, fg] = cc(pb);
        style(c, {fmt:'0.0', bg, color:fg, bold:true, align:'center'});
      });
    });
    const end = 8 + sn.pv.length;
    note(ws, end + 1, 'Años para recuperar la inversión. Verde: hasta 4 años; ámbar: de 4 a 8; rojo: más de 8 o no se recupera. Calculado con los demás parámetros al momento de descargar.', {italic:true, size:9});
    footer(ws, end + 1);
  }

  /* ===================== Gráfico ===================== */
  {
    const ws = sheet('Gráfico', 'Flujo de caja acumulado', [14, 14, 14, 14, 14, 14, 14, 14, 14]);
    const png = await window.DVC.svgToPng(rep.chartSvg(960, 360), 960, 360);
    ws.addImage(wb.addImage({base64:png.split(',')[1], extension:'png'}), {tl:{col:0.2, row:6.5}, ext:{width:900, height:338}, editAs:'oneCell'});
    for (let k = 7; k <= 26; k++) ws.getRow(k).height = 18;
    note(ws, 27, 'Línea azul: flujo acumulado; cuando cruza el cero, la inversión se pagó. Línea verde punteada: acumulado descontado (VPN). Línea ámbar: acumulado con crédito, si lo hay.', {italic:true, size:9});
    footer(ws, 27);
  }

  const buf = await wb.xlsx.writeBuffer();
  window.DVC.saveBlob(new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), fileName);
  return wb;
}

window.DVX = {exportXlsx};
})();
