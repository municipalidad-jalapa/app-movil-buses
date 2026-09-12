import { createContext, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { ErrorApi } from '../core/errores';
import type { Ruta } from '../core/tipos';
import { useRutas } from '../hooks/useRutas';

/**
 * La ruta que el pasajero esta mirando.
 *
 * <p>Con una sola ruta no hacia falta: el mapa tomaba la primera activa. Con dos
 * (V12 agrega la de prueba a la Metroplaza) la elige el pasajero con el selector
 * de la cabecera, y la comparten la cabecera y la pantalla del mapa.
 *
 * <p>Se recuerda en el telefono: quien espera siempre el mismo bus no deberia
 * tener que volver a elegir su ruta cada vez que abre la app.
 */

const CLAVE_RUTA = 'ecoruta_ruta_elegida';

export interface ContextoRutaElegida {
  /** Solo las activas, en el orden del backend. */
  rutas: Ruta[];
  /** La elegida, o la primera activa si todavia no se eligio ninguna. */
  rutaActiva: Ruta | null;
  elegirRuta: (rutaId: number) => void;
  cargando: boolean;
  error: ErrorApi | null;
  reintentar: () => void;
}

export const contextoRutaElegida = createContext<ContextoRutaElegida | null>(null);

function leerRutaGuardada(): number | null {
  try {
    const valor = Number(localStorage.getItem(CLAVE_RUTA));
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

function guardarRuta(rutaId: number): void {
  try {
    localStorage.setItem(CLAVE_RUTA, String(rutaId));
  } catch {
    // Sin almacenamiento la eleccion vale solo mientras la pagina este abierta.
  }
}

export function RutaElegidaProvider({ children }: { children: ReactNode }) {
  const { rutas, cargando, error, reintentar } = useRutas();
  const [elegidaId, setElegidaId] = useState<number | null>(() => leerRutaGuardada());

  const activas = useMemo(() => (rutas ?? []).filter((r) => r.activa), [rutas]);
  // Una ruta guardada que ya no existe o se desactivo no deja la pantalla vacia:
  // se cae a la primera activa.
  const rutaActiva = activas.find((r) => r.id === elegidaId) ?? activas[0] ?? null;

  const elegirRuta = useCallback((rutaId: number) => {
    setElegidaId(rutaId);
    guardarRuta(rutaId);
  }, []);

  const valor = useMemo<ContextoRutaElegida>(
    () => ({ rutas: activas, rutaActiva, elegirRuta, cargando, error, reintentar }),
    [activas, rutaActiva, elegirRuta, cargando, error, reintentar],
  );

  return <contextoRutaElegida.Provider value={valor}>{children}</contextoRutaElegida.Provider>;
}

/** El nombre sin el prefijo de catalogo: "Ruta de prueba - X a Y" -> "X a Y". */
export function nombreCortoDeRuta(nombre: string): string {
  const partes = nombre.split(' - ');
  return partes.length > 1 ? partes.slice(1).join(' - ') : nombre;
}
