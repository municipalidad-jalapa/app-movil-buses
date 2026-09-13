# language: es

Característica: Criterio 5 - Paradas atendidas frente a pendientes

  Como conductor
  Quiero distinguir las paradas por las que ya pasé de las que me faltan
  Para ordenar lo que sigue de mi recorrido de un vistazo

  Escenario: Una parada atendida se marca como tal
    Dado que el backend informa que el bus ya pasó por "Parque Central"
    Cuando el conductor mira el panel
    Entonces "Parque Central" se muestra como atendida
    Y no como pendiente

  Escenario: Una parada atendida no muestra un ETA en minutos
    Dado que "Parque Central" ya fue atendida
    Cuando el conductor mira el panel
    Entonces no ve un número de minutos para "Parque Central"
    Sino un texto que indica que el bus ya pasó

  Escenario: Una parada atendida sigue mostrando sus reservas activas
    Dado que "Parque Central" ya fue atendida y tiene 5 reservas activas
    Cuando el conductor mira el panel
    Entonces sigue viendo "5" reservas activas para "Parque Central"

  Escenario: La distinción no depende solo del color
    Dado que el conductor mira el panel en luz cambiante dentro del bus
    Entonces cada parada atendida lleva también un texto ("Atendida")
    Y cada parada pendiente lleva también un texto ("Pendiente")
