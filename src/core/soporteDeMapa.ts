/**
 * Si este navegador puede con el mapa.
 *
 * <p>MapLibre necesita WebGL2. El publico de esta app usa telefonos de gama baja
 * (DESIGN.md seccion 1) y ahi no siempre esta disponible, asi que conviene
 * preguntarlo ANTES de crear el mapa: es determinista y evita depender de como
 * cada version de la libreria reporte el fallo.
 */
export function soportaMapa(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const lienzo = document.createElement('canvas');
    return lienzo.getContext('webgl2') !== null;
  } catch {
    return false;
  }
}
