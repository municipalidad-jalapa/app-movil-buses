import { useEffect, useRef } from 'react';
import { IconoReloj } from './IconosPanel';

interface Props {
  segundos: number;
  onSeguir: () => void;
  onCerrarSesion: () => void;
}

/** Aviso previo al cierre por inactividad (SCRUM-173, criterio 3). Canvas: 3a. */
export function AvisoInactividad({ segundos, onSeguir, onCerrarSesion }: Props) {
  const primario = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primario.current?.focus();
  }, []);

  return (
    <div className="panel-velo">
      <div
        className="panel-dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-inactividad-titulo"
        aria-describedby="aviso-inactividad-texto"
      >
        <span className="panel-icono-cuadro panel-icono-cuadro--atencion">
          <IconoReloj tamano={24} />
        </span>
        <h2 id="aviso-inactividad-titulo" className="panel-h2">
          Tu sesión se cerrará en <span className="tabular">{segundos} s</span> por inactividad
        </h2>
        <p id="aviso-inactividad-texto" className="panel-apoyo">
          Por seguridad cerramos el panel cuando nadie lo usa. Si sigues trabajando, tu sesión continúa.
        </p>
        <div className="panel-dialogo__acciones">
          <button type="button" className="panel-boton panel-boton--secundario" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
          <button ref={primario} type="button" className="panel-boton panel-boton--primario" onClick={onSeguir}>
            Seguir en el panel
          </button>
        </div>
      </div>
    </div>
  );
}
