/**
 * Corre TODAS las pruebas automáticas del contador de demanda y deja el
 * resultado en test/RESULTADOS.txt (además de imprimirlo en pantalla).
 *
 *   node test/correr-todo.mjs
 *   node test/correr-todo.mjs http://localhost:8080   # URL del backend para la Capa B
 *
 * Bloques que ejecuta:
 *   1) Tests del contador (vitest, los 3 archivos de esta HU)
 *   2) Suite completa (vitest, todo el repo)
 *   3) Build (tsc --noEmit + vite build)
 *   4) Contrato contra el backend real (test/contrato-demanda.mjs)
 *
 * Las pruebas MANUALES (PM-1 a PM-11) no se pueden automatizar: quedan como
 * checklist al final del .txt para marcar a mano. Ver test/MANUAL.md.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const SALIDA = join(AQUI, 'RESULTADOS.txt');
const URL_BACKEND = process.argv[2] || process.env.API_URL || 'http://localhost:8080';

const TESTS_CONTADOR = [
  'src/hooks/useEstadoDemanda.test.ts',
  'src/hooks/useEstadoDemandaConPolling.test.ts',
  'src/componentes/ContadorDemanda.test.tsx',
];

const lineas = [];
const log = (s = '') => { console.log(s); lineas.push(s); };
const raya = (c = '=') => log(c.repeat(64));

function correr(cmd) {
  try {
    const out = execSync(cmd, { cwd: RAIZ, stdio: 'pipe', encoding: 'utf8' });
    return { code: 0, salida: out };
  } catch (e) {
    return {
      code: typeof e.status === 'number' ? e.status : 1,
      salida: `${e.stdout || ''}${e.stderr || ''}` || String(e.message),
    };
  }
}

// Quita códigos de color ANSI para que el .txt sea legible en cualquier editor.
const limpiar = (s) => s.replace(/\[[0-9;]*m/g, '');

function contarVitest(salida) {
  const s = limpiar(salida);
  const pass = /Tests\s+(\d+)\s+passed/.exec(s);
  const fail = /(\d+)\s+failed/.exec(s);
  return {
    passed: pass ? Number(pass[1]) : null,
    failed: fail ? Number(fail[1]) : 0,
  };
}

const resumen = [];

log('RESULTADOS DE PRUEBAS — Contador de demanda (HU: hook, componente, polling, estados)');
log(`Generado:  ${new Date().toISOString()}`);
log(`Node:      ${process.version}    SO: ${process.platform}`);
log(`Backend:   ${URL_BACKEND}`);
log('');

// 1) Tests del contador -----------------------------------------------------
raya();
log('1) TESTS AUTOMÁTICOS DEL CONTADOR  (vitest — 3 archivos de esta HU)');
raya();
{
  const r = correr(`npx vitest run ${TESTS_CONTADOR.join(' ')} --reporter=verbose`);
  log(limpiar(r.salida).trim());
  const { passed, failed } = contarVitest(r.salida);
  const ok = r.code === 0 && failed === 0;
  const detalle = passed !== null ? `${passed} pruebas, ${failed} fallidas` : `exit ${r.code}`;
  log('');
  log(`--> ${ok ? 'PASÓ' : 'FALLÓ'}  (${detalle})`);
  resumen.push([ok ? 'PASÓ' : 'FALLÓ', 'Tests automáticos del contador', detalle]);
}
log('');

// 2) Suite completa -------------------------------------------------------
raya();
log('2) SUITE COMPLETA  (vitest — todo el repositorio)');
raya();
{
  const r = correr('npx vitest run');
  log(limpiar(r.salida).trim());
  const { passed, failed } = contarVitest(r.salida);
  const ok = r.code === 0 && failed === 0;
  const detalle = passed !== null ? `${passed} pruebas, ${failed} fallidas` : `exit ${r.code}`;
  log('');
  log(`--> ${ok ? 'PASÓ' : 'FALLÓ'}  (${detalle})`);
  resumen.push([ok ? 'PASÓ' : 'FALLÓ', 'Suite completa', detalle]);
}
log('');

// 3) Build ---------------------------------------------------------------
raya();
log('3) BUILD  (tsc --noEmit + vite build)');
raya();
{
  const r = correr('npm run build');
  log(limpiar(r.salida).trim());
  const ok = r.code === 0;
  log('');
  log(`--> ${ok ? 'PASÓ' : 'FALLÓ'}  (exit ${r.code})`);
  resumen.push([ok ? 'PASÓ' : 'FALLÓ', 'Build (tipos + bundle)', `exit ${r.code}`]);
}
log('');

// 4) Contrato contra el backend real ----------------------------------
raya();
log('4) CONTRATO CONTRA EL BACKEND REAL  (node test/contrato-demanda.mjs)');
raya();
{
  const r = correr(`node test/contrato-demanda.mjs ${URL_BACKEND}`);
  log(limpiar(r.salida).trim());
  let estado, detalle;
  if (r.code === 0 && /TODO OK/.test(r.salida)) { estado = 'PASÓ'; detalle = 'contrato cumplido'; }
  else if (r.code === 0 && /PENDIENTE/.test(r.salida)) { estado = 'PENDIENTE'; detalle = 'endpoint 404, backend no lo expone aún'; }
  else if (r.code === 2) { estado = 'SIN PROBAR'; detalle = 'no se pudo conectar al backend'; }
  else { estado = 'FALLÓ'; detalle = `exit ${r.code} — el endpoint no cumple el contrato`; }
  log('');
  log(`--> ${estado}  (${detalle})`);
  resumen.push([estado, 'Contrato backend real', detalle]);
}
log('');

// Resumen -------------------------------------------------------------
raya();
log('RESUMEN');
raya();
for (const [estado, nombre, detalle] of resumen) {
  log(`[${estado.padEnd(9)}] ${nombre.padEnd(34)} ${detalle}`);
}
log('');
const automaticoOk = resumen
  .filter(([, n]) => n !== 'Contrato backend real')
  .every(([e]) => e === 'PASÓ');
log(`TODO LO AUTOMÁTICO: ${automaticoOk ? 'PASÓ' : 'REVISAR — hay bloques en FALLÓ'}`);
log('');

// Checklist manual (se marca a mano) --------------------------------
raya();
log('PRUEBAS MANUALES  (no automatizables — ver test/MANUAL.md, sección PM)');
raya();
const PM = [
  'PM-1  Estado de carga (esqueleto + "Actualizando el conteo…")',
  'PM-2  Dato normal (número 7, "Faltan 3 personas", chip "En espera")',
  'PM-3  Singular "Falta 1 persona" y el número cambia sin recargar',
  'PM-4  Umbral alcanzado (tarjeta verde, "Ya se puede ir.", sin la palabra "umbral")',
  'PM-5  Error con mensaje traducido (sin ver 500 ni "Internal Server Error")',
  'PM-6  Botón Reintentar dispara una petición al instante',
  'PM-7  Una petición cada ~15 s, sin ráfagas, sin recargar',
  'PM-8  Pausa al ocultar la pestaña; al volver, petición inmediata + aviso',
  'PM-9  Sobrevive a la recarga (F5)',
  'PM-10 Botón >= 48px, nada < 11.5px, legible en modo oscuro, color+icono+texto',
  'PM-11 (opcional) Contra backend real: hoy muestra 7/10 simulado, sin error',
];
for (const p of PM) log(`[  ]  ${p}`);
log('');
log(`Firma / fecha de la prueba manual: ______________________________`);
log('');

writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\n(resultados guardados en ${SALIDA})`);

process.exit(automaticoOk ? 0 : 1);
