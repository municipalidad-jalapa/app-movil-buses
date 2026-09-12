import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { RutaProtegida } from './componentes/RutaProtegida';
import { AuthProvider } from './core/autenticacion/AuthProvider';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';
import { PantallaRegistro } from './paginas/PantallaRegistro';
import { LoginConductor } from './paginas/conductor/LoginConductor';
import { PanelConductor } from './paginas/conductor/PanelConductor';

export function App() {
  return (
    <AuthProvider>
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

          <Route path="/conductor/login" element={<LoginConductor />} />
          <Route
            path="/conductor"
            element={
              <RutaProtegida>
                <PanelConductor />
              </RutaProtegida>
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
    </AuthProvider>
  );
}
