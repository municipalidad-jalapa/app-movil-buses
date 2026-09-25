/**
 * Cuanta gente lleva el bus (diseño "Badge de ocupación del bus", opción
 * recomendada): cantidad y nivel juntos, en una pastilla bajo el marcador.
 *
 * <p>El dato sale del conteo del conductor al cerrar paradas
 * (`GET /rutas/{id}/resumen` → `ocupacion`). Si no hay conteo, o es viejo,
 * se dice "Sin dato": nunca se inventa un numero.
 */

export type NivelOcupacion = 'HAY_LUGAR' | 'CASI_LLENO' | 'LLENO';

export interface Ocupacion {
  aBordo: number;
  capacidad: number | null;
  nivel: NivelOcupacion | null;
  /** ISO. Cuando el conductor cerro la ultima parada con conteo. */
  actualizadaEn: string;
}

export type TonoOcupacion = 'lugar' | 'casi' | 'lleno' | 'sin' | 'neutro';

export interface VistaOcupacion {
  /** Lo que va en grande en la pastilla: "12" o "—". */
  cantidad: string;
  /** "Hay lugar", "Casi lleno", "Lleno", "Sin dato" o "a bordo" sin capacidad. */
  texto: string;
  tono: TonoOcupacion;
  /** Para lectores de pantalla y para la hoja: "Lleva 12 personas · hay lugar". */
  frase: string;
  /** De donde sale y que tan fresco es: "Según el conductor, hace 3 min". */
  detalle: string | null;
}

/** Un conteo de hace mas de esto ya no describe el bus: se dice "Sin dato". */
export const OCUPACION_VIGENTE_MS = 45 * 60_000;

const NIVELES: Record<NivelOcupacion, { texto: string; tono: TonoOcupacion }> = {
  HAY_LUGAR: { texto: 'Hay lugar', tono: 'lugar' },
  CASI_LLENO: { texto: 'Casi lleno', tono: 'casi' },
  LLENO: { texto: 'Lleno', tono: 'lleno' },
};

const SIN_DATO: VistaOcupacion = {
  cantidad: '—',
  texto: 'Sin dato',
  tono: 'sin',
  frase: 'No sabemos cuánta gente lleva',
  detalle: null,
};

export function vistaOcupacion(ocupacion: Ocupacion | null | undefined, ahoraMs = Date.now()): VistaOcupacion {
  if (!ocupacion) return SIN_DATO;
  const hace = ahoraMs - Date.parse(ocupacion.actualizadaEn);
  if (!Number.isFinite(hace) || hace > OCUPACION_VIGENTE_MS) return SIN_DATO;

  const personas = ocupacion.aBordo === 1 ? '1 persona' : `${ocupacion.aBordo} personas`;
  const minutos = Math.max(0, Math.round(hace / 60_000));
  const detalle = minutos === 0 ? 'Según el conductor, hace menos de 1 min' : `Según el conductor, hace ${minutos} min`;
  const nivel = ocupacion.nivel ? NIVELES[ocupacion.nivel] : null;

  if (!nivel) {
    return { cantidad: String(ocupacion.aBordo), texto: 'a bordo', tono: 'neutro', frase: `Lleva ${personas}`, detalle };
  }
  return {
    cantidad: String(ocupacion.aBordo),
    texto: nivel.texto,
    tono: nivel.tono,
    frase: `Lleva ${personas} · ${nivel.texto.toLowerCase()}`,
    detalle,
  };
}
