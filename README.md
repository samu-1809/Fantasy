# 🧩 Fantasy Fútbol Sala — MVP Requisitos Funcionales

## ⚙ Descripción general  
Plataforma web estilo Fantasy Football pero enfocada al *fútbol sala local*, con un sistema de puntuaciones manual y un único administrador.  
Los jugadores se asignan a equipos de usuarios, compiten por puntos en base al rendimiento de jugadores reales y gestionan un mercado de fichajes.  

---

## 🔐 Pantallas y flujo de usuario

### ⿡ Pantalla de Login / Registro
- *Login:* Usuario y contraseña.  
- *Registro:* Usuario, correo, contraseña, repetir contraseña.  
- Validaciones:
  - Formato de correo correcto.
  - Contraseña segura (mínimo 8 caracteres, mayúscula, número).
  - Mensajes de error si hay fallo.
- Tras registrarse → vuelve al login.
- Si el usuario es *admin, entra en la **interfaz de administración*.  
- Si es *usuario normal*, entra al juego con su equipo.

---

### ⿢ Asignación inicial
- Al registrarse:
  - Se crea automáticamente un *equipo* con el nombre del usuario.
  - Se le asignan *7 jugadores aleatorios*:
    - 1 portero  
    - 3 defensas  
    - 3 delanteros  
  - Ningún jugador puede pertenecer a más de un equipo.
  - Valor total del equipo ≈ *25M, descontado del presupuesto inicial (50M*).
- El usuario empieza con el *resto del presupuesto disponible*.

---

### ⿣ Navegación principal
Una vez dentro, el usuario verá *3 pestañas principales + Calendario*:

| Pestaña | Funcionalidad principal |
|----------|--------------------------|
| 🧤 Mi Equipo | Ver plantilla, hacer cambios, poner jugadores a la venta |
| 💸 Mercado | Consultar jugadores disponibles y realizar pujas |
| 🏆 Clasificación | Ver ranking de equipos y consultar plantillas rivales |
| 📅 Calendario | Consultar las jornadas creadas por el admin |

---

## 🧤 Pantalla “Mi Equipo”
- Visualización de una *media pista de fútbol sala* con 5 titulares y un banquillo.  
- En la parte superior:
  - Nº jugadores actuales (ej: 6/11).
  - Presupuesto disponible.  
- Límite de plantilla:  
  - 1 portero  
  - 2 defensas  
  - 2 delanteros  
  - Resto banquillo (rotación libre).

### Acciones sobre jugador:
1. *Cambiar:*  
   - Selecciona un jugador (se marca en verde).  
   - Selecciona otro del banquillo de la misma posición.  
   - Si no es la misma posición → alerta “Los jugadores no juegan en la misma posición.”  
   - Si ya está en plantilla → “El jugador ya está en la plantilla.”  

2. *Poner a la venta:*  
   - Cuadro modal para introducir valor inicial.  
   - Al confirmar:
     - El jugador desaparece de la plantilla.  
     - Se pone en el mercado con *cuenta regresiva de 24h*.  
   - No se puede vender si:
     - Solo queda 1 portero, 2 defensas o 2 delanteros.

---

## 💸 Pantalla “Mercado”
- Muestra todos los jugadores disponibles con:
  - Nombre  
  - Posición  
  - Valor actual  
  - Tiempo restante de subasta (24h).  
- En la parte superior:
  - Presupuesto actual.  
  - Jugadores totales (8/11, por ejemplo).  

### Acciones:
- *Pujar:*  
  - Abre cuadro modal para introducir oferta.  
  - Solo se puede pujar si:
    - La puja es mayor que el valor actual del jugador.  
    - El presupuesto + posibles ventas ≥ puja total.  
- Al finalizar la cuenta atrás:
  - El jugador pasa al *equipo con la puja más alta*.
- Si nadie puja:
  - El jugador vuelve al mercado libre o recibe una oferta automática del “sistema”.

---

## 🏆 Pantalla “Clasificación”
- Tabla ordenada por puntos totales.  
- Muestra:
  - Nombre del equipo  
  - Puntos  
  - Valor total de plantilla  
- Al hacer clic en un equipo:
  - Se muestra su plantilla (titulares y banquillo).  
  - Se puede ofrecer por sus jugadores:
    - Valor mínimo = valor del jugador.
    - Solo si el presupuesto + posibles ventas ≥ oferta.  

---

## 📅 Pantalla “Calendario”
- Lista de jornadas creadas por el admin.  
- Cada jornada incluye los *partidos reales* del fútbol sala local.  
- Permite ver:
  - Estado (pendiente / en juego / finalizada).  
  - Enlaces a puntuaciones.  

---

## 🧑‍💼 Pantalla “Admin”
- Solo accesible con credenciales de administrador.  
- No tiene “Mi Equipo”, “Mercado” ni “Clasificación”.  

### Funciones:
1. *Asignar puntos:*  
   - Buscar jugador por nombre o equipo.  
   - Asignar puntuación por jornada.  
   - Cada jugador acumula historial de puntuaciones.  

2. *Crear jornadas:*  
   - Crear nueva jornada con sus partidos reales.  
   - Al finalizar jornada:
     - Actualizar puntos.  
     - Repartir dinero: *100.000 € por punto obtenido*.  
     - Actualizar *valor de los jugadores* según rendimiento.

---

## 💰 Sistema de valoración y evolución
- El valor de los jugadores *se actualiza cada jornada* en función de:
  - Puntos obtenidos en la anterior jornada.  
  - Tendencia del mercado (pujas y ventas).  
- Jugadores con alto rendimiento → suben de valor.  
- Jugadores con bajo rendimiento → bajan de valor.  

---

## 🧾 Reglas adicionales
- Si un usuario no entra una semana:
  - Mantiene su alineación anterior.
  - Sus jugadores siguen puntuando.
  - No puede aceptar ofertas (se bloquean automáticamente).
- Si un jugador está en el mercado sin ofertas:
  - Recibe una automática de la “máquina” por su valor base.
