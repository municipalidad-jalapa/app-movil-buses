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

const esquemaEntorno = z.object({
  VITE_API_BASE_URL: z.url({
    error: 'VITE_API_BASE_URL falta o no es una URL valida. Usa el formato https://api.ejemplo.com',
  }),
});

/**
 * Llaves web de Firebase Cloud Messaging (HU-58).
 *
 * No son secretas: viajan en el bundle y cualquiera las lee con devtools. El
 * secreto de verdad es la clave de cuenta de servicio, que vive en el backend.
 */
const VARIABLES_MENSAJERIA = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY',
] as const;

/**
 * `trim()` antes de `min(1)`: sin eso una variable con solo espacios pasa la
 * validacion y Firebase se inicializa con basura, que falla mucho mas tarde y
 * mucho peor.
 */
const llaveObligatoria = z.string().trim().min(1);

const esquemaMensajeria = z.object({
  VITE_FIREBASE_API_KEY: llaveObligatoria,
  VITE_FIREBASE_AUTH_DOMAIN: llaveObligatoria,
  VITE_FIREBASE_PROJECT_ID: llaveObligatoria,
  VITE_FIREBASE_STORAGE_BUCKET: llaveObligatoria,
  VITE_FIREBASE_MESSAGING_SENDER_ID: llaveObligatoria,
  VITE_FIREBASE_APP_ID: llaveObligatoria,
  VITE_FIREBASE_VAPID_KEY: llaveObligatoria,
});

export interface ConfiguracionMensajeria {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
  readonly vapidKey: string;
}

export interface ConfiguracionEcoRuta {
  readonly apiBaseUrl: string;
  /**
   * `null` cuando el entorno no tiene configurado Firebase. La app arranca
   * igual y los avisos quedan apagados: que falte Firebase no puede tumbar la
   * pantalla del mapa, que es lo que el pasajero viene a ver.
   */
  readonly mensajeria: ConfiguracionMensajeria | null;
  /**
   * Responde el abordaje en el navegador en vez de llamar al backend.
   * Solo para demostrar HU-58 mientras `/api/v1/reservas/{id}/abordaje` no exista.
   */
  readonly simularAbordaje: boolean;
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
    return `${variable}: ${issue.message}`;
  });
  return `Configuracion invalida. La aplicacion no puede arrancar.\n${lineas.join('\n')}`;
}

function tieneValor(valor: unknown): boolean {
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

/**
 * Lee la configuracion de mensajeria.
 *
 * Tres resultados posibles, y el del medio es el que importa: si ninguna
 * variable esta puesta devolvemos `null` y los avisos quedan apagados a
 * proposito. Si estan *algunas*, lanzamos — un `.env` a medias casi siempre es
 * un nombre mal escrito, y fallar es mejor que dejar los avisos mudos sin decir
 * por que.
 */
function leerMensajeria(origen: Record<string, unknown>): ConfiguracionMensajeria | null {
  const presentes = VARIABLES_MENSAJERIA.filter((variable) => tieneValor(origen[variable]));

  if (presentes.length === 0) {
    return null;
  }

  const resultado = esquemaMensajeria.safeParse(
    Object.fromEntries(VARIABLES_MENSAJERIA.map((variable) => [variable, origen[variable]])),
  );

  if (!resultado.success) {
    const faltantes = VARIABLES_MENSAJERIA.filter((variable) => !tieneValor(origen[variable]));
    throw new Error(
      'Configuracion de avisos incompleta. La aplicacion no puede arrancar.\n' +
        `Faltan estas variables: ${faltantes.join(', ')}.\n` +
        'Ponelas todas o quitalas todas: con algunas puestas los avisos quedarian a medias.',
    );
  }

  const datos = resultado.data;
  return Object.freeze({
    apiKey: datos.VITE_FIREBASE_API_KEY,
    authDomain: datos.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: datos.VITE_FIREBASE_PROJECT_ID,
    storageBucket: datos.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: datos.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: datos.VITE_FIREBASE_APP_ID,
    vapidKey: datos.VITE_FIREBASE_VAPID_KEY,
  });
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
  });

  if (!resultado.success) {
    throw new Error(mensajeDeValidacion(resultado.error, origen));
  }

  return Object.freeze({
    apiBaseUrl: normalizarUrl(resultado.data.VITE_API_BASE_URL),
    mensajeria: leerMensajeria(origen),
    simularAbordaje: String(origen.VITE_SIMULAR_ABORDAJE ?? '').trim() === 'true',
  });
}

/** Configuracion validada al cargar el modulo. Fail-fast. */
export const config: ConfiguracionEcoRuta = leerConfiguracion();
