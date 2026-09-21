# language: es
@SCRUM-26 @HU-146 @bloque-G @frontend
Característica: Criterios visuales verificables

  Como equipo
  quiero que "visiblemente agradable" sea un conjunto de números que una prueba revisa
  para que la calidad visual no dependa de la opinión de quien mire la pantalla

  @G-criterio-1
  Escenario: La tipografía del cuerpo se lee sin esfuerzo
    Entonces el texto base mide 16 px
    Y ninguna hoja de estilo declara una letra menor a 11 px

  @G-criterio-1
  Escenario: El contraste cumple WCAG AA de día y de noche
    Entonces cada par de color documentado llega a 4.5 a 1 en modo claro
    Y cada par de color documentado llega a 4.5 a 1 en modo oscuro

  @G-criterio-1
  Escenario: El área tocable nunca baja del mínimo
    Entonces el área tocable mínima del tema es de al menos 44 px
    Y ninguna altura mínima declarada baja de 44 px

  @G-criterio-1
  Escenario: La paleta vive en un solo lugar
    Entonces los colores nuevos salen del tema y no se escriben a mano

  @G-criterio-2
  Escenario: En un teléfono no hay desplazamiento horizontal
    Entonces ninguna pantalla del pasajero fija un ancho mayor al del teléfono

  @G-criterio-3
  Escenario: Cargando tiene tratamiento visual, no una pantalla en blanco
    Dado que el panel todavía no recibe los datos
    Cuando abro la pantalla del piloto
    Entonces veo que algo está pasando y no una pantalla vacía

  @G-criterio-3
  Escenario: El vacío se explica y ofrece una salida
    Dado que no hay abordajes en el periodo
    Cuando abro los pasajeros subidos del panel
    Entonces veo un texto que explica el vacío y un botón para limpiar filtros

  @G-criterio-3
  Escenario: El error se anuncia en palabras entendibles
    Dado que el servidor falla al cargar los abordajes
    Cuando abro los pasajeros subidos del panel
    Entonces veo un aviso de error anunciado a la tecnología de asistencia
