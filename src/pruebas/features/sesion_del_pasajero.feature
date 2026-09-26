# language: es
@SCRUM-26 @HU-146 @bloque-B @frontend
Característica: Sesión opcional del pasajero

  Como pasajero
  quiero entrar como invitado o con mi cuenta de Google
  para usar la app sin cuenta o conservar mis datos en cualquier dispositivo

  @B1-criterio-1
  Escenario: La primera vez se ofrecen dos opciones con la misma jerarquía
    Dado que abro la aplicación por primera vez
    Entonces veo "Ingresar como invitado" e "Iniciar sesión" con el mismo estilo

  @B1-criterio-2 @B1-criterio-4 @B1-criterio-5
  Escenario: Como invitado se entra de inmediato y la elección se recuerda
    Dado que abro la aplicación por primera vez
    Cuando elijo "Ingresar como invitado"
    Entonces veo la aplicación del pasajero
    Y al volver a abrirla no se me pregunta de nuevo

  @B1-criterio-3
  Escenario: Iniciar sesión con Google y conservar lo hecho como invitado
    Dado que abro la aplicación por primera vez
    Y que este teléfono tiene 2 reservas y 1 opinión como invitado
    Cuando inicio sesión con Google
    Entonces veo "Guardamos en tu cuenta 2 reservas y 1 opinión de este teléfono."
    Y el menú muestra mi cuenta

  @B1-criterio-8
  Escenario: Si Google falla se explica y se puede seguir como invitado
    Dado que abro la aplicación por primera vez
    Y que Google no deja iniciar sesión
    Cuando inicio sesión con Google
    Entonces veo el aviso "No pudimos iniciar sesión con Google."
    Cuando elijo "Continuar como invitado"
    Entonces veo la aplicación del pasajero

  @B1-criterio-6
  Escenario: Cerrar sesión vuelve al modo invitado
    Dado que tengo la sesión iniciada con Google
    Cuando cierro sesión desde el menú
    Entonces el menú muestra que estoy como invitado
