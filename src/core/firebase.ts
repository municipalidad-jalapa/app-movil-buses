import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { config } from './config';

const opciones = {
  apiKey: config.firebaseApiKey,
  authDomain: config.firebaseAuthDomain,
  projectId: config.firebaseProjectId,
  appId: config.firebaseAppId,
};

const appFirebase = getApps()[0] ?? initializeApp(opciones);

export const authFirebase = getAuth(appFirebase);
