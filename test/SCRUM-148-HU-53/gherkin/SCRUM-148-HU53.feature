# language: es

Característica: Reservar un lugar en la parada

  Como pasajero
  Quiero indicar desde el mapa que estoy esperando el bus en una parada
  Para que el conductor sepa que debe detenerse por mí

  # Desde el rediseño del sprint 5 la reserva vive en la hoja inferior del
  # mapa (artboards R1, R2 y R3 de design/EcoRuta.dc.html). El QR de la parada
  # sigue apuntando a "/registro/:id", que abre el mapa con esa parada elegida.

  Escenario: Reservar tocando una parada en el mapa
    Dado que el pasajero abre el mapa sin parada elegida
    Y toca la parada "1a Calle - Mercado"
    Y la hoja muestra "Parada elegida" con cuántas personas esperan ahí
    Cuando presiona "Estoy esperando aquí"
    Y acepta compartir su ubicación
    Entonces se envía la reserva con la parada, el dispositivo y las coordenadas
    Y la hoja muestra "Ya avisamos que estás esperando"

  Escenario: Entrar por el QR de la parada
    Dado que el pasajero escanea el QR de la parada 3
    Cuando se abre "/registro/3"
    Entonces ve el mapa con la parada 3 elegida

  Escenario: El pasajero ya había avisado desde este teléfono
    Dado que el pasajero ya tiene una reserva vigente
    Cuando vuelve a abrir la app
    Entonces la hoja muestra "Ya avisamos que estás esperando"
    Y no se crea una reserva nueva
