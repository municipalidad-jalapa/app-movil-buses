import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { IniciarSesionConductor } from './paginas/IniciarSesionConductor';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';
import { PanelConductor } from './paginas/PanelConductor';
import { PantallaRegistro } from './paginas/PantallaRegistro';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            // El mapa a sangre: es la vista principal (DESIGN.md seccion 11).
            <Layout aSangre>
              <Mapa />
            </Layout>
          }
        />

        <Route
          path="/registro/:paradaId"
          element={
            <Layout>
              <PantallaRegistro />
            </Layout>
          }
        />

        <Route
          path="/conductor"
          element={
            // Sin margenes: la superficie del conductor ocupa todo el ancho
            // (DESIGN.md §11).
            <Layout aSangre>
              <PanelConductor />
            </Layout>
          }
        />

        <Route
          path="/conductor/iniciar-sesion"
          element={
            <Layout>
              <IniciarSesionConductor />
            </Layout>
          }
        />

        <Route
          path="*"
          element={
            <Layout>
              <NoEncontrada />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
