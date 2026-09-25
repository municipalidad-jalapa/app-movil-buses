import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ErrorApi } from '../core/errores';
import { obtenerIdDispositivo } from '../core/identidadDispositivo';
import { consultarReserva } from '../core/registroDemanda';
import { confirmarAbordaje } from '../core/reservas';
import type { EstadoReserva, Reserva } from '../core/tipos';

/**
 * Estado compartido de la reserva del pasajero (HU-53, HU-52, HU-124, HU-58).
 *
 * Es la unica fuente de la reserva: la hoja del mapa la crea, la renueva y la
 * suelta; los avisos del bus la usan para preguntar si el pasajero logro subir.
 *
 * Se persiste en localStorage porque el aviso llega minutos despues de reservar,
 * casi siempre con la pestana cerrada, y porque al volver a abrir la app el
 * pasajero tiene que seguir viendo que ya aviso.
 */

const CLAVE_RESERVA = 'ecoruta_reserva';

/** Cada cuanto se compara la reserva vigente con la del servidor. */
export const SINCRONIZAR_RESERVA_MS = 20_000;

const ESTADOS: readonly EstadoReserva[] = ['ACTIVA', 'RENOVADA', 'ABORDO', 'CANCELADA', 'EXPIRADA'];

/** Mientras esta en uno de estos, la reserva cuenta como espera en la parada. */
export function estaVigente(reserva: Reserva, ahora = Date.now()): boolean {
  return (
    (reserva.estado === 'ACTIVA' || reserva.estado === 'RENOVADA') &&
    Date.parse(reserva.expiraEn) > ahora
  );
}

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
  return ESTADOS.includes(valor as EstadoReserva);
}

/**
 * localStorage puede tener basura de una version anterior: se valida siempre.
 * Una reserva que vencio con la app cerrada ya no se devuelve.
 */
export function leerReservaGuardada(ahora = Date.now()): Reserva | null {
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

    const reserva: Reserva = {
      id: datos.id,
      paradaId: datos.paradaId,
      estado: datos.estado,
      expiraEn: datos.expiraEn,
    };
    if ((reserva.estado === 'ACTIVA' || reserva.estado === 'RENOVADA') && !estaVigente(reserva, ahora)) {
      escribirReserva(null);
      return null;
    }
    return reserva;
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
  // Se lee en el primer render: el mapa necesita saber desde el principio si
  // abre sobre una reserva confirmada.
  const [reserva, setReserva] = useState<Reserva | null>(() => leerReservaGuardada());
  const [respondiendo, setRespondiendo] = useState(false);
  const [errorAbordaje, setErrorAbordaje] = useState<unknown>(null);

  const guardarReserva = useCallback((nueva: Reserva) => {
    setErrorAbordaje(null);
    setReserva(nueva);
    escribirReserva(nueva);
  }, []);

  const limpiarReserva = useCallback(() => {
    setErrorAbordaje(null);
    setReserva(null);
    escribirReserva(null);
  }, []);

  // Mientras la reserva esta vigente se compara con la del servidor: el
  // conductor pudo marcar la parada atendida (ABORDO), el servidor pudo
  // expirarla o renovarla otra pestana. Solo se toca si algo cambio.
  const idVigente = reserva && (reserva.estado === 'ACTIVA' || reserva.estado === 'RENOVADA') ? reserva.id : null;
  useEffect(() => {
    if (idVigente === null) return;
    let vivo = true;
    const sincronizar = async () => {
      try {
        const servidor = await consultarReserva(idVigente, obtenerIdDispositivo());
        if (!vivo || !servidor) return;
        setReserva((actual) => {
          if (!actual || actual.id !== servidor.id) return actual;
          if (actual.estado === servidor.estado && actual.expiraEn === servidor.expiraEn) return actual;
          const actualizada: Reserva = { ...actual, estado: servidor.estado, expiraEn: servidor.expiraEn };
          escribirReserva(actualizada);
          return actualizada;
        });
      } catch (causa) {
        // 404: el servidor ya no la tiene para este telefono. Se da por vencida.
        if (vivo && causa instanceof ErrorApi && causa.status === 404) {
          setReserva((actual) => {
            if (!actual || actual.id !== idVigente) return actual;
            const vencida: Reserva = { ...actual, estado: 'EXPIRADA' };
            escribirReserva(vencida);
            return vencida;
          });
        }
        // Sin red u otro error: se sigue con lo guardado y se reintenta luego.
      }
    };
    void sincronizar();
    const temporizador = setInterval(() => void sincronizar(), SINCRONIZAR_RESERVA_MS);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void sincronizar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vivo = false;
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [idVigente]);

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
