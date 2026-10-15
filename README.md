# Retorno de la automatización del ordeño | Datavet

Calculadora web para decidir si conviene automatizar el ordeño: en cuánto tiempo se recupera la inversión, cuánto deja al año (también por litro y por vaca), el valor presente neto, la TIR, la recuperación descontada, el flujo de caja con y sin crédito, escenarios y sensibilidad. Descarga el análisis en **PDF** y en **Excel con fórmulas vivas**, también desde el celular.

Desarrollada por **Iván Darío Cifuentes Moreno** · Datavet — *Analizar para innovar, innovar para evolucionar*
ivan.cifuentes@datavet.info · idacimo@gmail.com · WhatsApp (+57) 315 501 0037

**En línea:** https://idacimo.github.io/Roi-automatizacion/

## Para quién

| Modo | Para quién | Qué ve |
|---|---|---|
| **Básico** (por defecto, pensado para el celular) | Productor | 3 pasos: su finca, el equipo (nivel y precio), resultados. Años para recuperar la inversión, cuánto deja al año y por litro, semáforo, de dónde sale la plata, gráfica y escenarios. |
| **Completo** | Técnico, propietario o financiero | Todos los supuestos editables, flujo de caja con y sin crédito, VPN, TIR, recuperación simple y descontada, valor de rescate, escenarios (60 % · 100 % · 120 %) y sensibilidad precio × litros. |

El enlace `…/#completo` abre directamente el modo completo.

## Descargas

- **PDF** tamaño carta con marca Datavet (jsPDF + AutoTable, texto seleccionable): veredicto, indicadores, beneficios, gráfica, escenarios, flujo de caja, sensibilidad, situación actual, niveles, parámetros y método.
- **Excel** (ExcelJS) con 6 hojas: Resumen · Parámetros (celdas verdes editables, con nombres `p_vacas`, `p_precio`…) · Flujo de caja · Escenarios · Sensibilidad · Gráfico. El Resumen y el Flujo de caja usan **fórmulas** (VPN con `NPV`, TIR con `IRR`, cuota con `PMT`) y guardan el resultado calculado, para que se vean bien en visores de celular que no recalculan.
- **Compartir** (celulares compatibles): envía el PDF por WhatsApp, correo, etc.

## Privacidad

- Todos los cálculos se hacen en el navegador. Los datos de la finca no se envían a ningún servidor; Datavet no los recibe ni los guarda.
- El PDF y el Excel se generan en el dispositivo y se descargan directamente.
- La página recuerda los últimos datos solo en ese dispositivo (almacenamiento local). El botón «Borrar mis datos de este dispositivo» los elimina.
- Contador anónimo con GoatCounter (sin *cookies*, cuenta `datavet`, eventos con prefijo `roi-`). Nunca se envían datos de la finca. No se activa en `localhost`.

## Modelo de cálculo (`js/model.js`)

- Más leche = vacas × litros × % aumento × días × (precio − alimento extra por litro adicional)
- Menos mastitis = vacas × puntos de reducción × litros perdidos por caso × precio
- Concentrado = vacas × kg menos por vaca al día × días × precio del kg
- Mano de obra = ordeñadores que se reducen × costo mensual (salario + prestaciones) × 12
- Energía = horas de ordeño × % menos tiempo × costo de la sala por hora × días
- Beneficio neto = suma − mantenimiento anual (% de la inversión); el último año suma el valor de rescate
- VPN, TIR (bisección), recuperación simple y descontada, crédito con cuota fija (sistema francés)

### Cambios frente a la versión 4 (`ROI_Ordeno_DataVet_v4.html`)

| Tema | v4 | v5 |
|---|---|---|
| Días de producción | 305 días con vacas en ordeño (subestimaba) y 365 para concentrado y energía | Un solo parámetro, **365** por defecto, porque «vacas en ordeño» ya es el promedio del año |
| Mantenimiento del equipo | No existía | **2 %** de la inversión al año (editable) |
| Concentrado por nivel | Valor absoluto (4,0 o 4,5 kg) aunque la finca diera otra cantidad | **Reducción** en kg; solo el sistema completo lo reduce, como dice la guía de la herramienta |
| Leche adicional | Valorada a precio completo | Se descuenta el **alimento extra por litro adicional**, calculado automáticamente como el costo de concentrado por litro de hoy (precio del kg × kg por vaca ÷ litros por vaca); se puede reemplazar por un valor propio |
| Indicadores | Payback, ROI, VPN | + TIR, recuperación descontada, por litro y por vaca, escenarios, valor de rescate, crédito |
| Precio del concentrado | $1.200/kg | **$1.900/kg** por defecto |
| Gráfica | Siempre 10 años | Según la vida útil |
| Exportación | Imprimir la página | PDF y Excel propios, también en el celular |

Con 305 días y sin mantenimiento, el modelo da los mismos beneficios de producción y mastitis que la v4; la energía difiere solo porque la v4 la calculaba con 365 días (prueba en `tests/unit/model.test.mjs`).

## Estructura

```
index.html            página (modo básico y completo)
css/app.css           estilos (base compartida con Plan de reemplazos)
js/model.js           modelo de cálculo (también se usa en las pruebas)
js/app.js             interfaz
js/export-common.js   utilidades de descarga
js/export-pdf.js      PDF tamaño carta
js/export-xlsx.js     Excel con fórmulas
vendor/               librerías y fuente Jost (sin CDN)
assets/               logos, isotipo, favicon e imagen para redes
tests/                pruebas del modelo (Node) y de punta a punta (Playwright: celular y escritorio)
```

## Uso local

```bash
npm install
npm run serve        # http://localhost:8080
npm test             # modelo de cálculo
npm run test:e2e     # navegador: modo básico y completo, descargas de PDF y Excel
```

## Publicar en GitHub Pages

Repositorio público → **Settings → Pages → Deploy from a branch → `main` / `(root)`**. Queda en `https://idacimo.github.io/Roi-automatizacion/`. El flujo `.github/workflows/test.yml` corre las pruebas en cada cambio.
