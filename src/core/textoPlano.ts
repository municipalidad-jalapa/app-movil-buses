/**
 * El backend devuelve neutralizado lo que escribio una persona (opiniones,
 * comentarios de atraso): con entidades HTML en vez de < > & " '. React ya
 * escapa al pintar, asi que aqui se decodifica a texto plano para no mostrar
 * "&lt;" ni "M&aacute;s" literales: sigue saliendo como texto, jamas como HTML.
 *
 * <p>Se decodifica cualquier entidad, con nombre o numerica: hasta este cambio
 * el backend escapaba con ISO-8859-1 y convertia tambien los acentos y la ñ.
 */
export function textoPlano(neutralizado: string | null): string {
  if (!neutralizado) return '';
  if (!neutralizado.includes('&')) return neutralizado;
  if (typeof document !== 'undefined') {
    // El contenido de un <textarea> no se interpreta como HTML: las etiquetas
    // quedan como texto y no se ejecuta ni se carga nada; solo se resuelven
    // las entidades.
    const decodificador = document.createElement('textarea');
    decodificador.innerHTML = neutralizado;
    return decodificador.value;
  }
  return neutralizado
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
}
