import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './core/config';
import { App } from './App';
import './estilos/global.css';

Promise.all([import('maplibre-gl'), import('pmtiles')]).then(([maplibre, { Protocol }]) => {
  const protocoloPmtiles = new Protocol();
  maplibre.addProtocol('pmtiles', protocoloPmtiles.tile);
});

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('No se encontro el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
