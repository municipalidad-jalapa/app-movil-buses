import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';

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
