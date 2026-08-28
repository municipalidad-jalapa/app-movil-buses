import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { ReservaProvider } from './estado/ReservaProvider';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';
import { PantallaRegistro } from './paginas/PantallaRegistro';

export function App() {
  return (
    // La reserva envuelve al router: la crea la pantalla de registro y la
    // consulta el mapa, que es donde se responde el abordaje (HU-58).
    <ReservaProvider>
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
            path="*"
            element={
              <Layout>
                <NoEncontrada />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ReservaProvider>
  );
}
