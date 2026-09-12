# language: es

Característica: Criterio 3 - Misma frecuencia que la pantalla del pasajero

  Como conductor
  Quiero que el panel se actualice solo, sin que yo tenga que refrescar
  Para confiar en que lo que veo sigue vigente

  Escenario: El panel vuelve a consultar sin acción del conductor
    Dado que el conductor tiene el panel abierto
    Cuando pasa el intervalo de actualización compartido con la pantalla del pasajero
    Entonces el panel vuelve a pedir el ETA y las reservas activas
    Sin que el conductor haga ninguna acción

  Escenario: La cadencia es una única constante compartida
    Dado que la pantalla del pasajero y el panel del conductor consumen datos
    que no viajan por streaming
    Entonces ambas pantallas usan la misma constante de intervalo
    Para que no puedan desincronizarse por accidente
