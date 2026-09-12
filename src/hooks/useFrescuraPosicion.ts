import { useEffect, useState } from 'react';

/**
 * HU-74.
 *
 * Regla temporal del frontend:
 * si pasan mas de 60 segundos sin recibir
 * una nueva posicion, el dato deja de
 * considerarse reciente.
 *
 * Cuando backend defina una regla oficial,
 * este valor se puede sustituir.
 */
export const LIMITE_DATO_RECIENTE_MS = 60_000;

export interface FrescuraPosicion {
  datoReciente: boolean;
  segundosSinDato: number | null;
}

export function useFrescuraPosicion(
  recibidoEn: Date | null,
): FrescuraPosicion {
  const [ahora, setAhora] = useState(
    () => Date.now(),
  );

  useEffect(() => {
    const intervalo = window.setInterval(
      () => {
        setAhora(Date.now());
      },
      5_000,
    );

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  if (recibidoEn === null) {
    return {
      datoReciente: false,
      segundosSinDato: null,
    };
  }

  const antiguedadMs = Math.max(
    0,
    ahora - recibidoEn.getTime(),
  );

  return {
    datoReciente:
      antiguedadMs <=
      LIMITE_DATO_RECIENTE_MS,

    segundosSinDato:
      Math.floor(
        antiguedadMs / 1000,
      ),
  };
}