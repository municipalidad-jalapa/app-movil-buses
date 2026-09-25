/**
 * "Hace cuanto" del panel municipal (QA 5.7).
 *
 * <p>Antes solo contaba minutos: un bus apagado desde ayer mostraba
 * "hace 1070 min". Ahora pasa a horas y a dias cuando el valor crece:
 * "hace 17 h 50 min", "hace 2 d 3 h".
 */
export function haceCuanto(iso: string, ahoraMs: number): string {
  const minutos = Math.max(0, Math.round((ahoraMs - Date.parse(iso)) / 60_000));
  if (minutos === 0) return 'hace menos de 1 min';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const restoMin = minutos % 60;
  if (horas < 24) return restoMin === 0 ? `hace ${horas} h` : `hace ${horas} h ${restoMin} min`;

  const dias = Math.floor(horas / 24);
  const restoH = horas % 24;
  return restoH === 0 ? `hace ${dias} d` : `hace ${dias} d ${restoH} h`;
}
