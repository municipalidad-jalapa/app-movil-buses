interface Props {
  texto?: string;
}

/** Indicador de carga accesible: los lectores de pantalla anuncian el cambio. */
export function Cargando({ texto = 'Cargando…' }: Props) {
  return (
    <p role="status" aria-live="polite" style={{ color: 'var(--tinta-tenue)' }}>
      {texto}
    </p>
  );
}
