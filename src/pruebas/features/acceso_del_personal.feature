# language: es
@QA-vistas-separadas @frontend
Característica: Vistas separadas para el pasajero y el personal

  Como municipalidad
  quiero que el pasajero no vea las opciones de acceso del conductor ni de la administración
  para que el menú público solo muestre lo que le sirve al pasajero

  @criterio-1
  Escenario: El menú del invitado no ofrece el acceso del personal
    Dado que entro a la aplicación como invitado
    Cuando abro el menú
    Entonces veo las opciones "Pasajero" e "Iniciar sesión"
    Y no veo las opciones "Conductor" ni "Administrador"

  @criterio-1
  Escenario: El menú del pasajero con cuenta no ofrece el acceso del personal
    Dado que tengo la sesión iniciada con Google
    Cuando abro el menú
    Entonces veo la opción "Cerrar sesión"
    Y no veo las opciones "Conductor" ni "Administrador"

  @criterio-2
  Escenario: La ruta /tools ofrece las tres opciones de acceso
    Dado que abro "/tools"
    Entonces veo las opciones de acceso "Pasajero", "Conductor" y "Administrador"

  @criterio-2
  Escenario: Desde /tools el conductor llega a su inicio de sesión
    Dado que abro "/tools"
    Cuando elijo "Conductor"
    Entonces veo "Login del conductor"

  @criterio-2
  Escenario: Desde /tools el administrador llega al panel municipal
    Dado que abro "/tools"
    Cuando elijo "Administrador"
    Entonces veo "Pantalla del administrador"

  @criterio-2
  Escenario: Desde /tools el pasajero vuelve al mapa
    Dado que abro "/tools"
    Cuando elijo "Pasajero"
    Entonces veo "Mapa del pasajero"
