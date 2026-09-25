import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './core/config';
import { activarSimuladorAuthConductor } from './core/autenticacion/simuladorAuthConductor';
import { escucharInstalacion } from './core/instalacion';
import { registrarAlCargar } from './core/notificaciones/mensajeria';
import { App } from './App';
import './estilos/global.css';

activarSimuladorAuthConductor();
// Chrome avisa una sola vez que se puede instalar, a veces antes de montar React.
escucharInstalacion();
// El worker registrado desde el inicio permite instalar la app (y los avisos).
registrarAlCargar();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('No se encontro el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
