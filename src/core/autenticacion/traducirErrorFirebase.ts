const MENSAJE_CREDENCIALES = 'El correo o la contraseña no son correctos.';
const MENSAJE_DEMASIADOS = 'Demasiados intentos. Espera un momento.';
const MENSAJE_RED = 'Sin datos nuevos: revisa tu conexion e intenta de nuevo.';
const MENSAJE_GENERICO = 'No se pudo iniciar sesión. Intenta de nuevo.';

const POR_CODIGO: Record<string, string> = {
  'auth/invalid-credential': MENSAJE_CREDENCIALES,
  'auth/wrong-password': MENSAJE_CREDENCIALES,
  'auth/user-not-found': MENSAJE_CREDENCIALES,
  'auth/invalid-email': MENSAJE_CREDENCIALES,
  'auth/too-many-requests': MENSAJE_DEMASIADOS,
  'auth/network-request-failed': MENSAJE_RED,
  'auth/user-disabled': 'Esta cuenta no puede entrar. Hablá con la municipalidad.',
};

export function traducirErrorFirebase(causa: unknown): string {
  if (causa && typeof causa === 'object' && 'code' in causa) {
    const codigo = String((causa as { code: string }).code);
    return POR_CODIGO[codigo] ?? MENSAJE_GENERICO;
  }
  return MENSAJE_GENERICO;
}

export const MENSAJE_CREDENCIALES_INVALIDAS = MENSAJE_CREDENCIALES;
export const MENSAJE_SESION_CADUCADA = 'Tu sesión caducó. Inicia sesión de nuevo.';
