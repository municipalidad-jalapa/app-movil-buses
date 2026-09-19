import type { ParadaEta, ReservasActivasPorParada, Ruta, RutaEta } from './tipos';

/**
 * Combina ruta + ETA + reservas activas en las filas que pinta el panel del
 * conductor (HU-75).
 *
 * Vive fuera de React a proposito, igual que `recorridoDeRuta`: la regla de
 * negocio (que confianza mostrar, cuando una parada esta "atendida", cuando el
 * dato esta demasiado viejo para confiar) se prueba sin montar nada.
 */

/** DESIGN.md §7: dato de mas de 5 min se considera "rancio" y el ETA se suspende. */
export const UMBRAL_DATO_RANCIO_MS = 5 * 60_000;

export function esDatoFresco(actualizadoEn: Date | null, ahoraMs: number = Date.now()): boolean {
  if (!actualizadoEn) return false;
  return ahoraMs - actualizadoEn.getTime() < UMBRAL_DATO_RANCIO_MS;
}

/**
 * Las tres presentaciones de DESIGN.md §9, mas 'atendida' (la parada ya no
 * necesita ETA) y 'no-disponible' (nada confiable que mostrar: nunca un numero
 * enganoso). El criterio de aceptacion "si el ETA no es confiable, la parada lo
 * indica" se cumple con estas dos ultimas variantes.
 */
export type EtaMostrable =
  | { tipo: 'exacto'; minutos: number }
  | { tipo: 'rango'; minMinutos: number; maxMinutos: number }
  | { tipo: 'proxima-salida'; hora: string }
  | { tipo: 'atendida' }
  | { tipo: 'no-disponible' };

export interface FilaPanelConductor {
  paradaId: number;
  nombre: string;
  orden: number;
  atendida: boolean;
  reservasActivas: number;
  eta: EtaMostrable;
}

function resolverEtaMostrable(etaParada: ParadaEta | null, datoFresco: boolean): EtaMostrable {
  if (!etaParada) return { tipo: 'no-disponible' };
  // Una parada ya atendida no necesita ETA: mostrar minutos aca seria confuso,
  // no solo poco confiable.
  if (etaParada.atendida) return { tipo: 'atendida' };
  if (!datoFresco) return { tipo: 'no-disponible' };

  if (etaParada.confianza === 'alta' && etaParada.etaMinMinutos !== null) {
    return { tipo: 'exacto', minutos: etaParada.etaMinMinutos };
  }
  if (
    etaParada.confianza === 'media' &&
    etaParada.etaMinMinutos !== null &&
    etaParada.etaMaxMinutos !== null
  ) {
    return { tipo: 'rango', minMinutos: etaParada.etaMinMinutos, maxMinutos: etaParada.etaMaxMinutos };
  }
  if (etaParada.proximaSalida) {
    return { tipo: 'proxima-salida', hora: etaParada.proximaSalida };
  }
  return { tipo: 'no-disponible' };
}

/**
 * Arma las filas del panel, en el orden del recorrido.
 *
 * `datoFresco` en false fuerza el ETA de toda parada no atendida a
 * 'no-disponible', sin importar lo que haya dicho el backend: un dato de hace
 * rato no puede seguir prometiendo minutos exactos.
 */
export function armarFilasPanelConductor(
  ruta: Ruta | null,
  eta: RutaEta | null,
  reservas: ReservasActivasPorParada | null,
  datoFresco: boolean,
): FilaPanelConductor[] {
  if (!ruta) return [];

  const etaPorParada = new Map((eta?.paradas ?? []).map((p) => [p.paradaId, p]));

  return [...ruta.paradas]
    .sort((a, b) => a.orden - b.orden)
    .map((parada) => {
      const etaParada = etaPorParada.get(parada.id) ?? null;
      return {
        paradaId: parada.id,
        nombre: parada.nombre,
        orden: parada.orden,
        atendida: etaParada?.atendida ?? false,
        reservasActivas: reservas?.porParada[String(parada.id)] ?? 0,
        eta: resolverEtaMostrable(etaParada, datoFresco),
      };
    });
}

/** Microcopy de DESIGN.md §10: "Cuanto falta / Llega en", nunca la palabra ETA. */
export function formatearEta(eta: EtaMostrable): string {
  switch (eta.tipo) {
    case 'exacto':
      return `Llega en ${eta.minutos} min`;
    case 'rango':
      return `Llega en ${eta.minMinutos}–${eta.maxMinutos} min`;
    case 'proxima-salida':
      return `Próxima salida ${eta.hora}`;
    case 'atendida':
      return 'Ya pasó por esta parada';
    case 'no-disponible':
      return 'Tiempo no disponible por ahora';
  }
}
