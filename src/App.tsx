import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { InstalarApp } from './componentes/InstalarApp';
import { Layout } from './componentes/Layout';
import { SelectorDeRuta } from './componentes/SelectorDeRuta';
import { RutaProtegida } from './componentes/RutaProtegida';
import { RutaProtegidaAdmin } from './componentes/admin/RutaProtegidaAdmin';
import { AuthProvider } from './core/autenticacion/AuthProvider';
import { AuthAdminProvider } from './core/panelAdmin/AuthAdminProvider';
import { ReservaProvider } from './estado/ReservaProvider';
import { RutaElegidaProvider } from './estado/RutaElegidaProvider';
import { AvisoLegal } from './paginas/AvisoLegal';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';
import { Privacidad } from './paginas/Privacidad';
import { LoginAdmin } from './paginas/admin/LoginAdmin';
import { PanelAdmin } from './paginas/admin/PanelAdmin';
import { AbordajesPanel } from './paginas/admin/AbordajesPanel';
import { OpinionesPanel } from './paginas/admin/OpinionesPanel';
import { AvisoDeDemora } from './componentes/atrasos/AvisoDeDemora';
import { PuertaDelPasajero } from './componentes/sesionPasajero/PuertaDelPasajero';
import { SesionPasajeroProvider } from './core/pasajero/SesionPasajeroProvider';
import { CorregirRutas } from './paginas/admin/CorregirRutas';
import { Vehiculos } from './paginas/admin/Vehiculos';
import { ExportarDatos } from './paginas/admin/ExportarDatos';
import { LoginConductor } from './paginas/conductor/LoginConductor';
import { PanelConductor } from './paginas/conductor/PanelConductor';

export function App() {
  return (
    <AuthProvider>
      <SesionPasajeroProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              // El mapa a sangre: es la vista principal (DESIGN.md seccion 11).
              // La reserva vive fuera del mapa: la comparten la hoja y los
              // avisos del bus (HU-58).
              // La ruta elegida la comparten el selector de la cabecera y el mapa.
              // SCRUM-26, B.1: la primera vez se elige invitado o cuenta de Google.
              <PuertaDelPasajero>
              <RutaElegidaProvider>
                <ReservaProvider>
                  <Layout aSangre estado={<SelectorDeRuta />}>
                    <Mapa />
                    {/* SCRUM-26, E.3: el atraso que avisó el piloto, junto al ETA. */}
                    <AvisoDeDemora />
                    {/* En el navegador del telefono: recomendar instalar la app. */}
                    <InstalarApp />
                  </Layout>
                </ReservaProvider>
              </RutaElegidaProvider>
              </PuertaDelPasajero>
            }
          />

          {/* El QR de cada parada apunta aqui: abre el mapa con esa parada elegida (R2). */}
          <Route path="/registro/:paradaId" element={<DelQrAlMapa />} />

          {/* HU-89: paginas publicas de informacion legal. */}
          <Route
            path="/privacidad"
            element={
              <Layout anchoAmplio>
                <Privacidad />
              </Layout>
            }
          />

          <Route
            path="/aviso-legal"
            element={
              <Layout anchoAmplio>
                <AvisoLegal />
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

          {/* SCRUM-173: panel web municipal, escritorio. Sesion propia del administrador. */}
          <Route
            path="/admin/*"
            element={
              <AuthAdminProvider>
                <Routes>
                  <Route path="login" element={<LoginAdmin />} />

                  <Route
                    index
                    element={
                      <RutaProtegidaAdmin>
                        <PanelAdmin />
                      </RutaProtegidaAdmin>
                    }
                  />
                  <Route
                    path="opiniones"
                    element={
                      <RutaProtegidaAdmin>
                        <OpinionesPanel />
                      </RutaProtegidaAdmin>
                    }
                  />
                  <Route
                    path="abordajes"
                    element={
                      <RutaProtegidaAdmin>
                        <AbordajesPanel />
                      </RutaProtegidaAdmin>
                    }
                  />
                  {/* QA 5.6: corregir el trazado y las paradas de una ruta. */}
                  <Route
                    path="rutas"
                    element={
                      <RutaProtegidaAdmin>
                        <CorregirRutas />
                      </RutaProtegidaAdmin>
                    }
                  />
                  <Route
                    path="vehiculos"
                    element={
                      <RutaProtegidaAdmin>
                        <Vehiculos />
                      </RutaProtegidaAdmin>
                    }
                  />
                  <Route
                    path="exportar"
                    element={
                      <RutaProtegidaAdmin>
                        <ExportarDatos />
                      </RutaProtegidaAdmin>
                    }
                  />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </AuthAdminProvider>
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
      </SesionPasajeroProvider>
    </AuthProvider>
  );
}

/**
 * `/registro/4` -> `/?parada=4`.
 * La reserva vive en la hoja del mapa.
 */
function DelQrAlMapa() {
  const { paradaId } = useParams();

  return (
    <Navigate
      to={`/?parada=${encodeURIComponent(paradaId ?? '')}`}
      replace
    />
  );
}
