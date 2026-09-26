/**
 * Instalar EcoRuta en la pantalla de inicio del telefono (PWA).
 *
 * <p>Chrome y los navegadores Android avisan con `beforeinstallprompt` que la
 * app se puede instalar; ese evento llega una sola vez y a veces antes de que
 * React monte, por eso se escucha desde el arranque ({@link escucharInstalacion})
 * y se guarda. Safari en iPhone no lo tiene: ahi solo se puede explicar el paso.
 */

/** El evento que Chrome entrega para mostrar su dialogo de instalacion. */
export interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Plataforma = 'android' | 'ios' | 'otra';

const CLAVE_DESCARTE = 'ecoruta_instalar_descartado';
/** Despues de "Ahora no", la recomendacion vuelve a los 7 dias. */
export const DESCANSO_MS = 7 * 24 * 60 * 60_000;

let pendiente: EventoInstalacion | null = null;
let instalada = false;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((o) => o());
}

/** Se llama una vez al arrancar la app, antes de montar React. */
export function escucharInstalacion(ventana: Window = window): void {
  ventana.addEventListener('beforeinstallprompt', (e) => {
    // Sin esto Chrome muestra su propia barrita; el pedido va en nuestra tarjeta.
    e.preventDefault();
    pendiente = e as EventoInstalacion;
    avisar();
  });
  ventana.addEventListener('appinstalled', () => {
    instalada = true;
    pendiente = null;
    avisar();
  });
}

export function suscribirInstalacion(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function hayInstalacionNativa(): boolean {
  return pendiente !== null;
}

export function recienInstalada(): boolean {
  return instalada;
}

/** Abre el dialogo del navegador. true si la persona acepto. */
export async function instalar(): Promise<boolean> {
  const evento = pendiente;
  if (!evento) return false;
  pendiente = null;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  avisar();
  return outcome === 'accepted';
}

export function plataformaDe(agente: string, puntosTactiles = 0): Plataforma {
  if (/iPhone|iPad|iPod/i.test(agente)) return 'ios';
  // iPadOS se presenta como Mac de escritorio, pero con pantalla tactil.
  if (/Macintosh/i.test(agente) && puntosTactiles > 1) return 'ios';
  if (/Android/i.test(agente)) return 'android';
  return 'otra';
}

/** Abierta como app instalada (icono de inicio), no en una pestaña. */
export function seAbrioInstalada(ventana: Window = window): boolean {
  const iosInstalada = (ventana.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosInstalada || ventana.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function descartadaHaceUnRato(ahoraMs = Date.now()): boolean {
  try {
    const cuando = Number(localStorage.getItem(CLAVE_DESCARTE));
    return Number.isFinite(cuando) && cuando > 0 && ahoraMs - cuando < DESCANSO_MS;
  } catch {
    return false;
  }
}

export function descartar(ahoraMs = Date.now()): void {
  try {
    localStorage.setItem(CLAVE_DESCARTE, String(ahoraMs));
  } catch {
    // Sin almacenamiento la tarjeta vuelve a salir la proxima vez; no pasa nada.
  }
}
