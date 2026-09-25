#!/usr/bin/env node
/**
 * HU-87 - Genera test/SCRUM-11-HU-87/resultados.txt con el estado REAL de cada prueba.
 *
 *   node test/SCRUM-11-HU-87/herramientas/generar-resultados.mjs
 *   node test/SCRUM-11-HU-87/herramientas/generar-resultados.mjs --imagen http://localhost:8087 --api https://api.produccion.ejemplo.test
 *   node test/SCRUM-11-HU-87/herramientas/generar-resultados.mjs --sin-suite-completa
 *
 * Corre vitest, lee su reporte JSON y escribe una línea [PASO] / [FALLO] por
 * prueba, con el mensaje de error de las que fallan. Con --imagen agrega el
 * resultado de verificar-imagen.mjs contra ese despliegue.
 *
 * No inventa nada: si una prueba falla, aparece como [FALLO]. El código de
 * salida es 1 si algo falló.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CARPETA = 'test/SCRUM-11-HU-87';
const argumentos = process.argv.slice(2);
const opcion = (nombre) => {
  const i = argumentos.indexOf(`--${nombre}`);
  return i >= 0 ? argumentos[i + 1] : undefined;
};
const suiteCompleta = !argumentos.includes('--sin-suite-completa');
const imagen = opcion('imagen');
const api = opcion('api');

function ejecutar(comando, args) {
  return spawnSync(comando, args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const git = (...args) => ejecutar('git', args).stdout.trim();
const temporal = mkdtempSync(path.join(os.tmpdir(), 'ecoruta-resultados-'));
const archivoJson = path.join(temporal, 'vitest.json');

console.log(suiteCompleta ? 'Corriendo toda la batería (unas decenas de segundos)...' : `Corriendo ${CARPETA}...`);
const vitest = ejecutar(process.execPath, [
  path.join(RAIZ, 'node_modules', 'vitest', 'vitest.mjs'),
  'run',
  ...(suiteCompleta ? [] : [CARPETA]),
  // .kilo/ guarda worktrees de Kilo Code (copias del repo en otros commits): no son parte del proyecto.
  '--exclude=.kilo/**',
  '--reporter=json',
  `--outputFile=${archivoJson}`,
]);

let reporte;
try {
  reporte = JSON.parse(readFileSync(archivoJson, 'utf8'));
} catch {
  console.error('No se pudo leer el reporte de vitest.\n', vitest.stdout, vitest.stderr);
  process.exit(1);
} finally {
  rmSync(temporal, { recursive: true, force: true });
}

const relativo = (archivo) => path.relative(RAIZ, archivo).replaceAll('\\', '/');
const archivos = reporte.testResults.map((r) => ({ ...r, nombre: relativo(r.name) }));
const deLaHu = archivos.filter((a) => a.nombre.startsWith(CARPETA));
const otros = archivos.filter((a) => !a.nombre.startsWith(CARPETA));

const contar = (lista) => {
  const pruebas = lista.flatMap((a) => a.assertionResults);
  return {
    total: pruebas.length,
    pasaron: pruebas.filter((p) => p.status === 'passed').length,
    fallaron: pruebas.filter((p) => p.status === 'failed').length,
    omitidas: pruebas.filter((p) => !['passed', 'failed'].includes(p.status)).length,
  };
};
const hu = contar(deLaHu);
const resto = contar(otros);

const linea = '-'.repeat(80);
const doble = '='.repeat(80);
const puntos = (texto, cuenta) => `${texto} ${'.'.repeat(Math.max(3, 62 - texto.length))} ${cuenta}`;
const salida = [];
const escribir = (...l) => salida.push(...l);

// El estado de la HU depende solo de sus pruebas. Los fallos del resto del proyecto
// NO se esconden: se listan aparte, con nombre y mensaje.
const estadoGeneral = hu.fallaron === 0 ? 'VERDE' : 'ROJO';

escribir(
  doble,
  'RESULTADOS DE PRUEBAS -- SCRUM-11 / HU-87: Build de produccion de la aplicacion web',
  doble,
  `Fecha   : ${new Date().toLocaleString('sv-SE').slice(0, 16)}`,
  `Node    : ${process.version}`,
  `Vitest  : ${JSON.parse(readFileSync(path.join(RAIZ, 'node_modules', 'vitest', 'package.json'), 'utf8')).version}`,
  `Rama    : ${git('branch', '--show-current')}`,
  `Commit  : ${git('rev-parse', '--short', 'HEAD')} (con cambios locales sin commit de la HU-87)`,
  '',
  'Alcance (parte de Desarrollo / Frontend):',
  '  A1  Build optimizado de React generado con npm run build.',
  '  A2  Empaquetado como imagen Docker.',
  '  A3  Icono del sitio definitivo.',
  '  A4  Titulo del sitio definitivo.',
  '  A5  Pantalla de carga definitiva.',
  '  A6  Variables de entorno apuntando al backend de produccion (no a direcciones locales).',
  '',
  linea,
  'RESUMEN',
  linea,
  `  Pruebas de la HU-87 ........ ${hu.pasaron} / ${hu.total}  PASARON  (${deLaHu.length} archivos, ${hu.fallaron} fallos, ${hu.omitidas} omitidas)`,
);
if (suiteCompleta) {
  escribir(
    `  Resto del proyecto ......... ${resto.pasaron} / ${resto.total}  PASARON  (${otros.length} archivos, ${resto.fallaron} fallos, ${resto.omitidas} omitidas)`,
    resto.fallaron === 0
      ? '                               (regresion: nada de lo anterior se rompio)'
      : '                               (fallos AJENOS a la HU-87: ver seccion "FALLOS FUERA DE LA HU-87")',
  );
}
escribir(
  '',
  `  ESTADO DE LA HU-87: ${estadoGeneral}${estadoGeneral === 'ROJO' ? '  -- hay pruebas fallidas, ver marcas [FALLO] abajo.' : ''}`,
  '',
);

const ajenas = otros.flatMap((a) => a.assertionResults.filter((p) => p.status === 'failed').map((p) => ({ a, p })));
if (ajenas.length > 0) {
  escribir(linea, 'FALLOS FUERA DE LA HU-87 (pruebas de otras historias)', linea);
  for (const { a, p } of ajenas) {
    escribir(`  [FALLO] ${a.nombre}`, `          ${[...p.ancestorTitles, p.title].join(' > ')}`);
    for (const mensaje of p.failureMessages) escribir(`          ${mensaje.split('\n')[0].slice(0, 220)}`);
  }
  escribir('');
}

const fallidas = deLaHu.flatMap((a) => a.assertionResults.filter((p) => p.status === 'failed').map((p) => ({ a, p })));
if (fallidas.length > 0) {
  escribir(linea, 'PRUEBAS FALLIDAS DE LA HU-87', linea);
  for (const { a, p } of fallidas) {
    escribir(`  [FALLO] ${a.nombre}`, `          ${[...p.ancestorTitles, p.title].join(' > ')}`);
    for (const mensaje of p.failureMessages) escribir(`          ${mensaje.split('\n')[0].slice(0, 200)}`);
  }
  escribir('');
}

const seccion = (letra, titulo, patron) => {
  const lista = deLaHu.filter((a) => patron.test(a.nombre));
  if (lista.length === 0) return;
  escribir(linea, `${letra}. ${titulo}`, linea);
  for (const archivo of lista) {
    const c = contar([archivo]);
    escribir(`  [${c.fallaron === 0 ? 'PASO ' : 'FALLO'}]  ${puntos(path.basename(archivo.nombre), `${c.pasaron} / ${c.total}`)}`);
    let grupoActual = '';
    for (const p of archivo.assertionResults) {
      const grupo = p.ancestorTitles.join(' > ');
      if (grupo !== grupoActual) {
        grupoActual = grupo;
        escribir(`    ${grupo}`);
      }
      const marca = p.status === 'passed' ? 'PASO ' : p.status === 'failed' ? 'FALLO' : 'OMIT ';
      escribir(`      [${marca}]  ${p.title}`);
    }
    escribir('');
  }
  escribir(`  Comando: npx vitest run ${CARPETA}/${letra === 'A' ? 'unitarios' : 'integracion'}`, '');
};

seccion('A', 'PRUEBAS UNITARIAS (archivos: index.html, public/, dockerfile, nginx.conf, config.ts)', /\/unitarios\//);
seccion('B', 'PRUEBAS DE INTEGRACION (build de produccion real, tarda ~20 s)', /\/integracion\//);

if (imagen) {
  escribir(linea, `C. VERIFICACION DE UNA IMAGEN EN MARCHA (${imagen})`, linea);
  const verificacion = ejecutar(process.execPath, [
    path.join(RAIZ, CARPETA, 'herramientas', 'verificar-imagen.mjs'),
    imagen,
    ...(api ? ['--api', api] : []),
  ]);
  escribir(...verificacion.stdout.trimEnd().split('\n').map((l) => `  ${l}`), '');
  if (verificacion.status !== 0) escribir('  ESTADO: ROJO -- la imagen tiene fallos.', '');
}

escribir(
  linea,
  'PRUEBAS QUE NO ESTAN EN ESTE REPORTE AUTOMATICO',
  linea,
  '  Las pruebas manuales, con datos reales y en dispositivo real estan en manual.md',
  '  (secciones 3 a 6). Se anotan a mano en la tabla del manual, seccion 7.',
  '',
  doble,
);

const texto = salida.join('\n');
writeFileSync(path.join(RAIZ, CARPETA, 'resultados.txt'), texto, 'utf8');
console.log(`\nEscrito ${CARPETA}/resultados.txt`);
console.log(`HU-87: ${hu.pasaron}/${hu.total} pasaron, ${hu.fallaron} fallaron.  Estado de la HU: ${estadoGeneral}`);
if (resto.fallaron > 0) console.log(`Ojo: ${resto.fallaron} prueba(s) de OTRAS historias fallan (ver resultados.txt).`);
process.exit(estadoGeneral === 'VERDE' ? 0 : 1);
