import { recorridoDeRuta } from './recorridoDeRuta';
import type { Posicion, Punto, Ruta } from './tipos';

/**
 * Contrato temporal de HU-74.
 *
 * Representa la informacion que posteriormente debera entregar:
 * GET /api/v1/rutas/{rutaId}/eta
 */
export interface EtaParada {
  paradaId: number;
  orden: number;
  minutos: number | null;
  confiable: boolean;
}

export interface EtaRuta {
  rutaId: number;
  vehiculoId: number | null;
  calculadoEn: string;
  paradas: EtaParada[];
  proximaSalida?: string;
}

export type EstadoEta =
  | {
      tipo: 'llegada';
      minutos: number;
      confiable: boolean;
    }
  | {
      tipo: 'proxima-salida';
      hora: string;
    }
  | {
      tipo: 'sin-datos';
    };

interface UbicacionEnRecorrido {
  distanciaDesdeInicioKm: number;
  distanciaARutaMetros: number;
}

/**
 * Calcula temporalmente el ETA en el frontend mientras
 * GET /api/v1/rutas/{rutaId}/eta todavia no existe.
 *
 * Utiliza:
 * - posicion real reportada por telemetria
 * - velocidad real reportada por el bus
 * - trazado real de la ruta
 * - ubicacion de cada parada
 */
export async function obtenerEtaSimulado(
  ruta: Ruta,
  posicionBus: Posicion | null,
): Promise<EtaRuta> {
  const ahora = new Date();

  const recorrido = recorridoDeRuta(ruta);

  if (
    posicionBus === null ||
    recorrido.length < 2
  ) {
    return {
      rutaId: ruta.id,
      vehiculoId: null,
      calculadoEn: ahora.toISOString(),

      paradas: ruta.paradas.map((parada) => ({
        paradaId: parada.id,
        orden: parada.orden,
        minutos: null,
        confiable: false,
      })),

      proximaSalida:
        calcularProximaSalida(ahora),
    };
  }

  const velocidad =
    posicionBus.velocidadKmh;

  /**
   * Si no tenemos una velocidad util,
   * no inventamos un tiempo de llegada.
   */
  if (
    velocidad === null ||
    velocidad < 5
  ) {
    return {
      rutaId: ruta.id,
      vehiculoId: null,
      calculadoEn: ahora.toISOString(),

      paradas: ruta.paradas.map((parada) => ({
        paradaId: parada.id,
        orden: parada.orden,
        minutos: null,
        confiable: false,
      })),

      proximaSalida:
        calcularProximaSalida(ahora),
    };
  }

  const totalRutaKm =
    longitudRecorridoKm(recorrido);

  const ubicacionBus =
    localizarEnRecorrido(
      recorrido,
      posicionBus,
    );

  /**
   * Determinamos si la ruta vuelve cerca
   * de su punto inicial.
   *
   * No exigimos que los extremos sean
   * exactamente iguales.
   */
  const esCircuito =
    esRecorridoCircular(
      recorrido,
      totalRutaKm,
    );

  const paradas: EtaParada[] =
    ruta.paradas.map((parada) => {
      const ubicacionParada =
        localizarEnRecorrido(
          recorrido,
          parada,
        );

      const distanciaRestanteKm =
        distanciaRestante(
          ubicacionBus.distanciaDesdeInicioKm,
          ubicacionParada.distanciaDesdeInicioKm,
          totalRutaKm,
          esCircuito,
        );

      if (distanciaRestanteKm === null) {
        return {
          paradaId: parada.id,
          orden: parada.orden,
          minutos: null,
          confiable: false,
        };
      }

      /**
       * tiempo = distancia / velocidad
       *
       * Multiplicamos por 60 para convertir
       * el resultado de horas a minutos.
       */
      const minutosCalculados =
        Math.max(
          1,
          Math.ceil(
            (distanciaRestanteKm /
              velocidad) *
              60,
          ),
        );

      /**
       * La estimacion es confiable cuando:
       *
       * - el bus esta cerca del trazado
       * - la parada no esta demasiado lejos
       *
       * Si la distancia es mayor, mostramos
       * el valor como aproximado.
       */
      const confiable =
        ubicacionBus.distanciaARutaMetros <= 100 &&
        distanciaRestanteKm <= 1.5;

      return {
        paradaId: parada.id,
        orden: parada.orden,
        minutos: minutosCalculados,
        confiable,
      };
    });

  return {
    rutaId: ruta.id,

    vehiculoId: null,

    calculadoEn:
      ahora.toISOString(),

    paradas,

    proximaSalida:
      calcularProximaSalida(ahora),
  };
}

/**
 * Decide que informacion debe mostrar
 * la pantalla para la parada seleccionada.
 */
export function obtenerEstadoEta(
  eta: EtaRuta,
  paradaId: number,
  recorridoIniciado: boolean,
): EstadoEta {
  if (!recorridoIniciado) {
    if (eta.proximaSalida) {
      return {
        tipo: 'proxima-salida',
        hora: eta.proximaSalida,
      };
    }

    return {
      tipo: 'sin-datos',
    };
  }

  const parada = eta.paradas.find(
    (item) =>
      item.paradaId === paradaId,
  );

  if (
    !parada ||
    parada.minutos === null
  ) {
    return {
      tipo: 'sin-datos',
    };
  }

  return {
    tipo: 'llegada',
    minutos: parada.minutos,
    confiable: parada.confiable,
  };
}

/**
 * Busca la parte del recorrido mas cercana
 * a una posicion geografica.
 *
 * Tambien devuelve cuantos kilometros
 * se han recorrido desde el inicio.
 */
function localizarEnRecorrido(
  recorrido: Punto[],
  punto: Punto,
): UbicacionEnRecorrido {
  let mejorDistanciaMetros =
    Number.POSITIVE_INFINITY;

  let mejorDistanciaDesdeInicioKm = 0;

  let acumuladoKm = 0;

  for (
    let i = 0;
    i < recorrido.length - 1;
    i++
  ) {
    const inicio = recorrido[i];
    const fin = recorrido[i + 1];

    const longitudSegmentoKm =
      distanciaKm(
        inicio,
        fin,
      );

    const proyeccion =
      proyectarSobreSegmento(
        punto,
        inicio,
        fin,
      );

    const distanciaAlSegmentoMetros =
      distanciaKm(
        punto,
        proyeccion.punto,
      ) * 1000;

    if (
      distanciaAlSegmentoMetros <
      mejorDistanciaMetros
    ) {
      mejorDistanciaMetros =
        distanciaAlSegmentoMetros;

      mejorDistanciaDesdeInicioKm =
        acumuladoKm +
        longitudSegmentoKm *
          proyeccion.factor;
    }

    acumuladoKm +=
      longitudSegmentoKm;
  }

  return {
    distanciaDesdeInicioKm:
      mejorDistanciaDesdeInicioKm,

    distanciaARutaMetros:
      mejorDistanciaMetros,
  };
}

/**
 * Proyecta un punto geografico
 * sobre un segmento del recorrido.
 *
 * factor:
 * 0 = inicio del segmento
 * 1 = final del segmento
 */
function proyectarSobreSegmento(
  punto: Punto,
  inicio: Punto,
  fin: Punto,
): {
  punto: Punto;
  factor: number;
} {
  const latitudMedia =
    ((inicio.latitud +
      fin.latitud +
      punto.latitud) /
      3) *
    (Math.PI / 180);

  const escalaX =
    111.32 *
    Math.cos(latitudMedia);

  const escalaY = 110.57;

  const ax =
    inicio.longitud * escalaX;

  const ay =
    inicio.latitud * escalaY;

  const bx =
    fin.longitud * escalaX;

  const by =
    fin.latitud * escalaY;

  const px =
    punto.longitud * escalaX;

  const py =
    punto.latitud * escalaY;

  const abX =
    bx - ax;

  const abY =
    by - ay;

  const apX =
    px - ax;

  const apY =
    py - ay;

  const longitudCuadrada =
    abX * abX +
    abY * abY;

  let factor =
    longitudCuadrada === 0
      ? 0
      : (
          apX * abX +
          apY * abY
        ) /
        longitudCuadrada;

  factor = Math.max(
    0,
    Math.min(
      1,
      factor,
    ),
  );

  return {
    factor,

    punto: {
      latitud:
        inicio.latitud +
        (
          fin.latitud -
          inicio.latitud
        ) *
          factor,

      longitud:
        inicio.longitud +
        (
          fin.longitud -
          inicio.longitud
        ) *
          factor,
    },
  };
}

/**
 * Determina si el recorrido vuelve
 * cerca de su punto inicial.
 *
 * El trazado real puede terminar
 * algunos metros antes o despues,
 * por eso no exigimos cierre exacto.
 */
function esRecorridoCircular(
  recorrido: Punto[],
  totalRutaKm: number,
): boolean {
  if (recorrido.length < 2) {
    return false;
  }

  const distanciaEntreExtremosKm =
    distanciaKm(
      recorrido[0],
      recorrido[
        recorrido.length - 1
      ],
    );

  /**
   * Permitimos:
   *
   * - hasta 300 metros
   * - o hasta 8 % del largo de la ruta
   *
   * Se utiliza la tolerancia mayor.
   */
  const toleranciaKm =
    Math.max(
      0.3,
      totalRutaKm * 0.08,
    );

  return (
    distanciaEntreExtremosKm <=
    toleranciaKm
  );
}

/**
 * Calcula cuanto falta para llegar
 * a una parada siguiendo la ruta.
 */
function distanciaRestante(
  posicionBusKm: number,
  posicionParadaKm: number,
  totalRutaKm: number,
  esCircuito: boolean,
): number | null {
  /**
   * La parada todavia esta adelante
   * del bus en esta vuelta.
   */
  if (
    posicionParadaKm >=
    posicionBusKm
  ) {
    return (
      posicionParadaKm -
      posicionBusKm
    );
  }

  /**
   * La parada ya quedo atras,
   * pero la ruta es circular.
   *
   * Calculamos lo que falta hasta
   * terminar la vuelta y volver
   * desde el inicio hasta la parada.
   */
  if (esCircuito) {
    return (
      totalRutaKm -
      posicionBusKm +
      posicionParadaKm
    );
  }

  /**
   * Si no es circuito y la parada
   * ya quedo atras, no inventamos
   * otra vuelta.
   */
  return null;
}

/**
 * Longitud total del trazado.
 */
function longitudRecorridoKm(
  recorrido: Punto[],
): number {
  let total = 0;

  for (
    let i = 0;
    i < recorrido.length - 1;
    i++
  ) {
    total +=
      distanciaKm(
        recorrido[i],
        recorrido[i + 1],
      );
  }

  return total;
}

/**
 * Distancia Haversine entre
 * dos coordenadas geograficas.
 */
function distanciaKm(
  a: Punto,
  b: Punto,
): number {
  const radioTierraKm = 6371;

  const lat1 =
    gradosARadianes(
      a.latitud,
    );

  const lat2 =
    gradosARadianes(
      b.latitud,
    );

  const diferenciaLat =
    gradosARadianes(
      b.latitud -
      a.latitud,
    );

  const diferenciaLon =
    gradosARadianes(
      b.longitud -
      a.longitud,
    );

  const senoLat =
    Math.sin(
      diferenciaLat / 2,
    );

  const senoLon =
    Math.sin(
      diferenciaLon / 2,
    );

  const valor =
    senoLat * senoLat +
    Math.cos(lat1) *
      Math.cos(lat2) *
      senoLon *
      senoLon;

  return (
    radioTierraKm *
    2 *
    Math.atan2(
      Math.sqrt(valor),
      Math.sqrt(
        1 - valor,
      ),
    )
  );
}

function gradosARadianes(
  grados: number,
): number {
  return (
    grados *
    (Math.PI / 180)
  );
}

/**
 * Horario temporal mientras
 * no exista el servicio real
 * de horarios.
 */
function calcularProximaSalida(
  fecha: Date,
): string {
  const proxima =
    new Date(fecha);

  const minutos =
    fecha.getMinutes();

  if (minutos < 30) {
    proxima.setMinutes(
      30,
      0,
      0,
    );
  } else {
    proxima.setHours(
      fecha.getHours() + 1,
      0,
      0,
      0,
    );
  }

  return proxima.toLocaleTimeString(
    'es-GT',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}
