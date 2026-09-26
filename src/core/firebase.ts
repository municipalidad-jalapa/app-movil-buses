import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { config } from './config';

const opciones = {
  apiKey: config.firebaseApiKey,
  authDomain: config.firebaseAuthDomain,
  projectId: config.firebaseProjectId,
  appId: config.firebaseAppId,
  // La mensajeria usa esta misma app: sin el remitente, getMessaging falla con
  // messaging/missing-app-config-values. config ya lo deduce del appId (QA 4.2).
  ...(config.mensajeria && {
    messagingSenderId: config.mensajeria.messagingSenderId,
    storageBucket: config.mensajeria.storageBucket || undefined,
  }),
};

/** Una sola app de Firebase: la usan la sesion del conductor y los avisos (HU-58). */
export const appFirebase = getApps()[0] ?? initializeApp(opciones);

export const authFirebase = getAuth(appFirebase);
