import { describe, expect, it } from 'vitest';
import { metrosEntre, minutosRestantes, paradaMasCercana, textoDistancia } from './distanciaAParada';

const PARADAS = [
  { id: 1, nombre: 'Parque Central', latitud: 14.634878, longitud: -89.981202, orden: 1 },
  { id: 2, nombre: '1a Calle - Mercado', latitud: 14.63245, longitud: -89.987308, orden: 2 },
  { id: 3, nombre: '1a Calle - El Calvario', latitud: 14.630328, longitud: -89.993654, orden: 3 },
];

describe('distancia a la parada', () => {
  it('mide en metros con la aproximacion del diseno', () => {
    // 0.001 grados de latitud son 110.6 m.
    expect(metrosEntre({ latitud: 14.63, longitud: -89.99 }, { latitud: 14.631, longitud: -89.99 })).toBe(111);
  });

  it('elige la parada mas cercana al pasajero', () => {
    const cerca = { latitud: 14.6323, longitud: -89.9871 };
    expect(paradaMasCercana(PARADAS, cerca)?.id).toBe(2);
  });

  it('sin paradas no inventa una', () => {
    expect(paradaMasCercana([], { latitud: 14.63, longitud: -89.99 })).toBeNull();
  });

  it('escribe la distancia como la hoja de R2', () => {
    const donde = { latitud: 14.63, longitud: -89.99 };
    const parada = { latitud: 14.63217, longitud: -89.99 }; // 240 m al norte
    expect(textoDistancia(parada, donde)).toBe('a 3 min a pie · 240 m');
  });

  it('a pocos pasos dice 1 minuto, no 0', () => {
    const donde = { latitud: 14.63, longitud: -89.99 };
    expect(textoDistancia(donde, donde)).toBe('a 1 min a pie · 0 m');
  });

  it('cuenta los minutos que le quedan a la reserva hacia arriba', () => {
    const ahora = Date.parse('2026-09-10T12:00:00Z');
    expect(minutosRestantes('2026-09-10T12:04:01Z', ahora)).toBe(5);
    expect(minutosRestantes('2026-09-10T12:04:00Z', ahora)).toBe(4);
    expect(minutosRestantes('2026-09-10T11:59:59Z', ahora)).toBe(0);
  });
});
