import { describe, expect, it } from 'vitest';
import {
  armarFilasPanelConductor,
  esDatoFresco,
  formatearEta,
  UMBRAL_DATO_RANCIO_MS,
} from './panelConductor';
import type { ParadaEta, ReservasActivasPorParada, Ruta, RutaEta } from './tipos';

function unaRuta(sobrescribir: Partial<Ruta> = {}): Ruta {
  return {
    id: 1,
    nombre: 'Ruta Centro',
    activa: true,
    trazado: [],
    paradas: [
      { id: 10, nombre: 'Parque Central', latitud: 14.6335, longitud: -89.9885, orden: 1 },
      { id: 11, nombre: 'Mercado', latitud: 14.635, longitud: -89.99, orden: 2 },
      { id: 12, nombre: 'Terminal', latitud: 14.64, longitud: -89.995, orden: 3 },
    ],
    ...sobrescribir,
  };
}

function unaParadaEta(sobrescribir: Partial<ParadaEta> = {}): ParadaEta {
  return {
    paradaId: 10,
    confianza: 'alta',
    etaMinMinutos: 6,
    etaMaxMinutos: 6,
    proximaSalida: null,
    atendida: false,
    ...sobrescribir,
  };
}

describe('armarFilasPanelConductor', () => {
  it('devuelve una lista vacia sin ruta', () => {
    expect(armarFilasPanelConductor(null, null, null, true)).toEqual([]);
  });

  it('ordena las filas por el orden de la parada, no por el orden en que llegan', () => {
    const ruta = unaRuta({
      paradas: [
        { id: 12, nombre: 'Terminal', latitud: 14.64, longitud: -89.995, orden: 3 },
        { id: 10, nombre: 'Parque Central', latitud: 14.6335, longitud: -89.9885, orden: 1 },
        { id: 11, nombre: 'Mercado', latitud: 14.635, longitud: -89.99, orden: 2 },
      ],
    });

    const filas = armarFilasPanelConductor(ruta, null, null, true);

    expect(filas.map((f) => f.paradaId)).toEqual([10, 11, 12]);
  });

  it('acota el panel a las paradas de la ruta del conductor: nunca inventa filas', () => {
    // Criterio de aceptacion: "no muestra paradas ni reservas de otras rutas".
    const ruta = unaRuta({ paradas: [{ id: 10, nombre: 'Parque Central', latitud: 0, longitud: 0, orden: 1 }] });
    const eta: RutaEta = {
      rutaId: 1,
      calculadoEn: '2026-09-08T10:00:00Z',
      paradas: [unaParadaEta({ paradaId: 10 }), unaParadaEta({ paradaId: 999 })],
    };
    const reservas: ReservasActivasPorParada = { rutaId: 1, porParada: { '10': 2, '999': 40 } };

    const filas = armarFilasPanelConductor(ruta, eta, reservas, true);

    expect(filas).toHaveLength(1);
    expect(filas[0].paradaId).toBe(10);
  });

  it('trae las reservas activas de cada parada desde porParada', () => {
    const ruta = unaRuta();
    const reservas: ReservasActivasPorParada = { rutaId: 1, porParada: { '10': 3, '11': 0, '12': 7 } };

    const filas = armarFilasPanelConductor(ruta, null, reservas, true);

    expect(filas.map((f) => f.reservasActivas)).toEqual([3, 0, 7]);
  });

  it('una parada sin dato de reservas se lee como cero, no como error', () => {
    const filas = armarFilasPanelConductor(unaRuta(), null, null, true);

    expect(filas.every((f) => f.reservasActivas === 0)).toBe(true);
  });

  describe('confianza del ETA (DESIGN.md §9)', () => {
    it('confianza alta muestra un numero exacto', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [unaParadaEta({ paradaId: 10, confianza: 'alta', etaMinMinutos: 6, etaMaxMinutos: 6 })],
      };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(fila.eta).toEqual({ tipo: 'exacto', minutos: 6 });
      expect(formatearEta(fila.eta)).toBe('Llega en 6 min');
    });

    it('confianza media muestra un rango, nunca un numero exacto', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [unaParadaEta({ paradaId: 10, confianza: 'media', etaMinMinutos: 6, etaMaxMinutos: 9 })],
      };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(fila.eta).toEqual({ tipo: 'rango', minMinutos: 6, maxMinutos: 9 });
      expect(formatearEta(fila.eta)).toBe('Llega en 6–9 min');
    });

    it('confianza baja no muestra minutos: usa la proxima salida programada', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [
          unaParadaEta({
            paradaId: 10,
            confianza: 'baja',
            etaMinMinutos: null,
            etaMaxMinutos: null,
            proximaSalida: '10:15',
          }),
        ],
      };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(fila.eta).toEqual({ tipo: 'proxima-salida', hora: '10:15' });
      expect(formatearEta(fila.eta)).toBe('Próxima salida 10:15');
    });

    it('sin proxima salida y sin confianza, no inventa un numero enganoso', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [
          unaParadaEta({
            paradaId: 10,
            confianza: 'baja',
            etaMinMinutos: null,
            etaMaxMinutos: null,
            proximaSalida: null,
          }),
        ],
      };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(fila.eta).toEqual({ tipo: 'no-disponible' });
      expect(formatearEta(fila.eta)).toBe('Tiempo no disponible por ahora');
    });

    it('una parada sin ningun dato de ETA se indica como no disponible', () => {
      const eta: RutaEta = { rutaId: 1, calculadoEn: '2026-09-08T10:00:00Z', paradas: [] };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(fila.eta).toEqual({ tipo: 'no-disponible' });
    });

    it('un dato rancio (mas de 5 min) suspende el ETA aunque el backend diga confianza alta', () => {
      // DESIGN.md §7 [DURA]: dato de mas de 5 min => "ETA suspendido".
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [unaParadaEta({ paradaId: 10, confianza: 'alta', etaMinMinutos: 6 })],
      };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, false);

      expect(fila.eta).toEqual({ tipo: 'no-disponible' });
    });
  });

  describe('paradas atendidas', () => {
    it('una parada atendida se distingue de una pendiente', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [
          unaParadaEta({ paradaId: 10, atendida: true }),
          unaParadaEta({ paradaId: 11, atendida: false }),
        ],
      };

      const filas = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(filas.find((f) => f.paradaId === 10)?.atendida).toBe(true);
      expect(filas.find((f) => f.paradaId === 11)?.atendida).toBe(false);
    });

    it('una parada atendida no muestra minutos, aunque el backend los mande', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [unaParadaEta({ paradaId: 10, atendida: true, confianza: 'alta', etaMinMinutos: 4 })],
      };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, null, true);

      expect(fila.eta).toEqual({ tipo: 'atendida' });
      expect(formatearEta(fila.eta)).toBe('Ya pasó por esta parada');
    });

    it('una parada atendida sigue mostrando sus reservas activas', () => {
      const eta: RutaEta = {
        rutaId: 1,
        calculadoEn: '2026-09-08T10:00:00Z',
        paradas: [unaParadaEta({ paradaId: 10, atendida: true })],
      };
      const reservas: ReservasActivasPorParada = { rutaId: 1, porParada: { '10': 5 } };

      const [fila] = armarFilasPanelConductor(unaRuta(), eta, reservas, true);

      expect(fila.reservasActivas).toBe(5);
    });
  });
});

describe('esDatoFresco', () => {
  it('sin dato todavia, no es fresco', () => {
    expect(esDatoFresco(null)).toBe(false);
  });

  it('un dato de hace menos de 5 min es fresco', () => {
    const ahora = Date.parse('2026-09-08T10:05:00Z');
    const actualizadoEn = new Date('2026-09-08T10:03:00Z');

    expect(esDatoFresco(actualizadoEn, ahora)).toBe(true);
  });

  it('un dato de 5 min o mas ya no es fresco', () => {
    const actualizadoEn = new Date('2026-09-08T10:00:00Z');
    const ahora = actualizadoEn.getTime() + UMBRAL_DATO_RANCIO_MS;

    expect(esDatoFresco(actualizadoEn, ahora)).toBe(false);
  });
});
