# language: es

Característica: Elegir la parada y el botón principal (SCRUM-252)

  Escenario: Mostrar la hoja sin parada elegida
    Dado que el pasajero abre el mapa
    Cuando la pantalla termina de cargar
    Entonces debe mostrarse "¿En qué parada vas a esperar?"
    Y debe mostrarse el botón "Usar la parada más cercana"

  Escenario: Elegir una parada
    Dado que el pasajero está en el mapa sin parada elegida
    Cuando toca una parada
    Entonces debe mostrarse el botón "Estoy esperando aquí"
    Y debe mostrarse "Elegir otra parada"
