import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';
import {
  esMasReciente,
  suscribirseAPosiciones,
  type EstadoConexion,
  type FabricaDeFuente,
} from '../core/flujoDePosiciones';
import type { Posicion } from '../core/tipos';

/** Ruta de respaldo cuando el flujo en vivo no conecta (SCRUM-139, HU-44). */
export const RUTA_POSICION = '/api/v1/telemetria/posicion';

export interface EstadoPosicionBus {
  /** `null` mientras no haya ninguna posicion todavia. No es un error. */
  posicion: Posicion | null;
  estadoConexion: EstadoConexion;
  /** Cuando llego el ultimo dato AL CLIENTE. Distinto del reloj del dispositivo. */
  recibidoEn: Date | null;
  /** Solo de la carga inicial. Que el flujo se corte no es un error de pantalla. */
  error: ErrorApi | null;
  /** Ya se resolvio la primera consulta, haya traido posicion o no. */
  cargaInicialLista: boolean;
}

/**
 * Posicion del bus en vivo (SCRUM-243 y SCRUM-244).
 *
 * Hace dos cosas a la vez, y por eso van juntas:
 *
 * 1. Consulta GET /telemetria/posicion al montar, para pintar el bus sin esperar
 *    al primer evento. Un 204 significa que aun no hay ninguna, no un error.
 * 2. Abre el flujo SSE y actualiza con cada posicion que llega.
 *
 * Cierra el flujo y cancela la consulta al desmontar.
 *
 * Deja fuera a proposito: la interpolacion del marcador (SCRUM-245), la espera
 * creciente al reconectar (SCRUM-246) y como se presenta la falta de posicion
 * (SCRUM-247). Este hook solo entrega el dato y el estado.
 */
export function usePosicionBus(crearFuente?: FabricaDeFuente): EstadoPosicionBus {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('conectando');
  const [recibidoEn, setRecibidoEn] = useState<Date | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargaInicialLista, setCargaInicialLista] = useState(false);

  // La ultima posicion en una ref, no en el estado: el comparador de frescura
  // corre dentro de callbacks que no se vuelven a crear, y leer el estado ahi
  // daria siempre el valor de la primera renderizacion.
  const ultima = useRef<Posicion | null>(null);

  function aceptarSiEsMasReciente(candidata: Posicion) {
    if (!esMasReciente(candidata, ultima.current)) return;
    ultima.current = candidata;
    setPosicion(candidata);
    setRecibidoEn(new Date());
  }

  useEffect(() => {
    const control = new AbortController();
    let vigente = true;

    // 1. Carga inicial. Si el flujo ya trajo algo mas nuevo mientras esta
    //    consulta viajaba, aceptarSiEsMasReciente la descarta sola.
    apiClient
      .get<Posicion>(RUTA_POSICION, { signal: control.signal })
      .then((datos) => {
        if (!vigente) return;
        if (datos) aceptarSiEsMasReciente(datos);
        setCargaInicialLista(true);
      })
      .catch((causa) => {
        if (!vigente) return;
        // Que la carga inicial falle no impide que el flujo en vivo funcione.
        setError(causa instanceof ErrorApi ? causa : new ErrorApi(0, String(causa)));
        setCargaInicialLista(true);
      });

    // 2. Flujo en vivo.
    const cerrar = suscribirseAPosiciones(
      {
        onPosicion: (nueva) => vigente && aceptarSiEsMasReciente(nueva),
        onEstado: (estado) => vigente && setEstadoConexion(estado),
      },
      crearFuente,
    );

    return () => {
      vigente = false;
      control.abort();
      cerrar();
    };
    // crearFuente solo se inyecta en pruebas y no cambia en vida del componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { posicion, estadoConexion, recibidoEn, error, cargaInicialLista };
}
