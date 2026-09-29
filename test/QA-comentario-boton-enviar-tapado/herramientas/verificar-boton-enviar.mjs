// QA: "Al escribir un comentario, el boton ENVIAR queda oculto por el panel
// negro de politica de privacidad y no es posible enviarlo."
//
// Vitest/jsdom no pinta CSS real (no hay stacking context, no z-index), asi
// que esto usa un navegador de verdad (Playwright) contra el CSS real del
// proyecto, servido por el propio Vite dev server, con el mismo esqueleto de
// clases que arma Layout + PieLegal + OpinarSobreElServicio en produccion
// (ver herramientas/repro.html).
//
// No es dependencia del proyecto: `npm install --no-save playwright` antes
// de correrlo (ver manual.md de esta carpeta).
//
// Uso:
//   node test/QA-comentario-boton-enviar-tapado/herramientas/verificar-boton-enviar.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as esperar } from 'node:timers/promises';

const PUERTO = 5183;
const URL_BASE = `http://localhost:${PUERTO}`;
const URL_REPRO = `${URL_BASE}/test/QA-comentario-boton-enviar-tapado/herramientas/repro.html`;

function log(pasa, texto) {
  console.log(`  [${pasa ? 'PASO ' : 'FALLO'}]  ${texto}`);
}

async function arrancarVite() {
  const proc = spawn('npx', ['vite', '--port', String(PUERTO), '--strictPort'], {
    stdio: 'pipe',
    shell: true,
  });
  for (let intento = 0; intento < 40; intento++) {
    try {
      const resp = await fetch(URL_BASE);
      if (resp.ok || resp.status === 404) return proc;
    } catch {
      /* aun no arranca */
    }
    await esperar(250);
  }
  proc.kill();
  throw new Error('Vite no arranco a tiempo.');
}

async function diagnosticar(page, { estiloExtra = '' } = {}) {
  await page.goto(URL_REPRO);
  if (estiloExtra) await page.addStyleTag({ content: estiloExtra });
  await page.waitForTimeout(150);
  return page.evaluate(() => window.diagnostico());
}

async function main() {
  let sinFallos = true;
  const vite = await arrancarVite();
  const browser = await chromium.launch();

  try {
    for (const [nombreEsquema, colorScheme] of [
      ['claro', 'light'],
      ['oscuro (el pie se ve casi negro)', 'dark'],
    ]) {
      for (const [nombreViewport, viewport] of Object.entries({
        'iPhone SE (375x667)': { width: 375, height: 667 },
        'Android chico (360x640)': { width: 360, height: 640 },
      })) {
        const page = await browser.newPage({ viewport, colorScheme });

        // Estado real (z-index: 60): el boton debe ganar siempre, aunque
        // haya un competidor con z-index alto (simula el menu de acceso).
        const conFix = await diagnosticar(page);
        const pasoFix = conFix.botonGanaLaPelea;
        log(
          pasoFix,
          `[${nombreEsquema}, ${nombreViewport}] con el arreglo (z-index: 60): el boton "Enviar" recibe el toque` +
            (pasoFix ? '' : ` (recibio el toque: ${conFix.elementoEnElCentro})`),
        );
        sinFallos &&= pasoFix;

        // Reproduce el estado ANTES del arreglo (z-index: 40) para demostrar
        // que un competidor con z-index 41 (p. ej. el menu de acceso) si le
        // ganaba: es la prueba de que el arreglo no es cosmetico.
        const sinFix = await diagnosticar(page, {
          estiloExtra: '.opinion-velo { z-index: 40 !important; }',
        });
        const detectoRegresion = !sinFix.botonGanaLaPelea;
        log(
          detectoRegresion,
          `[${nombreEsquema}, ${nombreViewport}] sin el arreglo (z-index: 40): un competidor con z-index 41 SI tapa el boton (confirma el motivo del arreglo)`,
        );
        sinFallos &&= detectoRegresion;

        await page.close();
      }
    }
  } finally {
    await browser.close();
    vite.kill();
  }

  console.log('');
  console.log(sinFallos ? 'Resultado: todo paso.' : 'Resultado: hubo fallos.');
  process.exit(sinFallos ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
