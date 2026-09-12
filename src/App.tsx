import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { SelectorDeRuta } from './componentes/SelectorDeRuta';
import { RutaProtegida } from './componentes/RutaProtegida';
import { AuthProvider } from './core/autenticacion/AuthProvider';
import { ReservaProvider } from './estado/ReservaProvider';
import { RutaElegidaProvider } from './estado/RutaElegidaProvider';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';
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
              // La reserva vive fuera del mapa: la comparten la hoja y los
              // avisos del bus (HU-58).
              // La ruta elegida la comparten el selector de la cabecera y el mapa.
              <RutaElegidaProvider>
                <ReservaProvider>
                  <Layout aSangre estado={<SelectorDeRuta />}>
                    <Mapa />
                  </Layout>
                </ReservaProvider>
              </RutaElegidaProvider>
            }
          />

          {/* El QR de cada parada apunta aqui: abre el mapa con esa parada elegida (R2). */}
          <Route path="/registro/:paradaId" element={<DelQrAlMapa />} />

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

/** `/registro/4` -> `/?parada=4`. La reserva vive en la hoja del mapa. */
function DelQrAlMapa() {
  const { paradaId } = useParams();
  return <Navigate to={`/?parada=${encodeURIComponent(paradaId ?? '')}`} replace />;
}
