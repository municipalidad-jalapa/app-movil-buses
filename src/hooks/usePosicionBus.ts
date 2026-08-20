import { useEffect, useRef, useState } from 'react';
import {
  esMasReciente,
  suscribirseAPosiciones,
  type EstadoConexion,
  type FabricaDeFuente,
} from '../core/flujoDePosiciones';
import type { Posicion } from '../core/tipos';

export interface EstadoPosicionBus {
  /** `null` mientras no haya ninguna posicion todavia. No es un error. */
  posicion: Posicion | null;
  estadoConexion: EstadoConexion;
  /** Cuando llego el ultimo dato AL CLIENTE. Distinto del reloj del dispositivo. */
  recibidoEn: Date | null;
}

/**
 * Posicion del bus en vivo (SCRUM-243).
 *
 * Abre el flujo SSE al montar, expone la ultima posicion recibida y cierra la
 * conexion al desmontar. Sin ese cierre queda una conexion colgada por cada
 * visita a la pantalla.
 *
 * Deja fuera a proposito: la interpolacion del marcador (SCRUM-245), la espera
 * creciente al reconectar (SCRUM-246) y como se presenta la falta de posicion
 * (SCRUM-247). Este hook solo entrega el dato y el estado.
 */
export function usePosicionBus(crearFuente?: FabricaDeFuente): EstadoPosicionBus {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('conectando');
  const [recibidoEn, setRecibidoEn] = useState<Date | null>(null);
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
    let vigente = true;

    const cerrar = suscribirseAPosiciones(
      {
        onPosicion: (nueva) => vigente && aceptarSiEsMasReciente(nueva),
        onEstado: (estado) => vigente && setEstadoConexion(estado),
      },
      crearFuente,
    );

    return () => {
      vigente = false;
      cerrar();
    };
    // crearFuente solo se inyecta en pruebas y no cambia en vida del componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { posicion, estadoConexion, recibidoEn };
}
