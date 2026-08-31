/**
 * Stub de /api/v1/demanda/estado para revisar A MANO las variantes del contador
 * mientras el backend real todavía no expone el endpoint.
 *
 * Cicla cada 15 s (alineado con el polling del hook):
 *   1) normal      7 personas   → "Faltan 3 personas"
 *   2) normal      9 personas   → "Falta 1 persona"  (singular)
 *   3) alcanzado  11 personas   → "Ya se puede ir."
 *   4) error       HTTP 500     → aviso + botón Reintentar
 *
 * Uso:
 *   node test/stub-demanda.mjs           # escucha en http://localhost:8080
 *   PORT=8081 node test/stub-demanda.mjs
 *
 * Si lo corrés en 8080 tapá primero el backend real (o corré el stub en otro
 * puerto y arrancá la app con  VITE_API_URL=http://localhost:8081 npm run dev).
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT) || 8080;
const CICLO = [
  { tipo: 'normal', totalEsperando: 7 },
  { tipo: 'normal', totalEsperando: 9 },
  { tipo: 'alcanzado', totalEsperando: 11 },
  { tipo: 'error', status: 500 },
];

let i = 0;
setInterval(() => { i = (i + 1) % CICLO.length; }, 15_000);

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url !== '/api/v1/demanda/estado') {
    res.statusCode = 404;
    res.end('{}');
    return;
  }

  const paso = CICLO[i];
  const sello = `[${new Date().toLocaleTimeString()}] ${i + 1}/${CICLO.length} ${paso.tipo}`;

  if (paso.tipo === 'error') {
    console.log(sello, '-> 500');
    res.statusCode = paso.status;
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      status: paso.status,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
      path: req.url,
    }));
    return;
  }

  const total = paso.totalEsperando;
  console.log(sello, `-> ${total} personas`);
  res.end(JSON.stringify({
    totalEsperando: total,
    umbralSalida: 10,
    faltanParaSalir: Math.max(10 - total, 0),
    porParada: { 'parada-1': total },
  }));
}).listen(PORT, () =>
  console.log(`stub en http://localhost:${PORT} — cicla normal/normal/alcanzado/error cada 15 s`),
);
