import './HoraUltimoDato.css';

interface Props {
  recibidoEn: Date;
}

const formatoHora = new Intl.DateTimeFormat('es-GT', {
  hour: 'numeric',
  minute: '2-digit',
});

const formatoDia = new Intl.DateTimeFormat('es-GT', {
  day: 'numeric',
  month: 'short',
});

/**
 * "9:57 p. m." si es de hoy; "9 sept., 9:57 p. m." si no. Un dato de ayer con
 * solo la hora se lee como de hace un rato, y es justo el error que HU-60 evita.
 */
export function formatearMomento(fecha: Date, ahora: Date = new Date()): string {
  const mismoDia = fecha.toDateString() === ahora.toDateString();
  const hora = formatoHora.format(fecha);
  return mismoDia ? hora : `${formatoDia.format(fecha)}, ${hora}`;
}

/**
 * Marca de tiempo del ultimo dato recibido (DESIGN.md §7 [DURA]).
 * Numeros tabulares (DESIGN.md §4).
 */
export function HoraUltimoDato({ recibidoEn }: Props) {
  return (
    <p className="hora-ultimo-dato">
      Último dato recibido{' '}
      <time dateTime={recibidoEn.toISOString()}>{formatearMomento(recibidoEn)}</time>
    </p>
  );
}
