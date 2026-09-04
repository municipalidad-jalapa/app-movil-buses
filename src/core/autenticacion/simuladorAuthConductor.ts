import { config } from '../config';

const RUTA_AUTH = '/api/v1/auth/conductor';

function esPeticionAuthConductor(entrada: RequestInfo | URL, init?: RequestInit): boolean {
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  const metodo = (init?.method ?? (typeof entrada === 'object' && 'method' in entrada ? entrada.method : 'GET')).toUpperCase();
  return metodo === 'POST' && url.startsWith(`${config.apiBaseUrl}${RUTA_AUTH}`);
}

function debeSimularFallo(idToken: string): boolean {
  if (idToken.includes('@fallo.test')) return true;
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string };
    return String(json.email ?? '').endsWith('@fallo.test');
  } catch {
    return false;
  }
}

/**
 * Simula POST /api/v1/auth/conductor en desarrollo local.
 * Apagar: VITE_AUTH_CONDUCTOR_SIMULADO distinto de true. Nunca corre en produccion.
 */
export function activarSimuladorAuthConductor(): void {
  if (!import.meta.env.DEV || !config.authConductorSimulado) return;

  const fetchReal = window.fetch.bind(window);

  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    if (!esPeticionAuthConductor(entrada, init)) {
      return fetchReal(entrada, init);
    }

    let idToken = '';
    try {
      const cuerpo = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      idToken = typeof cuerpo.idToken === 'string' ? cuerpo.idToken : '';
    } catch {
      idToken = '';
    }
    if (debeSimularFallo(idToken)) {
      return new Response(JSON.stringify({ status: 401, message: 'idToken invalido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expiraEn = Math.floor(Date.now() / 1000) + 60 * 60;
    return new Response(
      JSON.stringify({ token: 'jwt-simulado-conductor', expiraEn, rol: 'conductor' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
}
