import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getIdToken, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { configurarManejador401 } from '../apiClient';
import { ErrorApi } from '../errores';
import { authFirebase } from '../firebase';
import { intercambiarTokenConductor } from './autenticacionApi';
import { AuthContext, type UsuarioConductor } from './AuthContext';
import {
  borrarSesion,
  guardarSesion,
  leerSesion,
  sesionSigueVigente,
  type SesionConductor,
} from './sesionConductor';
import {
  MENSAJE_CREDENCIALES_INVALIDAS,
  MENSAJE_SESION_CADUCADA,
  traducirErrorFirebase,
} from './traducirErrorFirebase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioConductor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeSesion, setMensajeSesion] = useState<string | null>(null);
  const haySesionRef = useRef(sesionSigueVigente(leerSesion() ?? { token: '', expiraEn: 0, rol: '' }));
  const loginEnCursoRef = useRef(false);

  const aplicarSesion = useCallback((sesion: SesionConductor, correo: string | null) => {
    guardarSesion(sesion);
    haySesionRef.current = true;
    setToken(sesion.token);
    setRol(sesion.rol);
    setUsuario({ correo: correo ?? '' });
    setCargando(false);
  }, []);

  const limpiarEstado = useCallback(() => {
    borrarSesion();
    haySesionRef.current = false;
    setUsuario(null);
    setToken(null);
    setRol(null);
    setCargando(false);
  }, []);

  const expirarSesion = useCallback(async () => {
    try {
      await signOut(authFirebase);
    } catch {
      // La limpieza local importa mas que el fallo remoto.
    }
    limpiarEstado();
    setMensajeSesion(MENSAJE_SESION_CADUCADA);
  }, [limpiarEstado]);

  const sincronizarConFirebase = useCallback(
    async (user: User | null) => {
      if (!user) {
        if (loginEnCursoRef.current) {
          setCargando(false);
          return;
        }
        if (haySesionRef.current) {
          await expirarSesion();
          return;
        }
        limpiarEstado();
        return;
      }

      try {
        const idToken = await getIdToken(user);
        const sesion = await intercambiarTokenConductor(idToken);
        aplicarSesion(sesion, user.email);
      } catch (causa) {
        if (loginEnCursoRef.current) {
          setCargando(false);
          return;
        }
        if (causa instanceof ErrorApi && causa.esFallaDeRed) {
          const previa = leerSesion();
          if (previa && sesionSigueVigente(previa)) {
            aplicarSesion(previa, user.email);
            return;
          }
        }
        setCargando(false);
      }
    },
    [aplicarSesion, expirarSesion, limpiarEstado],
  );

  useEffect(() => {
    configurarManejador401(() => {
      if (loginEnCursoRef.current || !haySesionRef.current) return;
      void expirarSesion();
    });

    const cancelar = onIdTokenChanged(authFirebase, (user) => {
      void sincronizarConFirebase(user);
    });

    return () => {
      configurarManejador401(null);
      cancelar();
    };
  }, [expirarSesion, sincronizarConFirebase]);

  const iniciarSesion = useCallback(
    async (correo: string, contrasena: string) => {
      setMensajeSesion(null);
      loginEnCursoRef.current = true;
      try {
        const credencial = await signInWithEmailAndPassword(authFirebase, correo, contrasena);
        const idToken = await getIdToken(credencial.user);
        const sesion = await intercambiarTokenConductor(idToken);
        aplicarSesion(sesion, credencial.user.email);
      } catch (causa) {
        if (causa instanceof ErrorApi && causa.status === 401) {
          try {
            await signOut(authFirebase);
          } catch {
            // El mensaje de credenciales importa mas.
          }
          throw new Error(MENSAJE_CREDENCIALES_INVALIDAS);
        }
        if (causa instanceof ErrorApi) {
          throw new Error(causa.mensajeParaUsuario());
        }
        throw new Error(traducirErrorFirebase(causa));
      } finally {
        loginEnCursoRef.current = false;
      }
    },
    [aplicarSesion],
  );

  const cerrarSesion = useCallback(async () => {
    haySesionRef.current = false;
    try {
      await signOut(authFirebase);
    } catch {
      // Igual se limpia en local.
    }
    limpiarEstado();
    setMensajeSesion(null);
  }, [limpiarEstado]);

  const valor = useMemo(
    () => ({
      usuario,
      token,
      rol,
      cargando,
      mensajeSesion,
      iniciarSesion,
      cerrarSesion,
    }),
    [usuario, token, rol, cargando, mensajeSesion, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
