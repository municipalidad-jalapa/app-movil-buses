import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { confirmarAbordaje } from '../core/reservas';
import type { EstadoReserva, Reserva } from '../core/tipos';

/**
 * Estado compartido de la reserva del pasajero (HU-58).
 *
 * Hasta HU-53 la reserva vivia dentro de `PantallaRegistro` y moria al navegar.
 * La historia pide que la pantalla refleje el nuevo estado sin recargar, y quien
 * muestra la pregunta de abordaje es el mapa, no la pantalla de registro: hace
 * falta un estado que las dos vean.
 *
 * Se persiste en localStorage porque el aviso llega minutos despues de reservar,
 * casi siempre con la pestana cerrada.
 */

const CLAVE_RESERVA = 'ecoruta_reserva';

export interface ContextoReserva {
  reserva: Reserva | null;
  /** true mientras se envia la respuesta de abordaje. */
  respondiendo: boolean;
  /** Falla al responder el abordaje. La reserva no se pierde. */
  errorAbordaje: unknown;
  guardarReserva: (reserva: Reserva) => void;
  limpiarReserva: () => void;
  responderAbordaje: (subio: boolean) => Promise<void>;
}

export const contextoReserva = createContext<ContextoReserva | null>(null);

function esEstadoValido(valor: unknown): valor is EstadoReserva {
  return valor === 'ACTIVA' || valor === 'ABORDO' || valor === 'CANCELADA';
}

/** localStorage puede tener basura de una version anterior: se valida siempre. */
export function leerReservaGuardada(): Reserva | null {
  try {
    const crudo = localStorage.getItem(CLAVE_RESERVA);
    if (!crudo) return null;

    const datos = JSON.parse(crudo) as Partial<Reserva>;

    if (
      typeof datos.id !== 'number' ||
      typeof datos.paradaId !== 'number' ||
      typeof datos.expiraEn !== 'string' ||
      !esEstadoValido(datos.estado)
    ) {
      return null;
    }

    return { id: datos.id, paradaId: datos.paradaId, estado: datos.estado, expiraEn: datos.expiraEn };
  } catch {
    return null;
  }
}

function escribirReserva(reserva: Reserva | null): void {
  try {
    if (reserva) {
      localStorage.setItem(CLAVE_RESERVA, JSON.stringify(reserva));
    } else {
      localStorage.removeItem(CLAVE_RESERVA);
    }
  } catch {
    // Sin almacenamiento la reserva vive solo en memoria: se pierde al recargar,
    // pero la sesion en curso sigue funcionando.
  }
}

export function ReservaProvider({ children }: { children: ReactNode }) {
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [respondiendo, setRespondiendo] = useState(false);
  const [errorAbordaje, setErrorAbordaje] = useState<unknown>(null);

  // Se hidrata en un efecto y no en el useState inicial para no tocar
  // localStorage durante el render.
  useEffect(() => {
    setReserva(leerReservaGuardada());
  }, []);

  const guardarReserva = useCallback((nueva: Reserva) => {
    setErrorAbordaje(null);
    setReserva(nueva);
    escribirReserva(nueva);
  }, []);

  const limpiarReserva = useCallback(() => {
    setReserva(null);
    escribirReserva(null);
  }, []);

  const responderAbordaje = useCallback(
    async (subio: boolean) => {
      const actual = leerReservaGuardada() ?? reserva;
      if (!actual) return;

      setRespondiendo(true);
      setErrorAbordaje(null);

      try {
        const respuesta = await confirmarAbordaje(actual.id, subio);
        const actualizada: Reserva = { ...actual, estado: respuesta.estado };
        setReserva(actualizada);
        escribirReserva(actualizada);
      } catch (causa) {
        setErrorAbordaje(causa);
      } finally {
        setRespondiendo(false);
      }
    },
    [reserva],
  );

  const valor = useMemo<ContextoReserva>(
    () => ({
      reserva,
      respondiendo,
      errorAbordaje,
      guardarReserva,
      limpiarReserva,
      responderAbordaje,
    }),
    [reserva, respondiendo, errorAbordaje, guardarReserva, limpiarReserva, responderAbordaje],
  );

  return <contextoReserva.Provider value={valor}>{children}</contextoReserva.Provider>;
}
