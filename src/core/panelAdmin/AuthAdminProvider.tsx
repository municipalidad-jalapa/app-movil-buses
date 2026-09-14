import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { getIdToken, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ErrorApi } from '../errores';
import { authFirebase } from '../firebase';
import { traducirErrorFirebase } from '../autenticacion/traducirErrorFirebase';
import { AuthAdminContext, type EstadoAccesoAdmin, type MotivoCierre } from './AuthAdminContext';
import { intercambiarTokenAdmin, renovarSesionAdmin } from './panelAdminApi';
import {
  borrarSesionAdmin,
  guardarSesionAdmin,
  leerSesionAdmin,
  sesionAdminVigente,
  type SesionAdmin,
} from './sesionAdmin';

export const MENSAJE_CREDENCIALES_ADMIN = 'El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.';

const CODIGOS_DE_CREDENCIALES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
]);

function mensajeDeFirebase(causa: unknown): string {
  const codigo = causa && typeof causa === 'object' && 'code' in causa ? String(causa.code) : '';
  return CODIGOS_DE_CREDENCIALES.has(codigo) ? MENSAJE_CREDENCIALES_ADMIN : traducirErrorFirebase(causa);
}

/**
 * Sesion del panel municipal (SCRUM-173).
 *
 * Firebase solo sirve para probar la identidad: en cuanto el backend entrega su
 * JWT de administrador, se cierra la sesion de Firebase. Asi la sesion del panel
 * depende de un unico reloj, el del JWT, que el backend no renueva sin actividad.
 */
export function AuthAdminProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionAdmin | null>(() => {
    const guardada = leerSesionAdmin();
    return sesionAdminVigente(guardada) ? guardada : null;
  });
  const [estado, setEstado] = useState<EstadoAccesoAdmin>(() => (sesion ? 'dentro' : 'fuera'));
  const [correoDenegado, setCorreoDenegado] = useState<string | null>(null);
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre>(null);

  const aplicar = useCallback((nueva: SesionAdmin) => {
    guardarSesionAdmin(nueva);
    setSesion(nueva);
    setEstado('dentro');
  }, []);

  const cerrarSesion = useCallback((motivo: MotivoCierre = null) => {
    borrarSesionAdmin();
    setSesion(null);
    setEstado('fuera');
    setMotivoCierre(motivo);
  }, []);

  const iniciarSesion = useCallback(
    async (correo: string, contrasena: string) => {
      setMotivoCierre(null);
      let credencial;
      try {
        credencial = await signInWithEmailAndPassword(authFirebase, correo, contrasena);
      } catch (causa) {
        throw new Error(mensajeDeFirebase(causa));
      }
      try {
        const idToken = await getIdToken(credencial.user);
        aplicar(await intercambiarTokenAdmin(idToken, credencial.user.email ?? correo));
      } catch (causa) {
        if (causa instanceof ErrorApi && causa.status === 403) {
          setCorreoDenegado(credencial.user.email ?? correo);
          setEstado('denegado');
          return;
        }
        if (causa instanceof ErrorApi && causa.status === 401) {
          throw new Error(MENSAJE_CREDENCIALES_ADMIN);
        }
        throw new Error(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : mensajeDeFirebase(causa));
      } finally {
        try {
          await signOut(authFirebase);
        } catch {
          // La sesion del panel ya no depende de Firebase.
        }
      }
    },
    [aplicar],
  );

  const renovarSesion = useCallback(async () => {
    if (!sesion) return;
    try {
      aplicar(await renovarSesionAdmin(sesion));
    } catch (causa) {
      if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
        cerrarSesion('caducada');
      }
      // Sin red: se reintenta con la siguiente actividad; el token sigue hasta su vencimiento.
    }
  }, [aplicar, cerrarSesion, sesion]);

  const usarOtraCuenta = useCallback(() => {
    setCorreoDenegado(null);
    setEstado('fuera');
  }, []);

  const valor = useMemo(
    () => ({ estado, sesion, correoDenegado, motivoCierre, iniciarSesion, renovarSesion, cerrarSesion, usarOtraCuenta }),
    [estado, sesion, correoDenegado, motivoCierre, iniciarSesion, renovarSesion, cerrarSesion, usarOtraCuenta],
  );

  return <AuthAdminContext.Provider value={valor}>{children}</AuthAdminContext.Provider>;
}
