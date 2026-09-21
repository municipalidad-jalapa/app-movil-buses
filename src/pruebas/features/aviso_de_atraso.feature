# language: es
@SCRUM-26 @HU-146 @bloque-E @frontend
Característica: Aviso de atraso

  Como piloto
  quiero avisar que vengo demorado
  para que el pasajero sepa por qué el bus tarda más de lo estimado

  @E2-criterio-2
  Escenario: El piloto avisa un atraso con motivo y demora
    Dado que soy el piloto y no tengo ningún atraso reportado
    Cuando elijo el motivo "Incidente" y una demora de 20 minutos
    Y aviso el atraso
    Entonces se reporta el atraso por "incidente" de 20 minutos
    Y la pantalla confirma que los pasajeros ya lo están viendo

  @E2-criterio-2
  Escenario: El aviso no se manda dos veces por un doble toque
    Dado que soy el piloto y no tengo ningún atraso reportado
    Cuando aviso el atraso dos veces seguidas
    Entonces el atraso se reporta una sola vez

  @E2-criterio-2
  Escenario: Si el aviso falla se explica en palabras entendibles
    Dado que soy el piloto y no tengo ningún atraso reportado
    Y que el servidor rechaza el aviso
    Cuando aviso el atraso
    Entonces veo un aviso de error que no es el error crudo de la API

  @E2-criterio-2
  Escenario: El piloto retira el aviso cuando se normaliza
    Dado que soy el piloto y tengo un atraso reportado por "tráfico" de 10 minutos
    Cuando retiro el aviso
    Entonces vuelvo a ver el formulario para avisar un atraso

  @E3-criterio-3
  Escenario: El pasajero ve la demora junto al tiempo estimado
    Dado que la ruta que estoy mirando tiene un atraso reportado por "tráfico" de 15 minutos
    Y que el bus llega en 8 minutos
    Cuando abro la pantalla del pasajero
    Entonces veo "Llega en 8 min, con demora reportada"
    Y veo que el piloto avisó tráfico y unos 15 min más

  @E3-criterio-3
  Escenario: Sin atraso reportado no se muestra ningún aviso
    Dado que la ruta que estoy mirando no tiene ningún atraso reportado
    Cuando abro la pantalla del pasajero
    Entonces no veo ningún aviso de demora
