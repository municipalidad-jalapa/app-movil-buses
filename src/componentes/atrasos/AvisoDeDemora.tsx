import { useEffect, useState } from 'react';

import { TEXTO_DEL_MOTIVO, textoPlano, type AvisoDeAtraso } from '../../core/atrasos';
import { consultarEta, minutosA } from '../../core/eta';
import { useRutaElegida } from '../../hooks/useRutaElegida';
import './AvisoDeDemora.css';

/**
 * SCRUM-26, bloque E.3. El aviso del piloto, junto al tiempo estimado.
 *
 * Los minutos y la demora se muestran separados a propósito: el cálculo mide
 * lo que viene haciendo el bus y el aviso dice lo que el piloto espera. Sumarlos
 * daría un número que nadie midió.
 *
 * Sin atraso reportado no se dibuja nada: una franja permanente dejaría de
 * llamar la atención justo cuando importa.
 */

/** El ETA cambia con cada posición; refrescar cada medio minuto alcanza. */
const REFRESCO_MS = 30_000;

export function AvisoDeDemora() {
  const { rutaActiva } = useRutaElegida();
  const rutaId = rutaActiva?.id ?? null;

  const [atraso, setAtraso] = useState<AvisoDeAtraso | null>(null);
  const [minutos, setMinutos] = useState<number | null>(null);

  useEffect(() => {
    if (rutaId === null) {
      setAtraso(null);
      setMinutos(null);
      return;
    }
    const control = new AbortController();
    let vigente = true;

    const consultar = async () => {
      try {
        const eta = await consultarEta(rutaId, control.signal);
        if (!vigente) return;
        setAtraso(eta?.atraso ?? null);
        setMinutos(minutosA(eta ?? null));
      } catch {
        // Sin ETA no hay nada que avisar; el mapa sigue funcionando igual.
        if (vigente) setAtraso(null);
      }
    };

    void consultar();
    const temporizador = setInterval(() => void consultar(), REFRESCO_MS);
    return () => {
      vigente = false;
      control.abort();
      clearInterval(temporizador);
    };
  }, [rutaId]);

  if (!atraso) return null;

  const comentario = textoPlano(atraso.comentario);

  return (
    <aside className="demora" role="status" aria-live="polite">
      <span className="demora__icono" aria-hidden="true">
        <IconoDemora />
      </span>
      <div className="demora__texto">
        <p className="demora__titulo">
          {minutos === null ? 'Hay una demora reportada' : `Llega en ${minutos} min, con demora reportada`}
        </p>
        <p className="demora__detalle">
          El piloto avisó {TEXTO_DEL_MOTIVO[atraso.motivo]}: unos {atraso.demoraMinutos} min más de lo estimado.
        </p>
        {comentario ? <p className="demora__comentario">{comentario}</p> : null}
      </div>
    </aside>
  );
}

/** Decorativo: lo que significa está en el texto (DESIGN.md §3). */
function IconoDemora() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
