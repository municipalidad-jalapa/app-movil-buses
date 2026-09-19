# language: es

Característica: Criterio 4 - Legible de un vistazo, sin navegar

  Como conductor
  Quiero ver todo lo que necesito en una sola pantalla
  Para consultarlo en segundos mientras manejo

  Escenario: Todo el recorrido está en una sola pantalla
    Dado que el conductor abre su panel
    Entonces ve la lista completa de paradas sin cambiar de pantalla
    Y no necesita presionar ningún botón para ver el ETA o las reservas

  Escenario: El estado de carga y de error se entienden sin texto técnico
    Dado que los datos todavía no llegaron
    Cuando el conductor mira el panel
    Entonces ve un indicador de carga en lenguaje claro

  Escenario: Un error de red se explica en lenguaje claro
    Dado que la petición de ETA falla por un problema de red
    Cuando el conductor mira el panel
    Entonces ve un mensaje en español llano, sin código HTTP ni jerga técnica
    Y puede reintentar con una sola acción
