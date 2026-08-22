import './HoraUltimoDato.css';

interface Props {
  recibidoEn: Date;
}

const formatoHora = new Intl.DateTimeFormat('es-GT', {
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Marca de tiempo del ultimo dato recibido (DESIGN.md §7 [DURA]).
 * Numeros tabulares (DESIGN.md §4).
 */
export function HoraUltimoDato({ recibidoEn }: Props) {
  return (
    <p className="hora-ultimo-dato">
      Último dato{' '}
      <time dateTime={recibidoEn.toISOString()}>{formatoHora.format(recibidoEn)}</time>
    </p>
  );
}
