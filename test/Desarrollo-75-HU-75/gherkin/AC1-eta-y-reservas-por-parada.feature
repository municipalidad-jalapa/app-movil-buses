# language: es

Característica: Criterio 1 - ETA y reservas activas por parada

  Como conductor
  Quiero ver, por cada parada, el tiempo estimado de llegada y la cantidad de
  reservas activas
  Para saber cuánta gente me espera y en cuánto tiempo llego a cada punto

  Escenario: Cada fila trae los dos datos
    Dado que la ruta activa tiene paradas "Parque Central" y "Mercado"
    Y el backend informa ETA de 6 minutos y 2 reservas activas para "Parque Central"
    Y el backend informa un rango de 8 a 11 minutos y 5 reservas activas para "Mercado"
    Cuando el conductor abre su panel
    Entonces ve "Llega en 6 min" y "2" junto a "Parque Central"
    Y ve "Llega en 8–11 min" y "5" junto a "Mercado"

  Escenario: Una parada sin reservas muestra cero, no un espacio vacío
    Dado que "Terminal" no tiene reservas activas
    Cuando el conductor abre su panel
    Entonces "Terminal" muestra "0" reservas activas
