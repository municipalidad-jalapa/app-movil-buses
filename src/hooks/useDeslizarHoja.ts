import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuanto hay que arrastrar para que cuente como gesto, en px. */
export const UMBRAL_DESLIZAR_PX = 48;
/** Un gesto rapido cuenta aunque sea corto, en px por ms. */
const VELOCIDAD_GESTO = 0.6;
/** Por debajo de esto es un toque, no un arrastre. */
const HOLGURA_PX = 8;

interface Opciones {
  /** Deslizar hacia arriba: abrir o agrandar la hoja. */
  alSubir?: () => void;
  /** Deslizar hacia abajo: achicar o cerrar la hoja. */
  alBajar?: () => void;
}

/** El contenedor con scroll mas cercano al dedo, dentro de la hoja. */
function conScroll(desde: EventTarget | null, hoja: HTMLElement): HTMLElement | null {
  let nodo = desde instanceof HTMLElement ? desde : null;
  while (nodo && nodo !== hoja.parentElement) {
    const { overflowY } = getComputedStyle(nodo);
    if ((overflowY === 'auto' || overflowY === 'scroll') && nodo.scrollHeight > nodo.clientHeight) return nodo;
    nodo = nodo.parentElement;
  }
  return null;
}

/**
 * Hojas que se deslizan con el dedo, como en cualquier app de telefono: hacia
 * abajo se achican o cierran, hacia arriba se abren. La hoja sigue al dedo
 * mientras se arrastra y vuelve a su lugar si el gesto no alcanza.
 *
 * <p>Usa eventos tactiles nativos no pasivos: solo asi se puede frenar el
 * scroll de la pagina en el gesto que es de la hoja, y dejarlo pasar cuando el
 * dedo esta desplazando contenido de la propia hoja. Los botones de la manija
 * siguen funcionando para quien no desliza.
 *
 * @returns un ref de callback para poner en la hoja
 */
export function useDeslizarHoja({ alSubir, alBajar }: Opciones) {
  const [hoja, setHoja] = useState<HTMLElement | null>(null);
  const acciones = useRef({ alSubir, alBajar });
  acciones.current = { alSubir, alBajar };

  useEffect(() => {
    if (!hoja) return;
    let inicioY = 0;
    let inicioX = 0;
    let inicioT = 0;
    let dy = 0;
    let scroller: HTMLElement | null = null;
    let estado: 'nada' | 'decidiendo' | 'arrastrando' | 'ignorado' = 'nada';

    const alEmpezar = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      inicioY = e.touches[0].clientY;
      inicioX = e.touches[0].clientX;
      inicioT = performance.now();
      dy = 0;
      scroller = conScroll(e.target, hoja);
      estado = 'decidiendo';
    };

    const alMover = (e: TouchEvent) => {
      if (estado === 'nada' || estado === 'ignorado') return;
      dy = e.touches[0].clientY - inicioY;
      const dx = e.touches[0].clientX - inicioX;
      if (estado === 'decidiendo') {
        if (Math.abs(dy) < HOLGURA_PX) return;
        const { alSubir: subir, alBajar: bajar } = acciones.current;
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const scrolleaAbajo = dy > 0 && scroller !== null && scroller.scrollTop > 0;
        const scrolleaArriba =
          dy < 0 && scroller !== null && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
        const sinAccion = (dy > 0 && !bajar) || (dy < 0 && !subir);
        if (horizontal || scrolleaAbajo || scrolleaArriba || sinAccion) {
          estado = 'ignorado';
          return;
        }
        estado = 'arrastrando';
        hoja.style.transition = 'none';
      }
      e.preventDefault();
      // Hacia abajo sigue al dedo; hacia arriba solo insinua, con resistencia.
      const desplazamiento = dy > 0 ? dy : Math.max(dy * 0.35, -40);
      hoja.style.transform = `translateY(${desplazamiento}px)`;
    };

    const alTerminar = () => {
      if (estado !== 'arrastrando') {
        estado = 'nada';
        return;
      }
      estado = 'nada';
      const velocidad = dy / Math.max(1, performance.now() - inicioT);
      hoja.style.transition = 'transform 180ms ease';
      hoja.style.transform = '';
      // El dedo se levanto sobre un boton: ese "click" no es un toque.
      const frenar = (c: Event) => {
        c.stopPropagation();
        c.preventDefault();
      };
      hoja.addEventListener('click', frenar, { capture: true, once: true });
      setTimeout(() => hoja.removeEventListener('click', frenar, { capture: true }), 350);

      const { alSubir: subir, alBajar: bajar } = acciones.current;
      if ((dy > UMBRAL_DESLIZAR_PX || velocidad > VELOCIDAD_GESTO) && bajar) bajar();
      else if ((dy < -UMBRAL_DESLIZAR_PX || velocidad < -VELOCIDAD_GESTO) && subir) subir();
    };

    hoja.addEventListener('touchstart', alEmpezar, { passive: true });
    hoja.addEventListener('touchmove', alMover, { passive: false });
    hoja.addEventListener('touchend', alTerminar);
    hoja.addEventListener('touchcancel', alTerminar);
    return () => {
      hoja.removeEventListener('touchstart', alEmpezar);
      hoja.removeEventListener('touchmove', alMover);
      hoja.removeEventListener('touchend', alTerminar);
      hoja.removeEventListener('touchcancel', alTerminar);
      hoja.style.transform = '';
      hoja.style.transition = '';
    };
  }, [hoja]);

  return useCallback((el: HTMLElement | null) => setHoja(el), []);
}
