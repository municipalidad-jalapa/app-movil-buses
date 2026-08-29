import { useEffect, useState } from 'react';

/**
 * Si el sistema pide modo oscuro.
 *
 * <p>DESIGN.md seccion 3.5 es tajante: el modo oscuro se disena a proposito y no
 * se genera invirtiendo el claro. El mock de `design/MapaJalapa.dc.html` trae sus
 * propios valores para oscuro, asi que aqui solo hace falta saber cual usar.
 */
export function usePrefiereOscuro(): boolean {
  const [oscuro, setOscuro] = useState(() => consultar());

  useEffect(() => {
    // El usuario puede cambiar el tema con la app abierta.
    const consulta = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!consulta) return;

    const alCambiar = (e: MediaQueryListEvent) => setOscuro(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  return oscuro;
}

function consultar(): boolean {
  return typeof window !== 'undefined'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
    : false;
}
