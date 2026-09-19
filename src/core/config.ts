import { z } from 'zod';

/**
 * Configuracion de la app (HU-128).
 *
 * Unico punto de acceso a variables de entorno. Nadie mas debe leer
 * `import.meta.env`. Si falta un valor o el formato es invalido, este modulo
 * lanza al cargarse: la app no arranca a medias.
 *
 * Las variables VITE_ viajan en el bundle. No pongas secretos de servidor.
 */

function cadenaObligatoria(variable: string) {
  return z
    .string({
      error: `Falta la variable ${variable}. Copiá .env.example a .env y completala.`,
    })
    .trim()
    .min(1, `Falta la variable ${variable}. Copiá .env.example a .env y completala.`);
}

const esquemaEntorno = z.object({
  VITE_API_BASE_URL: z.url({
    error: 'VITE_API_BASE_URL falta o no es una URL valida. Usa el formato https://api.ejemplo.com',
  }),
  VITE_FIREBASE_API_KEY: cadenaObligatoria('VITE_FIREBASE_API_KEY'),
  VITE_FIREBASE_AUTH_DOMAIN: cadenaObligatoria('VITE_FIREBASE_AUTH_DOMAIN'),
  VITE_FIREBASE_PROJECT_ID: cadenaObligatoria('VITE_FIREBASE_PROJECT_ID'),
  VITE_FIREBASE_APP_ID: cadenaObligatoria('VITE_FIREBASE_APP_ID'),
  VITE_AUTH_CONDUCTOR_SIMULADO: z.string().optional(),
});

/**
 * Firebase Cloud Messaging para los avisos del bus (HU-58).
 *
 * Reutiliza el proyecto de Firebase de la sesion del conductor (HU-129) y le
 * suma lo que solo pide la mensajeria. Nada de esto es secreto: viaja en el
 * bundle. El secreto real es la cuenta de servicio, que vive en el backend.
 */
export interface ConfiguracionMensajeria {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
  readonly vapidKey: string;
}

/** Las que necesita la mensajeria ademas de las de Firebase base. */
const VARIABLES_MENSAJERIA = ['VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_VAPID_KEY'] as const;

function tieneValor(valor: unknown): boolean {
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

/**
 * Tres resultados: sin ninguna de las dos variables, los avisos quedan
 * apagados (`null`) y la app funciona igual. Con las dos, se arma la
 * configuracion. Con una sola se lanza: un `.env` a medias casi siempre es un
 * nombre mal escrito, y es mejor fallar que dejar los avisos mudos.
 */
function leerMensajeria(
  origen: Record<string, unknown>,
  base: { apiKey: string; authDomain: string; projectId: string; appId: string },
): ConfiguracionMensajeria | null {
  const faltantes = VARIABLES_MENSAJERIA.filter((v) => !tieneValor(origen[v]));
  if (faltantes.length === VARIABLES_MENSAJERIA.length) return null;
  if (faltantes.length > 0) {
    throw new Error(
      'Configuracion de avisos incompleta. La aplicacion no puede arrancar.\n' +
        `Faltan estas variables: ${faltantes.join(', ')}.\n` +
        'Ponelas todas o quitalas todas: con algunas puestas los avisos quedarian a medias.',
    );
  }
  return Object.freeze({
    ...base,
    storageBucket: String(origen.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
    messagingSenderId: String(origen.VITE_FIREBASE_MESSAGING_SENDER_ID).trim(),
    vapidKey: String(origen.VITE_FIREBASE_VAPID_KEY).trim(),
  });
}

export interface ConfiguracionEcoRuta {
  readonly apiBaseUrl: string;
  readonly firebaseApiKey: string;
  readonly firebaseAuthDomain: string;
  readonly firebaseProjectId: string;
  readonly firebaseAppId: string;
  /** Solo desarrollo local. Nunca true en produccion. */
  readonly authConductorSimulado: boolean;
  /**
   * `null` cuando el entorno no configura la mensajeria. La app arranca igual
   * y los avisos quedan apagados: que falten no puede tumbar el mapa.
   */
  readonly mensajeria: ConfiguracionMensajeria | null;
}

/** Quita la barra final para que las rutas se concatenen sin duplicarla. */
function normalizarUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function mensajeDeValidacion(error: z.ZodError, origen: Record<string, unknown>): string {
  const lineas = error.issues.map((issue) => {
    const variable = issue.path[0] ? String(issue.path[0]) : 'configuracion';
    const recibido = origen[variable];
    const ausente = recibido === undefined || recibido === null || String(recibido).trim() === '';

    if (variable === 'VITE_API_BASE_URL') {
      return ausente
        ? 'Falta la variable VITE_API_BASE_URL. Copiá .env.example a .env y completala.'
        : `VITE_API_BASE_URL no es una URL valida (valor recibido: "${String(recibido)}"). Usa el formato https://api.ejemplo.com`;
    }
    if (
      variable === 'VITE_FIREBASE_API_KEY' ||
      variable === 'VITE_FIREBASE_AUTH_DOMAIN' ||
      variable === 'VITE_FIREBASE_PROJECT_ID' ||
      variable === 'VITE_FIREBASE_APP_ID'
    ) {
      return `Falta la variable ${variable}. Copiá .env.example a .env y completala.`;
    }
    return `${variable}: ${issue.message}`;
  });
  return `Configuracion invalida. La aplicacion no puede arrancar.\n${lineas.join('\n')}`;
}

/**
 * Valida el origen de entorno y devuelve el objeto tipado.
 * Exportada para pruebas; en runtime se usa `config`.
 */
export function leerConfiguracion(
  origen: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): ConfiguracionEcoRuta {
  const resultado = esquemaEntorno.safeParse({
    VITE_API_BASE_URL: origen.VITE_API_BASE_URL,
    VITE_FIREBASE_API_KEY: origen.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: origen.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: origen.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: origen.VITE_FIREBASE_APP_ID,
    VITE_AUTH_CONDUCTOR_SIMULADO: origen.VITE_AUTH_CONDUCTOR_SIMULADO,
  });

  if (!resultado.success) {
    throw new Error(mensajeDeValidacion(resultado.error, origen));
  }

  const datos = resultado.data;
  return Object.freeze({
    apiBaseUrl: normalizarUrl(datos.VITE_API_BASE_URL),
    firebaseApiKey: datos.VITE_FIREBASE_API_KEY,
    firebaseAuthDomain: datos.VITE_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: datos.VITE_FIREBASE_PROJECT_ID,
    firebaseAppId: datos.VITE_FIREBASE_APP_ID,
    authConductorSimulado: datos.VITE_AUTH_CONDUCTOR_SIMULADO === 'true',
    mensajeria: leerMensajeria(origen, {
      apiKey: datos.VITE_FIREBASE_API_KEY,
      authDomain: datos.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: datos.VITE_FIREBASE_PROJECT_ID,
      appId: datos.VITE_FIREBASE_APP_ID,
    }),
  });
}

/** Configuracion validada al cargar el modulo. Fail-fast. */
export const config: ConfiguracionEcoRuta = leerConfiguracion();
