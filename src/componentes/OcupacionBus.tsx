import type { VistaOcupacion } from '../core/ocupacion';
import './OcupacionBus.css';

const TRAZOS_PERSONAS = [
  'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
  'M22 21v-2a4 4 0 0 0-3-3.9',
];

function IconoPersonas({ tamano = 16 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRAZOS_PERSONAS.map((d) => <path key={d} d={d} />)}
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

/** La pastilla "👥 12 | Hay lugar". Decorativa: la frase va aparte para lectores. */
export function PildoraOcupacion({ vista }: { vista: VistaOcupacion }) {
  return (
    <span className={`ocupacion-bus ocupacion-bus--${vista.tono}`} aria-hidden="true">
      <IconoPersonas />
      <span className="ocupacion-bus__cantidad">{vista.cantidad}</span>
      <span className="ocupacion-bus__separador" />
      <span>{vista.texto}</span>
    </span>
  );
}

/** La misma pastilla como HTML, para el marcador de MapLibre (fuera de React). */
export function htmlPildoraOcupacion(vista: VistaOcupacion): string {
  const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const trazos = TRAZOS_PERSONAS.map((d) => `<path d="${d}"></path>`).join('');
  return (
    `<span class="ocupacion-bus ocupacion-bus--${vista.tono}">` +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos}<circle cx="9" cy="7" r="4"></circle></svg>` +
    `<span class="ocupacion-bus__cantidad">${escapar(vista.cantidad)}</span>` +
    '<span class="ocupacion-bus__separador"></span>' +
    `<span>${escapar(vista.texto)}</span></span>`
  );
}

/** La linea de la hoja: "Lleva 12 personas · hay lugar", y de donde sale. */
export function LineaOcupacion({ vista }: { vista: VistaOcupacion }) {
  return (
    <div className={`ocupacion-linea ocupacion-linea--${vista.tono}`}>
      <IconoPersonas tamano={24} />
      <span className="ocupacion-linea__textos">
        <span className="ocupacion-linea__frase">{vista.frase}</span>
        {vista.detalle && <span className="ocupacion-linea__detalle">{vista.detalle}</span>}
      </span>
    </div>
  );
}
