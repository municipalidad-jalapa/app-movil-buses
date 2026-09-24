# language: es

Característica: Imagen Docker de producción (SCRUM-11)

  Como equipo del proyecto
  Quiero la aplicación empaquetada como imagen Docker
  Para desplegarla fuera del entorno de desarrollo

  Escenario: La imagen se construye en dos etapas
    Dado el archivo "dockerfile"
    Entonces compila con Node 20 en una primera etapa
    Y sirve el resultado con Nginx en la etapa final
    Y la imagen final no contiene Node ni el código fuente

  Escenario: El build es reproducible
    Dado el archivo "dockerfile"
    Entonces instala con "npm ci" respetando package-lock.json
    Y copia package*.json antes del código para aprovechar la caché

  Escenario: El contexto de build no arrastra basura ni secretos
    Dado el archivo ".dockerignore"
    Entonces excluye "node_modules", "dist", ".git", ".env" y ".env.local"

  Escenario: El contenedor responde
    Dado que la imagen está corriendo
    Cuando se consulta "/health"
    Entonces responde 200 con el texto "healthy"

  Escenario: Recargar una pantalla no da 404
    Dado que la imagen está corriendo
    Cuando se abre una ruta de la aplicación como "/ruta/que/no/existe"
    Entonces Nginx devuelve "index.html" con estado 200

  Escenario: Los tipos de archivo especiales se sirven bien
    Dado que la imagen está corriendo
    Entonces el worker de MapLibre (.mjs) se sirve como JavaScript
    Y el manifest (.webmanifest) se sirve como "application/manifest+json"
    Y el service worker de avisos se sirve como JavaScript y sin caché

  Escenario: El pipeline publica la imagen
    Dado un push a la rama "develop"
    Entonces se construye la imagen de QA
    Cuando el push es a la rama "main"
    Entonces se construye la imagen de producción con el mismo nombre de imagen
