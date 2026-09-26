import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, getIdToken, signInWithPopup, signOut } from 'firebase/auth';
import { ErrorApi } from '../errores';
import { authFirebase } from '../firebase';
import { obtenerIdDispositivo } from '../identidadDispositivo';
import { SesionPasajeroContext } from './SesionPasajeroContext';
import {
  guardarModo,
  guardarSesionPasajero,
  intercambiarTokenPasajero,
  leerModo,
  leerSesionPasajero,
  vincularNavegador,
  type ModoPasajero,
  type SesionPasajero,
  type Vinculacion,
} from './sesionPasajero';

export const MENSAJE_ERROR_GOOGLE =
  'No pudimos iniciar sesión con Google. Puedes intentarlo de nuevo o seguir como invitado.';

/** Cerrar la ventana de Google no es un error: la persona cambio de idea. */
const CANCELADO = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function codigo(causa: unknown): string {
  return causa && typeof causa === 'object' && 'code' in causa ? String(causa.code) : '';
}

/**
 * Sesion opcional del pasajero (SCRUM-26, B.1). Google solo prueba la
 * identidad: con el JWT del backend en mano se cierra la sesion de Firebase,
 * igual que en el panel municipal, para no mezclarla con la del conductor.
 */
export function SesionPasajeroProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionPasajero | null>(() => leerSesionPasajero());
  const [modo, setModo] = useState<ModoPasajero | null>(() => {
    const guardado = leerModo();
    // Una cuenta con la sesion vencida vuelve a elegir como entrar.
    if (guardado === 'cuenta' && !leerSesionPasajero()) return null;
    return guardado;
  });
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vinculacion, setVinculacion] = useState<Vinculacion | null>(null);

  // Con sesion, lo que se hizo desde este navegador tambien queda en la cuenta.
  useEffect(() => {
    if (modo !== 'cuenta' || !sesion) return;
    vincularNavegador(sesion.token, obtenerIdDispositivo()).catch(() => {
      // Sin red se reintenta en la proxima visita; nada se pierde.
    });
  }, [modo, sesion]);

  const entrarComoInvitado = useCallback(() => {
    guardarModo('invitado');
    setModo('invitado');
    setError(null);
  }, []);

  const iniciarConGoogle = useCallback(async () => {
    setError(null);
    setIniciando(true);
    try {
      const credencial = await signInWithPopup(authFirebase, new GoogleAuthProvider());
      const nueva = await intercambiarTokenPasajero(await getIdToken(credencial.user));
      guardarSesionPasajero(nueva);
      guardarModo('cuenta');
      try {
        const hecho = await vincularNavegador(nueva.token, obtenerIdDispositivo());
        if (hecho.reservasVinculadas + hecho.opinionesVinculadas > 0) setVinculacion(hecho);
      } catch {
        // La vinculacion se repite en la proxima visita.
      }
      setSesion(nueva);
      setModo('cuenta');
    } catch (causa) {
      if (!CANCELADO.has(codigo(causa))) {
        setError(causa instanceof ErrorApi && causa.esFallaDeRed
          ? 'Sin conexión: no pudimos iniciar sesión. Puedes intentarlo de nuevo o seguir como invitado.'
          : MENSAJE_ERROR_GOOGLE);
      }
    } finally {
      try {
        await signOut(authFirebase);
      } catch {
        // La sesion del pasajero ya no depende de Firebase.
      }
      setIniciando(false);
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    guardarSesionPasajero(null);
    guardarModo('invitado');
    setSesion(null);
    setModo('invitado');
    setVinculacion(null);
  }, []);

  const descartarVinculacion = useCallback(() => setVinculacion(null), []);

  const valor = useMemo(
    () => ({ modo, sesion, iniciando, error, vinculacion, entrarComoInvitado, iniciarConGoogle, cerrarSesion, descartarVinculacion }),
    [modo, sesion, iniciando, error, vinculacion, entrarComoInvitado, iniciarConGoogle, cerrarSesion, descartarVinculacion],
  );

  return <SesionPasajeroContext.Provider value={valor}>{children}</SesionPasajeroContext.Provider>;
}
