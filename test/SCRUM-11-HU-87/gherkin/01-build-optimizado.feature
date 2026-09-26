# language: es

Característica: Build optimizado de React (SCRUM-11 · npm run build)

  Como equipo del proyecto
  Quiero que "npm run build" genere un paquete optimizado
  Para que la app cargue rápido en teléfonos de gama baja con datos móviles

  Escenario: El build termina sin errores
    Dado que las dependencias están instaladas
    Cuando se ejecuta "npm run build"
    Entonces la verificación de tipos termina sin errores
    Y Vite genera la carpeta de salida con "index.html" y los "assets"

  Escenario: Los archivos se pueden cachear con seguridad
    Dado que el build terminó
    Entonces cada archivo de "assets" lleva un hash en el nombre
    Y no se publican mapas de código fuente

  Escenario: El JavaScript está minificado y dentro del presupuesto de peso
    Dado que el build terminó
    Entonces el JavaScript principal está minificado
    Y todo el JavaScript pesa menos de 500 kB comprimido

  Escenario: Las fuentes salen del propio dominio
    Dado que el build terminó
    Entonces el CSS y el HTML no llaman a Google Fonts

  Escenario: El mapa dibuja la ruta y las paradas
    Dado que el build terminó
    Entonces el worker de MapLibre y su fragmento compartido están junto al bundle
