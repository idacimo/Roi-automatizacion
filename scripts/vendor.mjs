// Copia las librerías y fuentes de node_modules a vendor/ para que el sitio no dependa de CDN.
// Uso: npm install && npm run vendor
import { cpSync, mkdirSync } from 'node:fs';

const files = {
  'node_modules/exceljs/dist/exceljs.min.js': 'vendor/exceljs.min.js',
  'node_modules/jspdf/dist/jspdf.umd.min.js': 'vendor/jspdf.umd.min.js',
  'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js': 'vendor/jspdf.plugin.autotable.min.js',
  'node_modules/@expo-google-fonts/jost/400Regular/Jost_400Regular.ttf': 'vendor/fonts/Jost-Regular.ttf',
  'node_modules/@expo-google-fonts/jost/500Medium/Jost_500Medium.ttf': 'vendor/fonts/Jost-Medium.ttf',
  'node_modules/@expo-google-fonts/jost/600SemiBold/Jost_600SemiBold.ttf': 'vendor/fonts/Jost-SemiBold.ttf',
  'node_modules/@expo-google-fonts/jost/700Bold/Jost_700Bold.ttf': 'vendor/fonts/Jost-Bold.ttf'
};
/* Jost: fuente oficial de la marca Datavet */
for (const w of [400, 500, 600, 700]) for (const sub of ['latin', 'latin-ext']) {
  files[`node_modules/@fontsource/jost/files/jost-${sub}-${w}-normal.woff2`] = `vendor/fonts/jost-${sub}-${w}.woff2`;
}
mkdirSync('vendor/fonts', { recursive: true });
for (const [src, dst] of Object.entries(files)) { cpSync(src, dst); console.log(dst); }
