import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { Mapa } from './paginas/Mapa';
import { NoEncontrada } from './paginas/NoEncontrada';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Mapa />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
