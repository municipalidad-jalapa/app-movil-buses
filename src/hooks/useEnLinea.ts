import { useEffect, useState } from 'react';

/**
 * El telefono tiene red o no (DESIGN.md §7, estado `sin-conexion`).
 *
 * `navigator.onLine` no garantiza que haya internet, pero cuando dice `false`
 * es seguro que no hay: alcanza para mostrar la pantalla de sin conexion.
 */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );

  useEffect(() => {
    const conectar = () => setEnLinea(true);
    const desconectar = () => setEnLinea(false);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    return () => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
    };
  }, []);

  return enLinea;
}
