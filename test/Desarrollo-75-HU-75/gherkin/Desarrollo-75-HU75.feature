# language: es

Característica: Ver el ETA por parada como conductor

  Como conductor
  Quiero ver el tiempo estimado a cada parada de mi recorrido junto con las
  reservas activas
  Para ordenar mi salida y saber dónde me van a estar esperando

  Antecedentes:
    Dado que el conductor tiene una sesión válida
    Y su ruta activa es "Ruta Centro" con paradas "Parque Central", "Mercado" y "Terminal"

  Escenario: Ver el panel con ETA y reservas activas por parada
    Dado que el backend responde el ETA y las reservas activas de la ruta
    Cuando el conductor abre su panel
    Entonces cada parada del recorrido muestra su tiempo estimado de llegada
    Y cada parada muestra la cantidad de reservas activas

  Escenario: El panel no muestra datos de otra ruta
    Dado que existe otra ruta con sus propias paradas y reservas
    Cuando el conductor abre su panel
    Entonces solo ve las paradas de "Ruta Centro"
    Y no ve paradas ni reservas de la otra ruta

  Escenario: La ruta se deduce de la sesión, no se elige a mano
    Dado que el conductor inicia sesión
    Entonces el panel no ofrece ningún selector de ruta
    Y consulta el ETA y las reservas usando la ruta de su sesión

  Esquema del escenario: Presentación honesta del ETA según su confianza
    Dado que el backend informa una parada con confianza "<confianza>"
    Cuando el conductor mira el panel
    Entonces la parada muestra "<presentación>"

    Ejemplos:
      | confianza | presentación                        |
      | alta      | un número exacto de minutos          |
      | media     | un rango de minutos                  |
      | baja      | la próxima salida programada, sin ETA |

  Escenario: Una parada ya atendida se distingue de una pendiente
    Dado que el bus ya pasó por "Parque Central" en el recorrido en curso
    Cuando el conductor mira el panel
    Entonces "Parque Central" aparece marcada como atendida
    Y las demás paradas aparecen como pendientes

  Escenario: Un ETA no confiable se indica en vez de mostrar un número engañoso
    Dado que el ETA de una parada no tiene ningún dato confiable
    Cuando el conductor mira el panel
    Entonces la parada indica que el tiempo no está disponible
    Y no se muestra ningún número de minutos para esa parada

  Escenario: El conductor no puede ver el ETA de una ruta que no es la suya
    Dado que el conductor autenticado no está asignado a la ruta consultada
    Cuando se pide el ETA de esa ruta
    Entonces el backend responde 403
    Y el panel muestra un mensaje de permiso, no una pantalla en blanco
