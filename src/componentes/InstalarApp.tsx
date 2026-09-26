import { useEffect, useState } from 'react';
import {
  descartadaHaceUnRato,
  descartar,
  hayInstalacionNativa,
  instalar,
  plataformaDe,
  recienInstalada,
  seAbrioInstalada,
  suscribirInstalacion,
} from '../core/instalacion';
import './InstalarApp.css';

/**
 * Recomienda instalar EcoRuta en la pantalla de inicio cuando se abre desde el
 * navegador de un telefono. Con Chrome el boton abre la instalacion nativa; en
 * iPhone (Safari no lo permite desde la pagina) se explica el paso.
 */
export function InstalarApp() {
  const plataforma = plataformaDe(navigator.userAgent, navigator.maxTouchPoints);
  const [, refrescar] = useState(0);
  const [cerrada, setCerrada] = useState(
    () => plataforma === 'otra' || seAbrioInstalada() || descartadaHaceUnRato(),
  );

  useEffect(() => suscribirInstalacion(() => refrescar((n) => n + 1)), []);

  if (cerrada || recienInstalada()) return null;

  const nativa = hayInstalacionNativa();

  function ahoraNo() {
    descartar();
    setCerrada(true);
  }

  return (
    <aside className="instalar-app" aria-labelledby="instalar-app-titulo">
      <img className="instalar-app__icono" src="/icon-192.png" alt="" width="48" height="48" />
      <div className="instalar-app__textos">
        <p id="instalar-app-titulo" className="instalar-app__titulo">
          Instalá EcoRuta en tu teléfono
        </p>
        <p className="instalar-app__nota">
          Recomendado: sin instalarla no vas a tener todas las funciones, como los avisos del bus con la pantalla
          bloqueada.
        </p>
        {!nativa && (
          <p className="instalar-app__pasos">
            {plataforma === 'ios'
              ? 'Tocá Compartir y después «Agregar a inicio».'
              : 'Abrí el menú ⋮ del navegador y elegí «Instalar app» o «Agregar a pantalla principal».'}
          </p>
        )}
        <div className="instalar-app__acciones">
          {nativa && (
            <button type="button" className="instalar-app__instalar" onClick={() => void instalar()}>
              Instalar
            </button>
          )}
          <button type="button" className="instalar-app__despues" onClick={ahoraNo}>
            Ahora no
          </button>
        </div>
      </div>
    </aside>
  );
}
