/**
 * Ejecuta TODAS las pruebas de la HU-86 (y la bateria completa del proyecto) y
 * regenera RESULTADOS.txt con el estado real de cada una.
 *
 *   node test/HU-Desarrollo-86-exportar-datos/generar-resultados.mjs
 *
 * Pasos: tsc --noEmit, build, vitest (JSON), E2E en navegador, chequeo del
 * entorno real (solo lectura, sin credenciales). Sale con codigo 1 si algo falla.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..', '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tmp = mkdtempSync(path.join(tmpdir(), 'hu86-'));

function correr(cmd, args, { shell = process.platform === 'win32' } = {}) {
  const r = spawnSync(cmd, args, { cwd: raiz, encoding: 'utf8', shell, maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const puntos = (texto, valor, ancho = 74) => `${texto} ${'.'.repeat(Math.max(2, ancho - texto.length - String(valor).length))} ${valor}`;
const marca = (ok) => (ok ? '[PASO] ' : '[FALLO]');
const linea = '-'.repeat(80);
const doble = '='.repeat(80);

console.log('1/5 tsc --noEmit ...');
const tsc = correr(npx, ['tsc', '--noEmit']);
console.log('2/5 build ...');
const build = correr(npm, ['run', 'build']);
console.log('3/5 vitest (bateria completa) ...');
const jsonPath = path.join(tmp, 'vitest.json');
correr(npx, ['vitest', 'run', '--reporter=json', `--outputFile=${jsonPath}`]);
const vt = JSON.parse(readFileSync(jsonPath, 'utf8'));
console.log('4/5 E2E en navegador ...');
const e2e = correr(process.execPath, [path.join(aqui, 'e2e-navegador.mjs')], { shell: false });
console.log('5/5 entorno real (solo lectura) ...');
let real = { estado: 'OMITIDA', detalle: 'sin red' };
for (let intento = 1; intento <= 3; intento++) {
  try {
  const url = 'https://mibusjalapa.lat/api/v1/admin/exportaciones/servicio?desde=2026-09-01&hasta=2026-09-02';
  const sin = await fetch(url, { headers: { Origin: 'https://mibusjalapa.lat' } });
  const falsa = await fetch('https://mibusjalapa.lat/api/v1/admin/ruta-inexistente-xyz');
  real = {
    estado: sin.status === 401 ? 'PASO' : 'FALLO',
    status: sin.status,
    statusRutaFalsa: falsa.status,
    allowOrigin: sin.headers.get('access-control-allow-origin'),
    expose: sin.headers.get('access-control-expose-headers'),
  };
    break;
  } catch (e) {
    real = { estado: 'OMITIDA', detalle: String(e.cause?.code ?? e.message ?? e) };
  }
}

const normal = (f) => path.relative(raiz, f).split(path.sep).join('/');
const archivos = vt.testResults.map((a) => ({
  archivo: normal(a.name),
  pruebas: a.assertionResults,
  pasan: a.assertionResults.filter((t) => t.status === 'passed').length,
}));
const esHU = (a) =>
  a.archivo.startsWith('test/HU-Desarrollo-86') ||
  a.archivo === 'src/core/panelAdmin/exportacion.test.ts' ||
  a.archivo === 'src/pruebas/features/exportar_datos_del_servicio.test.tsx';
const hu = archivos.filter(esHU);
const otros = archivos.filter((a) => !esHU(a));
const cuenta = (l) => l.reduce((s, a) => s + a.pruebas.length, 0);
const pasan = (l) => l.reduce((s, a) => s + a.pasan, 0);

const e2eLineas = e2e.salida.split(/\r?\n/).filter((l) => l.startsWith('[PASO]') || l.startsWith('[FALLO]') || l.startsWith('        '));
const e2eTotal = e2eLineas.filter((l) => l.startsWith('[')).length;
const e2ePasan = e2eLineas.filter((l) => l.startsWith('[PASO]')).length;

const todoOk = tsc.ok && build.ok && vt.success && e2e.ok && real.estado !== 'FALLO';

const o = [];
o.push(doble, 'RESULTADOS DE PRUEBAS -- HU Desarrollo-86 "Exportar los datos del servicio" (FRONTEND)', doble);
o.push(`Fecha  : ${new Date().toLocaleString('sv-SE').slice(0, 16)}`);
o.push(`Node   : ${process.version}`);
o.push(`Vitest : ${vt.numTotalTests ? '3.2.7' : ''}`);
o.push(`Rama   : ${correr('git', ['branch', '--show-current']).salida.trim()}`);
o.push('', 'Criterios de aceptacion:');
o.push('  C1  Exportacion en formato de hoja de calculo desde el panel web.');
o.push('  C2  Rango de fechas seleccionable.');
o.push('  C3  La exportacion no expone datos que identifiquen a un pasajero.');
o.push('', linea, 'RESUMEN', linea);
o.push(puntos('  Bateria completa del proyecto', `${vt.numPassedTests} / ${vt.numTotalTests}  ${vt.numFailedTests === 0 ? 'PASARON' : 'HAY FALLOS'}   (${archivos.length} archivos, ${vt.numFailedTests} fallos)`));
o.push(puntos('  De esta HU (simuladas + unitarias + componente + Gherkin)', `${pasan(hu)} / ${cuenta(hu)}  ${pasan(hu) === cuenta(hu) ? 'PASARON' : 'HAY FALLOS'}   (${hu.length} archivos)`));
o.push(puntos('  Regresion (resto del proyecto)', `${pasan(otros)} / ${cuenta(otros)}  ${pasan(otros) === cuenta(otros) ? 'PASARON' : 'HAY FALLOS'}`));
o.push(puntos('  E2E en navegador real (Chromium) con backend simulado', `${e2ePasan} / ${e2eTotal}  ${e2ePasan === e2eTotal && e2e.ok ? 'PASARON' : 'HAY FALLOS'}`));
o.push(puntos('  Verificacion de tipos (tsc --noEmit)', tsc.ok ? 'OK' : 'CON ERRORES'));
o.push(puntos('  Build de produccion (npm run build)', build.ok ? 'OK' : 'CON ERRORES'));
o.push(puntos('  Entorno real, solo lectura y sin credenciales', real.estado));
o.push('', `  ESTADO GENERAL: ${todoOk ? 'VERDE. Ninguna prueba fallo.' : 'ROJO. Revisar el detalle de abajo.'}`);
o.push('  Limite: el .xlsx real y el login con credenciales de QA NO se probaron desde aqui (ver seccion D).');

o.push('', linea, 'A. PRUEBAS DE ESTA HU, POR ARCHIVO', linea);
for (const a of hu) {
  o.push(`  ${marca(a.pasan === a.pruebas.length)} ${puntos(a.archivo, `${a.pasan} / ${a.pruebas.length}`, 76)}`);
}
o.push('', linea, 'B. DETALLE PRUEBA POR PRUEBA (HU-86)', linea);
for (const a of hu) {
  o.push('', `  ${a.archivo}`);
  for (const t of a.pruebas) {
    o.push(`    ${marca(t.status === 'passed')} ${t.fullName.replace(/\s+/g, ' ')}`);
    if (t.status !== 'passed') for (const m of t.failureMessages ?? []) o.push(`            ${m.split('\n')[0]}`);
  }
}

o.push('', linea, 'C. E2E EN NAVEGADOR REAL (test/HU-Desarrollo-86-exportar-datos/e2e-navegador.mjs)', linea);
for (const l of e2eLineas) o.push(`  ${l}`);
o.push('  Capturas: test/HU-Desarrollo-86-exportar-datos/evidencia/');

o.push('', linea, 'D. ENTORNO REAL (solo lectura, sin credenciales)', linea);
if (real.estado === 'OMITIDA') {
  o.push(`  [OMITIDA] no se pudo consultar https://mibusjalapa.lat: ${real.detalle}`);
} else {
  o.push(`  ${marca(real.estado === 'PASO')} GET /api/v1/admin/exportaciones/servicio sin token -> ${real.status} (esperado 401)`);
  o.push(`  [INFO]  GET a una ruta admin inexistente sin token -> ${real.statusRutaFalsa}`);
  o.push(`  [INFO]  Access-Control-Allow-Origin: ${real.allowOrigin ?? '(no viene)'} | Expose-Headers: ${real.expose ?? '(no viene)'}`);
  if (real.status === real.statusRutaFalsa) {
    o.push('  Lectura: el servidor responde y exige sesion, pero da 401 igual con una ruta que no existe, asi que esto');
    o.push('  NO demuestra que el endpoint este desplegado en produccion. Queda pendiente probar con un token de');
    o.push('  administrador de QA (paso 1 de la revision manual en MANUAL_DE_PRUEBAS.md).');
  }
}

o.push('', linea, 'E. RESTO DE LA BATERIA (regresion: nada de lo agregado rompio lo existente)', linea);
for (const a of otros) o.push(`  ${marca(a.pasan === a.pruebas.length)} ${puntos(a.archivo, `${a.pasan} / ${a.pruebas.length}`, 76)}`);
o.push('', doble, 'Regenerar: node test/HU-Desarrollo-86-exportar-datos/generar-resultados.mjs', doble, '');

writeFileSync(path.join(aqui, 'RESULTADOS.txt'), o.join('\n'), 'utf8');
console.log(`\nRESULTADOS.txt escrito. Estado: ${todoOk ? 'VERDE' : 'ROJO'}`);
process.exit(todoOk ? 0 : 1);
