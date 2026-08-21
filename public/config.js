// Configuracion de TIEMPO DE EJECUCION.
//
// Este archivo NO se compila dentro del bundle: Vite lo copia tal cual a dist/.
// Para apuntar la app a otro backend se edita este archivo en el servidor y se
// recarga la pagina. No hay que volver a compilar (criterio de HU-26).
//
// En produccion lo normal es que el contenedor lo genere al arrancar, a partir
// de una variable de entorno.
window.__ECORUTA__ = {
  // URL base del backend, sin barra final.
  apiUrl: 'http://localhost:8080',
};
