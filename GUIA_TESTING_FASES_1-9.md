# Guía de Testing - Fases 1-9: Sistema de Congelación y Validaciones

**Fecha:** Octubre 2025
**Versión:** 1.0
**Estado:** Implementación completa verificada

---

## 📋 Resumen Ejecutivo

Se han implementado 9 fases que completan el sistema de congelación de alineaciones, validaciones de mercado, ofertas del sistema y mejoras en la UI. Todos los cambios están implementados tanto en backend como en frontend.

### Funcionalidades Principales Añadidas:

1. ✅ **Congelación de Alineaciones** - Sistema de snapshots inmutables al inicio de cada jornada
2. ✅ **Validaciones de Mercado** - Límites de pujas/ofertas basados en espacios disponibles
3. ✅ **Bloqueo de Venta de Titulares** - Desde "Mi Equipo", deben estar en banquillo primero
4. ✅ **Ofertas Directas** - Permitidas para titulares desde pantalla de clasificación
5. ✅ **Ofertas del Sistema** - Automáticas tras 24h sin pujas
6. ✅ **Reparto de Dinero** - €100,000 por punto solo para alineaciones completas
7. ✅ **Advertencias de UI** - Indicadores visuales de alineación incompleta
8. ✅ **Slots Vacíos** - Visualización de posiciones faltantes en el campo
9. ✅ **Límites Visuales** - Banner mostrando pujas/ofertas activas vs disponibles

---

## 🗄️ Cambios en Base de Datos

### Nuevos Modelos

#### `AlineacionCongelada`
Almacena snapshots inmutables de alineaciones al inicio de cada jornada.

**Campos:**
- `equipo` (FK) - Equipo al que pertenece
- `jornada` (FK) - Jornada en la que se congeló
- `jugadores_titulares` (M2M) - Los 5 titulares congelados
- `fecha_congelacion` (DateTime) - Momento exacto de congelación
- `tiene_posiciones_completas` (Boolean) - Si cumple mínimo (1 POR, 2 DEF, 2 DEL)
- `posiciones_faltantes` (JSON) - Lista de posiciones faltantes si incompleta
- `puntos_obtenidos` (Integer) - Puntos ganados en esta jornada (calculado después)
- `dinero_ganado` (Integer) - Dinero ganado en esta jornada (calculado después)

**Restricción:** Unique constraint en `(equipo, jornada)` - solo un snapshot por equipo por jornada

### Campos Añadidos a Modelos Existentes

#### `Jornada`
- `fecha_inicio` (DateTime, nullable) - Momento de inicio de la jornada
- `alineaciones_congeladas` (Boolean, default=False) - Flag de si ya se congelaron alineaciones

#### `Oferta`
- `es_del_sistema` (Boolean, default=False) - Identifica ofertas automáticas del sistema
- `equipo_ofertante` (FK, nullable) - Ahora puede ser null para ofertas del sistema

#### `Puja`
- `activa` (Boolean, default=True) - Permite desactivar pujas que ya no cuentan para el límite

#### `Notificacion`
**Nuevas categorías añadidas:**
- `oferta_directa_recibida` - Usuario recibe oferta directa por un titular
- `sistema_oferta` - El sistema hizo una oferta por tu jugador
- `alineacion_incompleta` - Advertencia de alineación incompleta al congelar

---

## 🚀 Pasos de Instalación

### 1. Activar Entorno Virtual

```bash
cd backend
source venv/bin/activate  # Linux/Mac
# O en Windows: venv\Scripts\activate
```

### 2. Crear y Aplicar Migraciones

```bash
# Generar archivos de migración
python manage.py makemigrations fantasy

# Deberías ver algo como:
# Migrations for 'fantasy':
#   fantasy/migrations/0004_auto_XXXXXX.py
#     - Add field fecha_inicio to jornada
#     - Add field alineaciones_congeladas to jornada
#     - Add field es_del_sistema to oferta
#     - Alter field equipo_ofertante on oferta
#     - Add field activa to puja
#     - Create model AlineacionCongelada

# Aplicar migraciones
python manage.py migrate

# Deberías ver:
# Running migrations:
#   Applying fantasy.0004_auto_XXXXXX... OK
```

### 3. Verificar Migraciones

```bash
# Ver estado de migraciones
python manage.py showmigrations fantasy

# Deberías ver todas con [X]:
# fantasy
#  [X] 0001_initial
#  [X] 0002_jugador_goles_alter_notificacion_categoria
#  [X] 0003_puntuacion_goles
#  [X] 0004_auto_XXXXXX
```

### 4. Verificar en Django Shell

```bash
python manage.py shell
```

```python
>>> from fantasy.models import AlineacionCongelada, Jornada, Oferta, Puja
>>>
>>> # Verificar que AlineacionCongelada existe
>>> AlineacionCongelada.objects.all()
<QuerySet []>
>>>
>>> # Verificar campo fecha_inicio en Jornada
>>> jornada = Jornada.objects.first()
>>> hasattr(jornada, 'fecha_inicio')
True
>>> hasattr(jornada, 'alineaciones_congeladas')
True
>>>
>>> # Verificar campo es_del_sistema en Oferta
>>> oferta = Oferta.objects.first()
>>> hasattr(oferta, 'es_del_sistema')
True
>>>
>>> # Verificar campo activa en Puja
>>> puja = Puja.objects.first()
>>> hasattr(puja, 'activa')
True
>>>
>>> exit()
```

### 5. Verificar Django Admin

```bash
# Iniciar servidor
python manage.py runserver

# Acceder a http://127.0.0.1:8000/admin/
# Login con superusuario
# Deberías ver "Alineaciones Congeladas" en la sección Fantasy
```

---

## 🧪 Guía de Testing por Funcionalidad

### Funcionalidad 1: Congelación de Alineaciones

#### ¿Qué hace?
Al inicio de cada jornada, el sistema crea un snapshot inmutable de la alineación de cada equipo. Solo los jugadores en este snapshot ganarán puntos y dinero.

#### Pasos de Prueba:

**1. Preparar Datos de Prueba**

```bash
python manage.py shell
```

```python
from fantasy.models import Liga, Equipo, Jornada, Jugador
from django.utils import timezone

# Obtener o crear una liga
liga = Liga.objects.first()

# Crear una jornada CON fecha_inicio
jornada = Jornada.objects.create(
    liga=liga,
    numero=1,
    nombre="Jornada 1 - Test",
    fecha_inicio=timezone.now()  # ⬅️ IMPORTANTE: Con fecha_inicio
)

print(f"✅ Jornada {jornada.numero} creada con fecha_inicio: {jornada.fecha_inicio}")

# Verificar que hay equipos con jugadores
equipos = Equipo.objects.filter(liga=liga)
for equipo in equipos:
    jugadores_count = equipo.jugadores.count()
    titulares_count = equipo.jugadores.filter(en_banquillo=False).count()
    print(f"Equipo: {equipo.nombre} - Total: {jugadores_count}, Titulares: {titulares_count}")

exit()
```

**2. Ejecutar Comando de Congelación**

```bash
python manage.py congelar_alineaciones
```

**Resultado Esperado:**
```
🔒 Iniciando congelación de alineaciones...
📅 Buscando jornadas activas con fecha_inicio establecida...

✅ Jornada 1 - Jornada 1 - Test (Liga: La Liga Fantasy):
   - Fecha inicio: 2025-10-20 15:30:00
   - Ya congelada: False

⚡ Congelando alineaciones para Jornada 1...

  ✅ Equipo 1 (Usuario: user1) - Alineación completa: 5 titulares
     Posiciones: ['POR', 'DEF', 'DEF', 'DEL', 'DEL']

  ⚠️ Equipo 2 (Usuario: user2) - Alineación incompleta: 3 titulares
     Faltantes: ['DEF', 'DEL']
     ⚠️ NO ganará puntos ni dinero en esta jornada

✅ Jornada 1 marcada como congelada

🎯 Resumen:
   - Jornadas procesadas: 1
   - Alineaciones congeladas: 2
   - Alineaciones completas: 1
   - Alineaciones incompletas: 1
```

**3. Verificar en Django Admin**

```
1. Ir a http://127.0.0.1:8000/admin/fantasy/alineacioncongelada/
2. Deberías ver 2 registros (uno por cada equipo)
3. Verificar que:
   - "Tiene posiciones completas" = True para equipos con 1 POR, 2 DEF, 2 DEL
   - "Posiciones faltantes" = lista de posiciones faltantes para equipos incompletos
   - "Fecha congelación" = timestamp de cuándo se ejecutó el comando
```

**4. Verificar que NO se puede ejecutar dos veces**

```bash
python manage.py congelar_alineaciones
```

**Resultado Esperado:**
```
🔒 Iniciando congelación de alineaciones...
📅 Buscando jornadas activas con fecha_inicio establecida...

✅ Jornada 1 - Jornada 1 - Test (Liga: La Liga Fantasy):
   - Fecha inicio: 2025-10-20 15:30:00
   - Ya congelada: True ⏩ SALTANDO

🎯 Resumen:
   - Jornadas procesadas: 0
   - Alineaciones congeladas: 0
```

---

### Funcionalidad 2: Advertencia de Alineación Incompleta (UI)

#### ¿Qué hace?
Muestra un banner amarillo en "Mi Equipo" cuando la alineación no cumple el mínimo de 1 POR, 2 DEF, 2 DEL.

#### Pasos de Prueba:

**1. Crear Equipo con Alineación Incompleta**

```bash
python manage.py shell
```

```python
from fantasy.models import Equipo, Jugador

# Obtener un equipo
equipo = Equipo.objects.first()

# Mover todos los delanteros al banquillo (dejando solo 1 titular)
delanteros = equipo.jugadores.filter(posicion='DEL', en_banquillo=False)
for del_jugador in delanteros[1:]:  # Dejar solo 1
    del_jugador.en_banquillo = True
    del_jugador.save()

print(f"✅ Equipo {equipo.nombre} ahora tiene alineación incompleta")

exit()
```

**2. Probar en Frontend**

```bash
cd frontend
npm run dev
```

```
1. Login con el usuario del equipo modificado
2. Ir a "Mi Equipo"
3. Deberías ver un banner amarillo arriba que dice:

   ⚠️ Alineación Incompleta
   Tu alineación está incompleta. Te faltan: Delanteros
   ⚠️ Si la jornada inicia con esta alineación incompleta, NO ganarás puntos ni dinero en esa jornada.
   Mínimo requerido: 1 Portero, 2 Defensas, 2 Delanteros
```

**3. Completar Alineación**

```
1. En "Mi Equipo", seleccionar un delantero del banquillo
2. Hacer clic en "Intercambiar"
3. Seleccionar el delantero titular que quieres sacar
4. La advertencia amarilla debería desaparecer
```

---

### Funcionalidad 3: Slots Vacíos en el Campo

#### ¿Qué hace?
Muestra slots vacíos con iconos de posición cuando un equipo no tiene todos los jugadores asignados.

#### Pasos de Prueba:

**1. Crear Equipo con Jugadores Faltantes**

```bash
python manage.py shell
```

```python
from fantasy.models import Equipo

# Obtener un equipo
equipo = Equipo.objects.first()

# Quitar un defensa
defensa = equipo.jugadores.filter(posicion='DEF').first()
if defensa:
    defensa.equipo = None
    defensa.save()
    print(f"✅ Quitado {defensa.nombre} del equipo")

exit()
```

**2. Verificar en Frontend**

```
1. Login con el usuario del equipo
2. Ir a "Mi Equipo"
3. Deberías ver:
   - Un slot vacío en la fila de defensas con icono de escudo (🛡️)
   - El slot tiene borde punteado y fondo gris claro
   - Texto "DEF vacante"
```

---

### Funcionalidad 4: Límite de Pujas/Ofertas

#### ¿Qué hace?
Limita las pujas y ofertas activas según la fórmula: `espacios_disponibles = 11 - jugadores_actuales`

#### Casos de Prueba:

**Caso 1: Equipo con 10 jugadores (1 espacio libre)**

```bash
python manage.py shell
```

```python
from fantasy.models import Equipo

equipo = Equipo.objects.first()
print(f"Jugadores actuales: {equipo.jugadores.count()}")

# Asegurarse de que tiene 10 jugadores
while equipo.jugadores.count() > 10:
    jugador = equipo.jugadores.last()
    jugador.equipo = None
    jugador.save()

print(f"✅ Equipo tiene {equipo.jugadores.count()} jugadores")
print(f"✅ Espacios disponibles: {11 - equipo.jugadores.count()}")

exit()
```

**Probar en Frontend:**

```
1. Login con el usuario del equipo
2. Ir a "Mercado" → Tab "Mercado"
3. Deberías ver un banner azul arriba:

   Límite de Pujas/Ofertas Activas: 0 / 1
   Jugadores actuales: 10/11 • Espacios disponibles: 1
   Pujas activas: 0 • Ofertas activas: 0
   ℹ️ Puedes hacer 1 pujas/ofertas más.

4. Hacer una puja por un jugador
5. El banner debería actualizarse:

   Límite de Pujas/Ofertas Activas: 1 / 1
   ⚠️ Has alcanzado el límite máximo. Debes ganar una puja/oferta o retirarla antes de hacer más.

6. Intentar hacer otra puja
7. Deberías ver error:
   ❌ Has alcanzado el límite de pujas/ofertas activas (1/1).
   Debes ganar una puja/oferta o retirarla antes de continuar.
```

**Caso 2: Equipo con 7 jugadores (4 espacios libres)**

```
1. Repetir proceso anterior pero dejando 7 jugadores
2. El banner debería mostrar: "0 / 4"
3. Deberías poder hacer hasta 4 pujas/ofertas simultáneas
4. La quinta debería ser rechazada
```

---

### Funcionalidad 5: Bloqueo de Venta de Titulares desde "Mi Equipo"

#### ¿Qué hace?
Impide poner en venta jugadores titulares directamente desde "Mi Equipo". Deben moverse al banquillo primero.

#### Pasos de Prueba:

**1. Intentar Vender un Titular**

```
1. Login y ir a "Mi Equipo"
2. Hacer clic en un jugador TITULAR (no en banquillo)
3. Seleccionar "Poner en venta"
4. Ingresar un precio (ej: 6000000)
5. Hacer clic en "Confirmar venta"
6. Deberías ver error:

   ❌ No puedes poner en venta jugadores titulares desde Mi Equipo.
   Primero ponlos en el banquillo, o espera a que otros usuarios
   te hagan ofertas directas desde la clasificación.
```

**2. Mover al Banquillo y Vender**

```
1. Hacer clic en el mismo jugador titular
2. Seleccionar "Intercambiar"
3. Seleccionar un jugador del banquillo para intercambiar
4. Ahora el jugador está en el banquillo
5. Hacer clic en él de nuevo
6. Seleccionar "Poner en venta"
7. Ingresar precio
8. Hacer clic en "Confirmar venta"
9. Debería funcionar:
   ✅ [Nombre] puesto en venta por €[precio]
```

---

### Funcionalidad 6: Ofertas Directas desde Clasificación

#### ¿Qué hace?
Permite hacer ofertas directas por jugadores titulares de otros equipos desde la pantalla de clasificación, sin validación de "titular/banquillo".

#### Pasos de Prueba:

**1. Navegar a Clasificación**

```
1. Login y ir a "Clasificación"
2. Hacer clic en un equipo rival
3. Hacer clic en un jugador TITULAR del rival
4. Hacer clic en "Hacer oferta directa"
5. Ingresar monto (ej: 6000000)
6. Hacer clic en "Enviar oferta"
7. Debería funcionar sin error (a diferencia de "Mi Equipo"):
   ✅ Oferta enviada exitosamente
```

**2. Verificar Notificación del Rival**

```
1. Logout
2. Login con el usuario del equipo rival
3. Ir a "Notificaciones"
4. Deberías ver:

   📩 Oferta directa recibida
   [Usuario] ha hecho una oferta de €6,000,000 por [Jugador]
```

**3. Aceptar Oferta**

```
1. Ir a "Mercado" → Tab "Ofertas Recibidas"
2. Encontrar la oferta
3. Hacer clic en "Aceptar"
4. El jugador debería:
   - Cambiarse al equipo del ofertante
   - Ir al BANQUILLO automáticamente (no titular)
   - Desaparecer del equipo vendedor
```

**4. Verificar en Equipo Comprador**

```
1. Logout
2. Login con el usuario que hizo la oferta
3. Ir a "Mi Equipo"
4. El jugador debería estar en la sección de BANQUILLO
5. NO debería estar como titular
```

---

### Funcionalidad 7: Ofertas del Sistema

#### ¿Qué hace?
Tras 24 horas sin pujas, el sistema genera automáticamente ofertas con ±5% del precio de venta.

#### Pasos de Prueba:

**NOTA:** Esta funcionalidad requiere modificar manualmente las fechas en base de datos para simular el paso de 24 horas.

**1. Crear Jugador en Venta**

```bash
python manage.py shell
```

```python
from fantasy.models import Jugador, Equipo
from django.utils import timezone
from datetime import timedelta

# Obtener un jugador y ponerlo en venta
equipo = Equipo.objects.first()
jugador = equipo.jugadores.filter(en_banquillo=True).first()

jugador.en_venta = True
jugador.precio_venta = 5000000
jugador.fecha_mercado = timezone.now() - timedelta(hours=25)  # ⬅️ 25 horas atrás
jugador.save()

print(f"✅ {jugador.nombre} puesto en venta hace 25 horas")
print(f"Precio: €{jugador.precio_venta}")
print(f"Fecha mercado: {jugador.fecha_mercado}")

exit()
```

**2. Ejecutar Comando de Ofertas del Sistema**

```bash
python manage.py finalizar_subastas
```

**Resultado Esperado:**
```
🏦 Iniciando procesamiento de subastas finalizadas...
📅 Buscando jugadores en venta hace más de 24 horas sin pujas...

✅ Jugador: [Nombre]
   - Equipo: [Equipo]
   - Precio venta: €5,000,000
   - Hace: 25.1 horas
   - Pujas recibidas: 0

💰 Generando ofertas del sistema (±5%):
   - Oferta 1: €5,230,000 (Usuario: user2)
   - Oferta 2: €4,850,000 (Usuario: user3)

✅ 2 ofertas del sistema generadas

🎯 Resumen:
   - Jugadores procesados: 1
   - Ofertas generadas: 2
```

**3. Verificar en Base de Datos**

```bash
python manage.py shell
```

```python
from fantasy.models import Oferta

# Ver ofertas del sistema
ofertas_sistema = Oferta.objects.filter(es_del_sistema=True)
for oferta in ofertas_sistema:
    print(f"Oferta del sistema: €{oferta.monto}")
    print(f"  Equipo ofertante: {oferta.equipo_ofertante}")  # ⬅️ Debería ser None
    print(f"  Jugador: {oferta.jugador.nombre}")
    print(f"  Estado: {oferta.estado}")
    print("---")

exit()
```

**4. Aceptar Oferta del Sistema**

```
1. Login con el usuario del equipo vendedor
2. Ir a "Mercado" → Tab "Ofertas Recibidas"
3. Deberías ver ofertas con badge "SISTEMA":

   🤖 Oferta del Sistema
   €5,230,000 por [Jugador]
   Automática generada por el sistema

4. Hacer clic en "Aceptar"
5. El jugador debería:
   - Desvincularse del equipo (equipo = None)
   - Mantenerse en venta (en_venta = True)
   - Ir al banquillo (en_banquillo = True)
6. El equipo vendedor recibe el dinero
```

**5. Verificar en "Mi Equipo"**

```
1. Ir a "Mi Equipo"
2. El jugador NO debería aparecer (fue desvinculado)
3. El presupuesto del equipo debería haber aumentado
```

---

### Funcionalidad 8: Reparto de Dinero por Jornada

#### ¿Qué hace?
Tras asignar puntos, distribuye €100,000 por punto SOLO a equipos con alineación completa congelada.

#### Pasos de Prueba:

**1. Preparar Jornada Congelada con Puntos**

```bash
python manage.py shell
```

```python
from fantasy.models import Jornada, AlineacionCongelada, Jugador, Puntuacion
from django.utils import timezone

# Obtener jornada congelada
jornada = Jornada.objects.filter(alineaciones_congeladas=True).first()

# Asignar puntos a jugadores de alineación completa
alineacion_completa = AlineacionCongelada.objects.filter(
    jornada=jornada,
    tiene_posiciones_completas=True
).first()

if alineacion_completa:
    # Asignar puntos a 2 jugadores titulares
    jugadores_titulares = alineacion_completa.jugadores_titulares.all()[:2]

    for jugador in jugadores_titulares:
        Puntuacion.objects.create(
            jugador=jugador,
            jornada=jornada,
            puntos=5,  # 5 puntos
            goles=2
        )
        print(f"✅ {jugador.nombre}: 5 puntos asignados")

print(f"✅ Puntos asignados para Jornada {jornada.numero}")

exit()
```

**2. Ejecutar Comando de Reparto**

```bash
python manage.py repartir_dinero_jornada
```

**Resultado Esperado:**
```
💰 Iniciando reparto de dinero por jornada...
📅 Buscando jornadas con alineaciones congeladas...

✅ Jornada 1 - Jornada 1 - Test (Liga: La Liga Fantasy):

📊 Procesando alineaciones congeladas:

  ✅ Equipo: [Nombre Equipo] (Completa ✓)
     - Titulares congelados: 5 jugadores
     - Puntos ganados: 10 puntos
     - Dinero ganado: €1,000,000 (10 × €100,000)
     - Presupuesto anterior: €50,000,000
     - Presupuesto nuevo: €51,000,000

  ⚠️ Equipo: [Otro Equipo] (Incompleta ✗)
     - Posiciones faltantes: ['DEF', 'DEL']
     - ❌ NO recibe dinero por alineación incompleta

🎯 Resumen:
   - Jornadas procesadas: 1
   - Equipos que recibieron dinero: 1
   - Equipos penalizados (incompletos): 1
   - Dinero total distribuido: €1,000,000
```

**3. Verificar en Django Admin**

```
1. Ir a http://127.0.0.1:8000/admin/fantasy/alineacioncongelada/
2. Seleccionar la alineación completa
3. Verificar que:
   - "Puntos obtenidos" = 10
   - "Dinero ganado" = 1000000
```

**4. Verificar Presupuesto del Equipo**

```bash
python manage.py shell
```

```python
from fantasy.models import Equipo

equipo = Equipo.objects.get(nombre="[Nombre Equipo]")
print(f"Presupuesto actual: €{equipo.presupuesto}")
# Debería mostrar: Presupuesto actual: €51000000

exit()
```

---

### Funcionalidad 9: Banner de Límites en Mercado

#### ¿Qué hace?
Muestra un banner visual en la pantalla de Mercado indicando cuántas pujas/ofertas activas tienes vs el límite.

#### Pasos de Prueba:

**1. Sin Pujas/Ofertas Activas**

```
1. Login y ir a "Mercado"
2. Deberías ver un banner azul:

   ℹ️ Límite de Pujas/Ofertas Activas
   0 / [X]
   [Barra de progreso vacía - verde]

   Jugadores actuales: [Y]/11 • Espacios disponibles: [X]
   Pujas activas: 0 • Ofertas activas: 0
   ℹ️ Puedes hacer [X] pujas/ofertas más.
```

**2. Con 1 Puja Activa (< 75% del límite)**

```
1. Hacer una puja
2. El banner debería actualizarse a verde:

   ✅ Límite de Pujas/Ofertas Activas
   1 / [X]
   [Barra de progreso verde]

   Pujas activas: 1 • Ofertas activas: 0
   ℹ️ Puedes hacer [X-1] pujas/ofertas más.
```

**3. Llegando al 75% del límite**

```
1. Si límite es 4, hacer 3 pujas (3/4 = 75%)
2. El banner debería cambiar a amarillo:

   ⚠️ Límite de Pujas/Ofertas Activas
   3 / 4
   [Barra de progreso amarilla]

   Pujas activas: 3 • Ofertas activas: 0
   ℹ️ Puedes hacer 1 pujas/ofertas más.
```

**4. Alcanzando el Límite**

```
1. Hacer la cuarta puja
2. El banner debería cambiar a rojo:

   ⚠️ Límite de Pujas/Ofertas Activas
   4 / 4
   [Barra de progreso roja - 100%]

   Pujas activas: 4 • Ofertas activas: 0
   ⚠️ Has alcanzado el límite máximo. Debes ganar una puja/oferta o retirarla antes de hacer más.
```

---

## 📝 Casos de Prueba Completos (End-to-End)

### Caso E2E 1: Flujo Completo de una Jornada

**Objetivo:** Probar el ciclo completo desde congelación hasta reparto de dinero.

```
1. Crear jornada con fecha_inicio
2. Asegurar que Equipo A tiene alineación completa
3. Asegurar que Equipo B tiene alineación incompleta (solo 1 DEL)
4. Ejecutar: python manage.py congelar_alineaciones
   ✅ Verificar que Equipo A tiene snapshot completo
   ✅ Verificar que Equipo B tiene snapshot incompleto
5. Asignar puntos a jugadores titulares de ambos equipos
6. Ejecutar: python manage.py repartir_dinero_jornada
   ✅ Verificar que Equipo A recibió dinero
   ✅ Verificar que Equipo B NO recibió dinero
7. Verificar en Django Admin que AlineacionCongelada de Equipo A tiene:
   - puntos_obtenidos > 0
   - dinero_ganado > 0
8. Verificar que AlineacionCongelada de Equipo B tiene:
   - puntos_obtenidos = 0
   - dinero_ganado = 0
```

### Caso E2E 2: Sistema de Ofertas Completo

```
1. Usuario A pone jugador en venta (en banquillo)
2. Esperar 25 horas (simular con fecha_mercado)
3. Ejecutar: python manage.py finalizar_subastas
   ✅ Verificar que se crearon 2 ofertas del sistema
4. Usuario A acepta oferta del sistema
   ✅ Verificar que jugador se desvincule (equipo = None)
   ✅ Verificar que jugador siga en venta (en_venta = True)
   ✅ Verificar que presupuesto de Usuario A aumentó
5. Usuario B ve el jugador en mercado
6. Usuario B hace puja
7. Usuario B gana puja
   ✅ Verificar que jugador se asigne a equipo de Usuario B
   ✅ Verificar que jugador vaya al banquillo
   ✅ Verificar que presupuesto de Usuario B disminuyó
```

### Caso E2E 3: Límites de Pujas/Ofertas

```
1. Usuario A tiene 9 jugadores (2 espacios disponibles)
2. Usuario A hace 1 puja → Banner verde (1/2)
3. Usuario A hace 1 oferta directa → Banner amarillo (2/2)
4. Usuario A intenta hacer otra puja → ERROR
5. Usuario A retira la puja → Banner verde (1/2)
6. Usuario A puede hacer nueva puja → Banner amarillo (2/2)
7. La puja de Usuario A es aceptada (gana jugador)
8. Ahora Usuario A tiene 10 jugadores (1 espacio)
9. Banner se actualiza automáticamente a amarillo (1/1)
```

---

## 🛠️ Comandos de Gestión

### `congelar_alineaciones`

**Propósito:** Crear snapshots de alineaciones al inicio de jornada.

```bash
python manage.py congelar_alineaciones
```

**Cuándo ejecutar:**
- Al inicio de cada jornada (cuando fecha_inicio llega)
- Idealmente en un cron job programado

**Qué hace:**
1. Busca jornadas con `fecha_inicio` establecida y `alineaciones_congeladas=False`
2. Para cada equipo en la liga, crea un `AlineacionCongelada` con:
   - Los 5 jugadores titulares actuales
   - Flag de si cumple mínimo (1 POR, 2 DEF, 2 DEL)
   - Lista de posiciones faltantes
3. Marca la jornada como `alineaciones_congeladas=True`
4. Crea notificaciones para equipos con alineación incompleta

**Idempotente:** Sí - no duplica si ya está congelada.

---

### `finalizar_subastas`

**Propósito:** Generar ofertas automáticas del sistema tras 24h sin pujas.

```bash
python manage.py finalizar_subastas
```

**Cuándo ejecutar:**
- Cada 1-6 horas en producción (cron job)
- Manualmente para testing

**Qué hace:**
1. Busca jugadores con:
   - `en_venta=True`
   - `fecha_mercado` > 24 horas atrás
   - Sin pujas activas
2. Para cada jugador:
   - Genera 2 ofertas del sistema (±5% del precio)
   - Marca ofertas con `es_del_sistema=True`
   - Asigna a equipos aleatorios con presupuesto suficiente
   - Crea notificaciones

**Idempotente:** No - genera nuevas ofertas cada vez. Recomendado ejecutar solo una vez por jugador.

---

### `repartir_dinero_jornada`

**Propósito:** Distribuir €100,000 por punto a equipos con alineación completa.

```bash
python manage.py repartir_dinero_jornada
```

**Cuándo ejecutar:**
- DESPUÉS de asignar todos los puntos de la jornada
- Idealmente tras finalizar partidos y calcular puntuaciones

**Qué hace:**
1. Busca jornadas con `alineaciones_congeladas=True`
2. Para cada `AlineacionCongelada`:
   - Suma puntos de todos los jugadores titulares congelados
   - Si `tiene_posiciones_completas=True`:
     - Calcula dinero = puntos × 100,000
     - Actualiza `presupuesto` del equipo
     - Guarda `puntos_obtenidos` y `dinero_ganado` en snapshot
   - Si `tiene_posiciones_completas=False`:
     - NO da dinero
     - Registra 0 puntos y 0 dinero

**Idempotente:** No - suma dinero cada vez. Ejecutar solo UNA VEZ por jornada.

---

## 🔍 Troubleshooting

### Error: "relation 'fantasy_alineacioncongelada' does not exist"

**Causa:** Migraciones no aplicadas.

**Solución:**
```bash
python manage.py makemigrations fantasy
python manage.py migrate
```

---

### Error: "column 'fecha_inicio' does not exist"

**Causa:** Migraciones parciales.

**Solución:**
```bash
# Verificar estado
python manage.py showmigrations fantasy

# Si hay [✗] sin aplicar:
python manage.py migrate fantasy
```

---

### Banner de límites no se actualiza tras hacer puja

**Causa:** Estado de React no se refresca.

**Solución:**
```
1. Verificar que MarketScreen.jsx importa BidLimitBanner
2. Verificar que después de crear puja se llama a refrescar()
3. Forzar refresh de página (F5) para verificar datos desde servidor
```

---

### Comando `congelar_alineaciones` no encuentra jornadas

**Causa:** Jornadas no tienen `fecha_inicio` establecida.

**Solución:**
```bash
python manage.py shell
```

```python
from fantasy.models import Jornada
from django.utils import timezone

jornada = Jornada.objects.get(numero=1)
jornada.fecha_inicio = timezone.now()
jornada.save()

print(f"✅ Fecha inicio establecida: {jornada.fecha_inicio}")
exit()
```

---

### Equipo recibe dinero con alineación incompleta

**Causa:** Snapshot marcado incorrectamente como completo.

**Verificación:**
```bash
python manage.py shell
```

```python
from fantasy.models import AlineacionCongelada

alineacion = AlineacionCongelada.objects.get(id=X)
print(f"Tiene posiciones completas: {alineacion.tiene_posiciones_completas}")
print(f"Posiciones faltantes: {alineacion.posiciones_faltantes}")
print(f"Jugadores titulares: {alineacion.jugadores_titulares.count()}")

for jugador in alineacion.jugadores_titulares.all():
    print(f"- {jugador.nombre} ({jugador.posicion})")
```

**Solución:**
```python
# Si está marcado incorrectamente, corregir:
alineacion.tiene_posiciones_completas = False
alineacion.posiciones_faltantes = ['DEF', 'DEL']  # Ejemplo
alineacion.save()
```

---

## ✅ Checklist Final de Verificación

Antes de dar por completada la implementación, verificar:

### Backend
- [ ] Todas las migraciones aplicadas sin errores
- [ ] AlineacionCongelada aparece en Django Admin
- [ ] Comando `congelar_alineaciones` se ejecuta sin errores
- [ ] Comando `finalizar_subastas` se ejecuta sin errores
- [ ] Comando `repartir_dinero_jornada` se ejecuta sin errores
- [ ] Validación de límites de pujas funciona (error al exceder)
- [ ] Validación de venta de titulares funciona (error desde Mi Equipo)
- [ ] Ofertas directas NO validan titular/banquillo
- [ ] Jugadores adquiridos van automáticamente al banquillo
- [ ] Ofertas del sistema tienen `equipo_ofertante=None` y `es_del_sistema=True`

### Frontend
- [ ] Banner de límites se muestra en Mercado
- [ ] Banner cambia color según porcentaje (verde/amarillo/rojo)
- [ ] Advertencia de alineación incompleta se muestra en Mi Equipo
- [ ] Advertencia desaparece al completar alineación
- [ ] Slots vacíos se muestran en campo cuando faltan jugadores
- [ ] No se puede vender titular desde Mi Equipo
- [ ] Se puede vender titular movido al banquillo
- [ ] Se puede hacer oferta directa por titular desde clasificación

### End-to-End
- [ ] Flujo completo de jornada (congelar → puntuar → repartir dinero)
- [ ] Equipo con alineación completa recibe dinero
- [ ] Equipo con alineación incompleta NO recibe dinero
- [ ] Sistema genera ofertas tras 24h sin pujas
- [ ] Límites de pujas/ofertas se respetan y actualizan dinámicamente

---

## 📚 Archivos Modificados/Creados

### Backend

**Modelos:**
- `backend/fantasy/models.py` - Añadido `AlineacionCongelada` + campos nuevos

**Views:**
- `backend/fantasy/views/equipo_views.py` - Validación venta titulares (línea 108-114)
- `backend/fantasy/views/pujas_views.py` - Validación límites (línea 28-51)
- `backend/fantasy/views/ofertas_views.py` - Límites + sistema + banquillo (líneas 102-119, 286-306)

**Comandos:**
- `backend/fantasy/management/commands/congelar_alineaciones.py` - NUEVO
- `backend/fantasy/management/commands/finalizar_subastas.py` - NUEVO
- `backend/fantasy/management/commands/repartir_dinero_jornada.py` - NUEVO

**Admin:**
- `backend/fantasy/admin.py` - Registro AlineacionCongelada (línea 53-63)

### Frontend

**Componentes nuevos:**
- `frontend/src/components/dashboard/components/EmptySlot.jsx` - NUEVO
- `frontend/src/components/dashboard/components/IncompleteLineupWarning.jsx` - NUEVO
- `frontend/src/components/market/components/BidLimitBanner.jsx` - NUEVO

**Componentes modificados:**
- `frontend/src/components/dashboard/DashboardScreen.jsx` - Integración IncompleteLineupWarning
- `frontend/src/components/dashboard/FieldView.jsx` - Función fillSlots() + EmptySlot
- `frontend/src/components/market/MarketScreen.jsx` - Integración BidLimitBanner

---

## 🎯 Próximos Pasos Recomendados

1. **Configurar Cron Jobs en Producción:**
   ```bash
   # Ejemplo con crontab
   # Congelar alineaciones cada día a las 00:00
   0 0 * * * cd /path/to/backend && source venv/bin/activate && python manage.py congelar_alineaciones

   # Finalizar subastas cada 6 horas
   0 */6 * * * cd /path/to/backend && source venv/bin/activate && python manage.py finalizar_subastas

   # Repartir dinero manualmente tras finalizar jornada (no automatizar)
   ```

2. **Testing Automatizado:**
   - Crear tests unitarios para cada comando
   - Crear tests de integración para flujos E2E
   - Verificar casos edge (equipos vacíos, jornadas sin equipos, etc.)

3. **Monitoreo:**
   - Logging de ejecuciones de comandos
   - Alertas si comando falla
   - Dashboard de snapshots de alineaciones

4. **Optimizaciones:**
   - Índices en `fecha_mercado` para query de subastas
   - Índices en `(equipo, jornada)` para AlineacionCongelada
   - Caché de cálculos de límites de pujas

---

**Fin de la Guía de Testing - Fases 1-9**

Para cualquier duda o problema, revisar la sección de Troubleshooting o ejecutar comandos de verificación en Django shell.
