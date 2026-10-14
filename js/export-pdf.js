/* Retorno de la automatización del ordeño | Datavet — informe PDF tamaño carta (jsPDF + AutoTable, texto seleccionable) */
'use strict';
(function () {
const {nf, money, mill, pct, yrs} = window.RM;

const C = {navy:[7, 25, 63], green:[32, 155, 108], greenT:[23, 120, 79], redT:[176, 2, 24], amberT:[138, 90, 0], muted:[79, 91, 115],
           line:[224, 224, 224], alt:[245, 245, 245], wash:[241, 246, 243], light:[185, 199, 218], white:[255, 255, 255]};
const SEM = {g:[32, 155, 108], y:[245, 166, 35], r:[208, 2, 27]};
const CELL = {g:[[213, 245, 227], [30, 86, 49]], y:[[254, 245, 225], [138, 90, 0]], r:[[253, 237, 236], [146, 43, 33]]};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

async function exportPdf(rep, fileName, loadScript, asBlob = false){
  await loadScript('vendor/jspdf.umd.min.js');
  await loadScript('vendor/jspdf.plugin.autotable.min.js');
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'letter', orientation:'portrait', compress:true});
  const {r, S} = rep, P = r.P;
  doc.setProperties({title:'Retorno de la automatización del ordeño' + (rep.finca ? ' · ' + rep.finca : ''), author:'Datavet · Iván Darío Cifuentes Moreno',
                     subject:'Análisis de retorno de la inversión', creator:'Datavet'});

  /* Fuente Jost (marca Datavet) incrustada; si no se puede cargar, Helvetica con caracteres compatibles */
  let FN = 'Jost', SB = 'semibold';
  let clean = s => String(s).replace(/Σ/g, 'Suma de').replace(/ /g, ' ').replace(/ → /g, ' a ').replace(/→/g, 'a');
  try {
    const fonts = await Promise.all(['Regular', 'SemiBold', 'Bold'].map(w => window.DVC.fetchB64(`vendor/fonts/Jost-${w}.ttf`)));
    [['Regular', 'normal'], ['SemiBold', 'semibold'], ['Bold', 'bold']].forEach(([w, st], i) => {
      doc.addFileToVFS(`Jost-${w}.ttf`, fonts[i]); doc.addFont(`Jost-${w}.ttf`, 'Jost', st);
    });
  } catch (e) {
    FN = 'helvetica'; SB = 'bold';
    const c0 = clean;
    clean = s => c0(s).replace(/−/g, '-').replace(/–/g, '-').replace(/—/g, '-').replace(/[«»]/g, '"');
  }
  const font = (style = 'normal', size = 9, color = C.navy) => {
    doc.setFont(FN, style === 'semibold' ? SB : style);
    doc.setFontSize(size); doc.setTextColor(...color);
  };

  const W = 215.9, H = 279.4, ML = 14, MR = 14, CW = W - ML - MR, TOP2 = 24, BOT = 24;
  const logoNeg = 'data:image/png;base64,' + await window.DVC.fetchB64('assets/logo-datavet-negativo.png');
  const logoCol = 'data:image/png;base64,' + await window.DVC.fetchB64('assets/logo-datavet.png');
  const metaLine = [rep.finca || 'Finca sin nombre', rep.fechaTxt, rep.level.name].filter(Boolean).join('  ·  ');

  /* ---------- encabezado de la primera página ---------- */
  doc.setFillColor(...C.navy); doc.rect(0, 0, W, 31, 'F');
  doc.setFillColor(...C.green); doc.rect(0, 31, W, 1.3, 'F');
  doc.addImage(logoNeg, 'PNG', ML, 8.5, 42, 42 * 176 / 520);
  font('bold', 15, C.white); doc.text(clean('Retorno de la automatización del ordeño'), W - MR, 14.5, {align:'right'});
  font('normal', 9.3, C.light); doc.text(clean(metaLine), W - MR, 21.5, {align:'right'});
  let y = 41;

  const newPage = () => { doc.addPage(); y = TOP2 + 2; };
  const ensure = need => { if (y + need > H - BOT) newPage(); };
  const para = (text, size = 9.5, color = C.navy, style = 'normal', width = CW, x = ML, lh = 1.38) => {
    font(style, size, color);
    const lines = doc.splitTextToSize(clean(text), width);
    const step = size * 0.3528 * lh;
    ensure(lines.length * step);
    lines.forEach(l => { doc.text(l, x, y + size * 0.3528); y += step; });
    return lines.length * step;
  };
  const h2 = (text, need = 30) => {
    ensure(need + 9);
    font('bold', 12, C.navy); doc.text(clean(text), ML, y + 4.5);
    doc.setDrawColor(...C.green); doc.setLineWidth(0.7);
    doc.line(ML, y + 6.6, ML + doc.getTextWidth(clean(text)), y + 6.6);
    y += 10;
  };
  const tbl = (opts) => {
    doc.autoTable(Object.assign({
      startY:y, margin:{left:ML, right:MR, top:TOP2 + 2, bottom:BOT},
      theme:'plain', rowPageBreak:'avoid',
      styles:{font:FN, fontSize:8.4, textColor:C.navy, cellPadding:{top:1.5, bottom:1.5, left:2, right:2}, lineColor:C.line, valign:'middle', overflow:'linebreak'},
      headStyles:{fillColor:C.navy, textColor:C.white, fontStyle:SB, fontSize:8, halign:'right'},
      bodyStyles:{lineWidth:{bottom:0.2}},
      alternateRowStyles:{fillColor:C.alt},
      didParseCell:d => { if (d.column.index === 0) d.cell.styles.halign = 'left'; }
    }, opts));
    y = doc.lastAutoTable.finalY + 7;
  };

  /* ---------- veredicto ---------- */
  doc.setFillColor(...SEM[r.sem]); doc.circle(ML + 2.2, y + 2.6, 2.2, 'F');
  font('bold', 13.5, C.navy); doc.text(clean(rep.verdict.t), ML + 7, y + 4.3);
  y += 8.5;
  para(rep.verdict.m, 9.6, C.navy);
  y += 3.5;

  /* ---------- tarjetas ---------- */
  const cards = [
    ['Recuperación de la inversión', r.pbSimple == null ? 'No se recupera' : yrs(r.pbSimple), r.pbDesc != null ? `Descontada: ${yrs(r.pbDesc)}` : `Descontada: más de ${P.vida} años`, true],
    ['Beneficio neto al año', mill(r.ben.neto), `ROI anual ${pct(r.roi, 1)}`],
    [`VPN a ${P.vida} años (${pct(P.tasa)})`, mill(r.van), r.van > 0 ? 'Crea valor' : 'No crea valor a esta tasa'],
    ['TIR', r.tir == null ? '–' : pct(r.tir, 1), `Exigida: ${pct(P.tasa)}`],
    ['Inversión', mill(P.inv), rep.level.short],
    ['Por litro vendido', money(r.porLitro), `${money(r.porVaca)} por vaca al año`],
    ['Más leche al año', nf(r.litrosAno * P.bprod, 0) + ' L', `${nf(P.lts, 1)} → ${nf(r.ltsNew, 1)} L por vaca`],
    r.loan > 0 ? ['Cuota del crédito', mill(r.cuota), `${P.fplazo} años · ${pct(P.ftasa, 1)} E.A.`] : ['Mantenimiento al año', mill(r.ben.mant), `${pct(P.mant, 1)} de la inversión`]
  ];
  const gap = 3.2, kw = (CW - gap * 3) / 4, kh = 19;
  cards.forEach(([l, v, s, hl], i) => {
    const x = ML + (i % 4) * (kw + gap), yy = y + Math.floor(i / 4) * (kh + gap);
    doc.setFillColor(...(hl ? C.navy : C.wash)); doc.roundedRect(x, yy, kw, kh, 2, 2, 'F');
    doc.setFillColor(...(hl ? SEM[r.sem] : C.green)); doc.rect(x, yy + 2, 1.1, kh - 4, 'F');
    font('normal', 7.6, hl ? C.light : C.muted); doc.text(clean(l), x + 4, yy + 5.3);
    font('bold', 14.5, hl ? C.white : C.navy); doc.text(clean(v), x + 4, yy + 12.2);
    font('normal', 7.4, hl ? [102, 190, 143] : C.greenT); doc.text(clean(s), x + 4, yy + 16.4);
  });
  y += 2 * kh + gap + 7;

  /* ---------- de dónde sale el beneficio ---------- */
  h2('¿De dónde sale el beneficio?', 48);
  tbl({head:[['Concepto', 'Detalle', 'Valor al año']],
       body:rep.items.map(i => [i.l, i.d, mill(i.v)].map(clean)),
       foot:[['Beneficio neto al año', '', clean(mill(r.ben.neto))]], showFoot:'lastPage', pageBreak:'avoid',
       footStyles:{fontStyle:'bold', fillColor:C.white, textColor:C.navy, halign:'right', lineWidth:{top:0.5}, lineColor:C.green},
       columnStyles:{0:{halign:'left', cellWidth:56}, 1:{halign:'left', textColor:C.muted}, 2:{halign:'right', cellWidth:30}},
       didParseCell:d => {
         if (d.column.index < 2) d.cell.styles.halign = 'left';
         if (d.section === 'body' && d.column.index === 2 && rep.items[d.row.index].v < 0) { d.cell.styles.textColor = C.redT; d.cell.styles.fontStyle = 'bold'; }
       },
       didDrawCell:d => {
         if (d.section === 'body' && d.column.index === 0) { doc.setFillColor(...hex(rep.items[d.row.index].c)); doc.rect(d.cell.x + 0.4, d.cell.y + 1.2, 1, d.cell.height - 2.4, 'F'); }
       }});

  /* ---------- gráfica ---------- */
  h2('Flujo de caja acumulado', 66);
  const gw = 960, gh = 330;
  const png = await window.DVC.svgToPng(rep.chartSvg(gw, gh), gw, gh);
  const ph = CW * gh / gw;
  doc.addImage(png, 'PNG', ML, y - 2, CW, ph);
  y += ph;
  let lx = ML;
  [['Flujo acumulado', C.navy, false], ['Acumulado descontado (VPN)', C.green, true], ...(r.loan > 0 ? [['Acumulado con crédito', [245, 166, 35], false]] : [])].forEach(([t, c, dash]) => {
    doc.setDrawColor(...c); doc.setLineWidth(0.9);
    if (dash) { doc.line(lx, y - 1, lx + 2.5, y - 1); doc.line(lx + 3.8, y - 1, lx + 6.3, y - 1); } else doc.line(lx, y - 1, lx + 6.3, y - 1);
    font('normal', 7.8, C.navy); doc.text(clean(t), lx + 8, y);
    lx += 8 + doc.getTextWidth(clean(t)) + 7;
  });
  y += 4;
  para('Cuando la línea cruza el cero, la inversión ya se pagó. La línea punteada descuenta el valor del dinero en el tiempo.', 7.8, C.muted);
  y += 4;

  /* ---------- escenarios ---------- */
  h2('Escenarios: ¿y si los beneficios no son los esperados?', 30);
  tbl({head:[['Escenario', 'Supuesto', 'Recuperación', 'Beneficio neto/año', 'VPN', 'TIR']], body:rep.scenRows.map(row => row.map(clean)), pageBreak:'avoid',
       columnStyles:{0:{halign:'left', cellWidth:22}, 1:{halign:'left'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right'}},
       didParseCell:d => { if (d.column.index < 2) d.cell.styles.halign = 'left'; if (d.section === 'body' && d.row.index === 1) d.cell.styles.fontStyle = 'bold'; }});

  /* ---------- flujo anual ---------- */
  const credit = r.loan > 0;
  h2('Flujo de caja año por año', 30);
  const head = ['Año', 'Beneficio', 'Mantenim.', 'Rescate', 'Flujo neto', 'Acumulado', 'Desc. acumulado', ...(credit ? ['Cuota', 'Con crédito', 'Saldo'] : [])];
  const body = [['0', '', '', '', mill(-P.inv), mill(-P.inv), mill(-P.inv), ...(credit ? ['', mill(-(P.inv - r.loan)), mill(r.loan)] : [])]]
    .concat(r.years.map(t => [String(t.y), mill(t.beneficio), mill(-t.mant), t.rescate ? mill(t.rescate) : '', mill(t.flujo), mill(t.cum), mill(t.dcum),
      ...(credit ? [t.pago ? mill(-t.pago) : '', mill(t.conCredito), mill(t.saldo)] : [])]));
  const neg = (row, i) => /^−/.test(row[i]);
  tbl({head:[head], body:body.map(row => row.map(clean)),
       styles:{font:FN, fontSize:credit ? 7.2 : 8, textColor:C.navy, cellPadding:{top:1.2, bottom:1.2, left:1.5, right:1.5}, lineColor:C.line, valign:'middle'},
       headStyles:{fillColor:C.navy, textColor:C.white, fontStyle:SB, fontSize:credit ? 6.9 : 7.6, halign:'right'},
       columnStyles:{0:{halign:'center', cellWidth:10}},
       didParseCell:d => {
         d.cell.styles.halign = d.column.index === 0 ? 'center' : 'right';
         if (d.section === 'body' && [5, 6, 8].includes(d.column.index) && body[d.row.index][d.column.index]) {
           d.cell.styles.textColor = neg(body[d.row.index], d.column.index) ? C.redT : C.greenT; d.cell.styles.fontStyle = 'bold';
         }
       }});
  para(credit
    ? `Crédito de ${mill(r.loan)} (${pct(P.fpct)} de la inversión) a ${pct(P.ftasa, 1)} E.A. y ${P.fplazo} años, cuota fija de ${mill(r.cuota)} al año. La finca pone ${mill(P.inv - r.loan)} de contado.`
    : 'Sin crédito: toda la inversión se paga de contado en el año 0.', 8, C.muted);
  y += 4;

  /* ---------- sensibilidad ---------- */
  const sn = rep.sens;
  h2('Sensibilidad: años para recuperar la inversión', 22 + sn.pv.length * 5.2);
  para('Según el precio del litro (filas) y los litros por vaca al día (columnas). El recuadro marca la situación actual.', 8, C.muted);
  y += 1.5;
  const curL = sn.lv.reduce((a, b) => Math.abs(b - P.lts) < Math.abs(a - P.lts) ? b : a);
  const curP = sn.pv.reduce((a, b) => Math.abs(b - P.precio) < Math.abs(a - P.precio) ? b : a);
  const sc = pb => pb == null ? 'r' : pb <= 4 ? 'g' : pb <= 8 ? 'y' : 'r';
  tbl({head:[['Precio / Litros', ...sn.lv.map(l => nf(l, 0) + ' L')]],
       body:sn.pv.map((pr, i) => [money(pr), ...sn.cells[i].map(pb => pb == null ? '—' : nf(pb, 1))].map(clean)), pageBreak:'avoid',
       alternateRowStyles:{},
       columnStyles:{0:{halign:'left', cellWidth:30, fillColor:C.wash, fontStyle:SB}},
       didParseCell:d => {
         d.cell.styles.halign = d.column.index === 0 ? 'left' : 'center';
         if (d.section === 'body' && d.column.index > 0) {
           const [bg, tx] = CELL[sc(sn.cells[d.row.index][d.column.index - 1])];
           d.cell.styles.fillColor = bg; d.cell.styles.textColor = tx;
           if (sn.pv[d.row.index] === curP && sn.lv[d.column.index - 1] === curL) d.cell.styles.fontStyle = 'bold';
         }
       },
       didDrawCell:d => {
         if (d.section === 'body' && d.column.index > 0 && sn.pv[d.row.index] === curP && sn.lv[d.column.index - 1] === curL) {
           doc.setDrawColor(...C.navy); doc.setLineWidth(0.6); doc.rect(d.cell.x + 0.3, d.cell.y + 0.3, d.cell.width - 0.6, d.cell.height - 0.6);
         }
       }});
  {
    let x = ML;
    [['g', 'Hasta 4 años'], ['y', 'De 4 a 8 años'], ['r', 'Más de 8 años o no se recupera']].forEach(([k, t]) => {
      doc.setFillColor(...SEM[k]); doc.circle(x + 1.3, y - 6, 1.3, 'F');
      font('normal', 7.8, C.muted); doc.text(t, x + 4, y - 5);
      x += 10 + doc.getTextWidth(t);
    });
  }

  /* ---------- situación actual ---------- */
  h2('Situación actual sin automatizar', 44);
  tbl({head:[['Concepto', 'Al año', 'Cómo se calcula']], body:rep.base.map(row => row.map(clean)), pageBreak:'avoid',
       columnStyles:{0:{halign:'left', cellWidth:52}, 1:{halign:'right', cellWidth:28}, 2:{halign:'left', textColor:C.muted}},
       didParseCell:d => { d.cell.styles.halign = d.column.index === 1 ? 'right' : 'left'; if (d.section === 'body' && d.row.index === rep.base.length - 1) d.cell.styles.fontStyle = 'bold'; }});

  /* ---------- niveles ---------- */
  h2('¿Qué beneficios aplican según el nivel de automatización?', 44);
  {
    const keys = Object.keys(rep.levels), colW = (CW - 8) / 3, y0 = y;
    let yMax = y;
    keys.forEach((k, i) => {
      const x = ML + i * (colW + 4), on = k === S.nivel;
      y = y0 + 2;
      const hgt = 36;
      doc.setFillColor(...(on ? [234, 247, 240] : C.alt)); doc.roundedRect(x, y0, colW, hgt, 2, 2, 'F');
      if (on) { doc.setDrawColor(...C.green); doc.setLineWidth(0.5); doc.roundedRect(x, y0, colW, hgt, 2, 2, 'S'); }
      y += 1;
      para(rep.levels[k].name + (on ? '  (elegido)' : ''), 8.4, on ? C.greenT : C.navy, 'bold', colW - 6, x + 3, 1.25);
      y += 0.6;
      rep.guide[k].forEach(t => { para('•  ' + t, 7.4, C.navy, 'normal', colW - 6, x + 3, 1.25); });
      yMax = Math.max(yMax, y0 + hgt);
    });
    y = yMax + 7;
  }

  /* ---------- parámetros en dos columnas ---------- */
  const half = Math.ceil(rep.params.length / 2);
  h2('Parámetros usados', half * 4.6 + 8);
  {
    const y0 = y, colW = (CW - 6) / 2; let yMax = y;
    [rep.params.slice(0, half), rep.params.slice(half)].forEach((rows, k) => {
      y = y0;
      tbl({head:[['Parámetro', 'Valor']], body:rows.map(row => row.map(clean)), pageBreak:'avoid',
           margin:{left:ML + k * (colW + 6), right:k ? MR : MR + colW + 6, top:TOP2 + 2, bottom:BOT}, tableWidth:colW,
           styles:{font:FN, fontSize:7.5, textColor:C.navy, cellPadding:{top:0.8, bottom:0.8, left:1.8, right:1.8}, lineColor:C.line},
           columnStyles:{0:{halign:'left'}, 1:{halign:'right', cellWidth:30}}});
      yMax = Math.max(yMax, y);
    });
    y = yMax;
  }

  /* ---------- método y aviso ---------- */
  h2('Cómo calcula', 40);
  [
    'Más leche = vacas en ordeño × litros por vaca × % de aumento × días de ordeño × (precio del litro − alimento extra por litro).',
    'Menos mastitis = vacas × puntos de reducción de la incidencia × litros perdidos por caso × precio del litro.',
    'Concentrado = vacas × kg menos por vaca al día × días × precio del kg. Mano de obra = ordeñadores que se reducen × costo mensual × 12.',
    'Energía y tiempo = horas de ordeño × % menos de tiempo × costo de la sala por hora × días.',
    'Beneficio neto = suma de beneficios − mantenimiento anual (% de la inversión). El último año suma el valor de rescate.',
    'Recuperación simple = inversión ÷ beneficio neto. Recuperación descontada: año en que el flujo descontado acumulado llega a cero.',
    'VPN = −inversión + Σ flujo del año ÷ (1 + tasa) elevado al año. TIR: la tasa que hace el VPN igual a cero. Crédito con cuota fija anual (sistema francés).',
    'Valores antes de impuestos y a precios constantes. No incluye la depreciación contable, que no es salida de caja.'
  ].forEach(t => { para('•  ' + t, 8, C.navy); y += 0.5; });
  y += 2;
  para('Herramienta de apoyo a la decisión. Valide los beneficios con su asesor técnico y la cotización del proveedor. Este informe se generó en el dispositivo del usuario: Datavet no recibe ni guarda los datos de la finca.', 7.8, C.muted);

  /* ---------- encabezado (páginas 2+) y pie en todas ---------- */
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.addImage(logoCol, 'PNG', ML, 9, 28, 28 * 159 / 640);
      font('normal', 8.3, C.muted); doc.text(clean('Retorno de la automatización del ordeño · ' + metaLine), W - MR, 14, {align:'right'});
      doc.setDrawColor(...C.green); doc.setLineWidth(0.6); doc.line(ML, 18.5, W - MR, 18.5);
    }
    doc.setDrawColor(...C.green); doc.setLineWidth(0.4); doc.line(ML, H - 19, W - MR, H - 19);
    const [l1, l2] = window.DVC.FOOTER_LINES.map(clean);
    const [name, role] = l1.split(' — '), cut = l2.indexOf(' · ivan');
    font('semibold', 6.9, C.navy); doc.text(name, ML, H - 15);
    font('normal', 6.9, C.muted); doc.text(' — ' + role, ML + doc.getTextWidth(name) + 0.8, H - 15);
    doc.text(l2.slice(0, cut), ML, H - 11.6);
    doc.text(l2.slice(cut + 3), ML, H - 8.2);
    font('bold', 7.6, C.navy);
    doc.text(`Página ${p} de ${n}`, W - MR, H - 11.6, {align:'right'});
  }

  const blob = doc.output('blob');
  if (asBlob) return blob;
  window.DVC.saveBlob(blob, fileName);
  return blob;
}

window.DVP = {exportPdf};
})();
