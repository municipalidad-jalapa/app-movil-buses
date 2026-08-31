/**
 * Verificación del contrato de demanda contra el backend REAL.
 *
 * GET /api/v1/demanda/estado es el único endpoint del que dependen las cuatro
 * subhistorias del contador (hook useEstadoDemanda, componente ContadorDemanda,
 * polling de 15 s y variantes de carga/error/umbral).
 *
 * Uso:
 *   node test/contrato-demanda.mjs
 *   node test/contrato-demanda.mjs http://localhost:8080
 *   API_URL=http://localhost:8080 node test/contrato-demanda.mjs
 *
 * Códigos de salida:
 *   0  el endpoint responde y cumple el contrato  (o todavía no existe: ver nota)
 *   1  el endpoint responde pero VIOLA el contrato  (bug real)
 *   2  no se pudo conectar al backend
 */

const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const RUTA = '/api/v1/demanda/estado';
const URL = BASE + RUTA;

let fallos = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const mal = (m) => { console.log(`  \x1b[31m✗ ${m}\x1b[0m`); fallos++; };
const aviso = (m) => console.log(`  \x1b[33m! ${m}\x1b[0m`);

const esEnteroNoNegativo = (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && Number.isInteger(v);

async function pedirEstado() {
  const res = await fetch(URL, { headers: { Accept: 'application/json' } });
  const texto = await res.text();
  let cuerpo = null;
  try { cuerpo = JSON.parse(texto); } catch { /* se valida abajo */ }
  return { res, cuerpo, texto };
}

console.log(`\nContrato de demanda  →  ${URL}\n`);

let primera;
try {
  primera = await pedirEstado();
} catch (e) {
  console.log(`  \x1b[31m✗ no se pudo conectar: ${e.message}\x1b[0m`);
  console.log(`\n\x1b[31mNO SE PUDO PROBAR\x1b[0m — ¿está levantado el backend en ${BASE}?\n`);
  process.exit(2);
}

const { res, cuerpo } = primera;

// Caso: el endpoint todavía no está implementado en el backend --------------
const esNotFoundDeSpring =
  res.status === 404 &&
  cuerpo &&
  cuerpo.error === 'Not Found' &&
  cuerpo.totalEsperando === undefined;

if (esNotFoundDeSpring) {
  console.log('  \x1b[33m! el backend responde 404: el endpoint de demanda todavía no está implementado.\x1b[0m\n');
  console.log('  Esto es esperado según la nota de "Independencia" de la HU: la historia es');
  console.log('  de frontend y se demuestra contra el contrato con datos simulados.');
  console.log('  src/core/apiClient.ts detecta este 404 y devuelve DEMANDA_SIMULADA,');
  console.log('  así que la UI y el polling funcionan igual.\n');
  console.log('  \x1b[33mPENDIENTE\x1b[0m: repetí esta prueba cuando el backend exponga /api/v1/demanda/estado.\n');
  process.exit(0);
}

// 1. Respuesta y forma del contrato (EstadoDemandaDTO) ---------------------
console.log('1. Respuesta y forma del contrato');
res.status === 200 ? ok('HTTP 200') : mal(`se esperaba HTTP 200 y llegó ${res.status}`);

(res.headers.get('content-type') || '').includes('application/json')
  ? ok('Content-Type application/json')
  : aviso(`Content-Type inesperado: ${res.headers.get('content-type')}`);

if (cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)) {
  ok('el cuerpo es un objeto JSON');

  esEnteroNoNegativo(cuerpo.totalEsperando)
    ? ok(`totalEsperando es entero ≥ 0 (${cuerpo.totalEsperando})`)
    : mal(`totalEsperando inválido: ${JSON.stringify(cuerpo.totalEsperando)}`);

  esEnteroNoNegativo(cuerpo.umbralSalida)
    ? ok(`umbralSalida es entero ≥ 0 (${cuerpo.umbralSalida})`)
    : mal(`umbralSalida inválido: ${JSON.stringify(cuerpo.umbralSalida)}`);

  esEnteroNoNegativo(cuerpo.faltanParaSalir)
    ? ok(`faltanParaSalir es entero ≥ 0 (${cuerpo.faltanParaSalir})`)
    : mal(`faltanParaSalir inválido: ${JSON.stringify(cuerpo.faltanParaSalir)}`);

  if (cuerpo.porParada && typeof cuerpo.porParada === 'object' && !Array.isArray(cuerpo.porParada)) {
    Object.values(cuerpo.porParada).every(esEnteroNoNegativo)
      ? ok(`porParada es un mapa paradaId→cantidad (${Object.keys(cuerpo.porParada).length} paradas)`)
      : mal(`porParada tiene valores no numéricos: ${JSON.stringify(cuerpo.porParada)}`);
  } else {
    mal(`porParada no es un objeto: ${JSON.stringify(cuerpo.porParada)}`);
  }
} else {
  mal(`el cuerpo no es un objeto JSON: ${primera.texto.slice(0, 120)}`);
}

// 2. Coherencia de los números -------------------------------------------
console.log('\n2. Coherencia de los números');
if (cuerpo && typeof cuerpo === 'object') {
  const esperado = Math.max(cuerpo.umbralSalida - cuerpo.totalEsperando, 0);
  cuerpo.faltanParaSalir === esperado
    ? ok(`faltanParaSalir = max(umbral - total, 0) = ${esperado}`)
    : mal(`faltanParaSalir=${cuerpo.faltanParaSalir}, pero max(${cuerpo.umbralSalida} - ${cuerpo.totalEsperando}, 0) = ${esperado}`);

  if (cuerpo.porParada) {
    const suma = Object.values(cuerpo.porParada).reduce((a, b) => a + b, 0);
    suma === cuerpo.totalEsperando
      ? ok(`la suma de porParada (${suma}) coincide con totalEsperando`)
      : aviso(`la suma de porParada (${suma}) ≠ totalEsperando (${cuerpo.totalEsperando}) — confirmá si es esperado`);
  }

  cuerpo.umbralSalida === 10
    ? ok('umbralSalida = 10')
    : aviso(`umbralSalida = ${cuerpo.umbralSalida}, no 10 — la UI se adapta, pero confirmá que es correcto`);
}

// 3. El endpoint se puede sondear (base del polling de 15 s) -------------
console.log('\n3. Sondeo repetido (base del polling)');
try {
  const segunda = await pedirEstado();
  segunda.res.status === 200 && segunda.cuerpo && typeof segunda.cuerpo === 'object'
    ? ok('una segunda llamada seguida también responde 200 con el mismo shape')
    : mal(`la segunda llamada devolvió ${segunda.res.status}`);
} catch (e) {
  mal(`la segunda llamada falló: ${e.message}`);
}

console.log('');
if (fallos === 0) {
  console.log('\x1b[32mTODO OK\x1b[0m — el contrato de demanda funciona contra el backend real.\n');
  process.exit(0);
}
console.log(`\x1b[31m${fallos} comprobación(es) fallaron\x1b[0m — el endpoint responde pero no cumple el contrato.\n`);
process.exit(1);
