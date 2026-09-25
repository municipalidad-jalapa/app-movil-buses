import { useCallback, useState } from 'react';
import { variableOpcional } from '../core/config';

export interface Ubicacion {
  latitud: number;
  longitud: number;
}

interface EstadoUbicacion {
  ubicacion: Ubicacion | null;
  solicitando: boolean;
  error: string | null;
  solicitarUbicacion: () => Promise<Ubicacion | null>;
}

function mensajeErrorUbicacion(codigo: number): string {
  switch (codigo) {
    case 1:
      return 'No pudimos acceder a tu ubicación. Habilita el permiso de ubicación en el navegador e intenta de nuevo.';
    case 2:
      return 'No pudimos obtener tu ubicación en este momento. Intenta de nuevo.';
    case 3:
      return 'La ubicación tardó demasiado en responder. Intenta de nuevo.';
    default:
      return 'No pudimos obtener tu ubicación. Intenta de nuevo.';
  }
}

/**
 * Ubicacion fija para pruebas locales (QA, ronda 2): `VITE_UBICACION_SIMULADA`
 * con "latitud,longitud". Solo en desarrollo: en un build de produccion se
 * ignora aunque la variable venga puesta, para que nunca reemplace el GPS real.
 */
export function ubicacionSimulada(entorno: { DEV?: boolean; VITE_UBICACION_SIMULADA?: string }): Ubicacion | null {
  if (!entorno.DEV || !entorno.VITE_UBICACION_SIMULADA) return null;
  const [latitud, longitud] = entorno.VITE_UBICACION_SIMULADA.split(',').map((v) => Number(v.trim()));
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null;
  if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return null;
  return { latitud, longitud };
}

/**
 * Obtiene la ubicación actual del pasajero mediante navigator.geolocation.
 *
 * La pantalla debe explicar al usuario para qué se necesita la ubicación
 * antes de llamar a solicitarUbicacion().
 */
export function useUbicacion(): EstadoUbicacion {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [solicitando, setSolicitando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitarUbicacion = useCallback((): Promise<Ubicacion | null> => {
    setSolicitando(true);
    setError(null);

    const simulada = ubicacionSimulada({
      DEV: import.meta.env.DEV,
      VITE_UBICACION_SIMULADA: variableOpcional('VITE_UBICACION_SIMULADA'),
    });
    if (simulada) {
      setUbicacion(simulada);
      setSolicitando(false);
      return Promise.resolve(simulada);
    }

    if (!navigator.geolocation) {
      setSolicitando(false);
      setError('Este navegador no permite obtener tu ubicación.');
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          const nuevaUbicacion: Ubicacion = {
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
          };

          setUbicacion(nuevaUbicacion);
          setSolicitando(false);
          resolve(nuevaUbicacion);
        },
        (fallo) => {
          setError(mensajeErrorUbicacion(fallo.code));
          setSolicitando(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        },
      );
    });
  }, []);

  return {
    ubicacion,
    solicitando,
    error,
    solicitarUbicacion,
 };
}