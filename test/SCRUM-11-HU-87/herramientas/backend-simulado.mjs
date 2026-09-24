#!/usr/bin/env node
/**
 * HU-87 - Backend simulado de EcoRuta (solo para pruebas locales).
 *
 * Responde con datos válidos los endpoints que la app pide al arrancar, para
 * comprobar una imagen Docker en un navegador real sin depender del backend.
 *
 *   node test/SCRUM-11-HU-87/herramientas/backend-simulado.mjs [--puerto 8090]
 *
 * Endpoints:
 *   GET  /api/v1/rutas                      una ruta con 6 paradas de Jalapa
 *   GET  /api/v1/rutas/1/resumen            personas esperando por parada
 *   GET  /api/v1/telemetria/posicion        posición del bus
 *   GET  /api/v1/telemetria/stream          SSE: una posición cada 3 s (el bus avanza)
 *   POST /api/v1/reservas                   201 con una reserva ACTIVA
 *   GET  /salud                             200 (para saber que el simulador vive)
 *
 * No es el backend real: no valida nada ni guarda nada. No lo uses en QA ni en
 * producción. Node 18 o superior, sin dependencias.
 */
import http from 'node:http';

const indice = process.argv.indexOf('--puerto');
const PUERTO = indice >= 0 ? Number(process.argv[indice + 1]) : 8090;

const paradas = [
  { id: 1, nombre: '1a Calle - Mercado', latitud: 14.6338, longitud: -89.9885, orden: 1 },
  { id: 2, nombre: 'Portón azul del Instituto Normal', latitud: 14.6352, longitud: -89.9861, orden: 2 },
  { id: 3, nombre: 'Parque Central', latitud: 14.6367, longitud: -89.9838, orden: 3 },
  { id: 4, nombre: 'Gasolinera Puma', latitud: 14.6381, longitud: -89.9815, orden: 4 },
  { id: 5, nombre: 'Hospital Nacional', latitud: 14.6394, longitud: -89.9792, orden: 5 },
  { id: 6, nombre: 'Terminal', latitud: 14.6408, longitud: -89.9769, orden: 6 },
];

const ruta = {
  id: 1,
  nombre: 'Ruta Jalapa Centro',
  activa: true,
  paradas: paradas,
  trazado: paradas.map((p) => ({ latitud: p.latitud, longitud: p.longitud })),
};

let paso = 0;
function posicionActual() {
  const tramo = paradas[paso % paradas.length];
  return {
    latitud: tramo.latitud,
    longitud: tramo.longitud,
    velocidadKmh: 18,
    timestamp: new Date().toISOString(),
    vehiculo: 'BUS-01',
  };
}

const cabecerasCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(respuesta, estado, cuerpo) {
  respuesta.writeHead(estado, { 'Content-Type': 'application/json', ...cabecerasCors });
  respuesta.end(JSON.stringify(cuerpo));
}

const servidor = http.createServer((peticion, respuesta) => {
  const { pathname } = new URL(peticion.url ?? '/', 'http://simulado');
  console.log(`${new Date().toISOString()} ${peticion.method} ${pathname}`);

  if (peticion.method === 'OPTIONS') {
    respuesta.writeHead(204, cabecerasCors);
    return respuesta.end();
  }
  if (pathname === '/salud') return json(respuesta, 200, { estado: 'ok' });
  if (pathname === '/api/v1/rutas') return json(respuesta, 200, [ruta]);
  if (pathname === '/api/v1/rutas/1/resumen') {
    return json(respuesta, 200, {
      reservasActivas: {
        porParada: paradas.map((p, i) => ({ paradaId: p.id, reservasActivas: (i * 2) % 5 })),
        calculadoEn: new Date().toISOString(),
      },
    });
  }
  if (pathname === '/api/v1/telemetria/posicion') return json(respuesta, 200, posicionActual());
  if (pathname === '/api/v1/telemetria/stream') {
    respuesta.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...cabecerasCors,
    });
    const enviar = () => {
      paso += 1;
      respuesta.write(`retry: 3000\nevent: posicion\ndata: ${JSON.stringify(posicionActual())}\n\n`);
    };
    enviar();
    const temporizador = setInterval(enviar, 3000);
    peticion.on('close', () => clearInterval(temporizador));
    return;
  }
  if (pathname === '/api/v1/reservas' && peticion.method === 'POST') {
    return json(respuesta, 201, {
      id: 1000 + Math.floor(Math.random() * 1000),
      paradaId: 1,
      estado: 'ACTIVA',
      expiraEn: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
  }
  return json(respuesta, 404, {
    timestamp: new Date().toISOString(),
    status: 404,
    error: 'Not Found',
    message: 'El simulador no conoce esta ruta',
    path: pathname,
  });
});

servidor.listen(PUERTO, () => {
  console.log(`Backend simulado de EcoRuta escuchando en http://localhost:${PUERTO}  (Ctrl+C para parar)`);
});
