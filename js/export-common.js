/* Retorno de la automatización del ordeño | Datavet — utilidades compartidas por las descargas de Excel y PDF */
'use strict';
(function () {
/* Pie de los entregables, según el manual de marca */
const FOOTER_LINES = [
  'Iván Darío Cifuentes Moreno — Médico veterinario · Magíster en Gestión de Negocios Ganaderos · Consultor en analítica de datos e inteligencia de negocios',
  'Datavet — «Analizar para innovar, innovar para evolucionar» · Medellín, Colombia · ivan.cifuentes@datavet.info · idacimo@gmail.com · WhatsApp (+57) 315 501 0037 · LinkedIn: idacimo'
];
const FOOTER = FOOTER_LINES.join('\n');
const SLOGAN = 'Datavet · Analizar para innovar, innovar para evolucionar';

function saveBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const bufToB64 = buf => {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
async function fetchB64(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo leer ' + url);
  return bufToB64(await r.arrayBuffer());
}
function loadImg(src){
  return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = src; });
}

/* SVG completo → PNG (data URL), escalado para que se vea nítido en el PDF y en Excel */
async function svgToPng(svg, w, h, scale = 2){
  const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

window.DVC = {FOOTER, FOOTER_LINES, SLOGAN, saveBlob, bufToB64, fetchB64, svgToPng, loadImg};
})();
