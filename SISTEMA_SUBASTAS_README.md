# 🎯 Sistema de Mercado con Subastas y Ofertas - Guía de Implementación

## 📋 Resumen

Se ha implementado un sistema completo de mercado que distingue entre:
- **PUJAS** (subastas automáticas para jugadores libres que expiran en 24h)
- **OFERTAS** (propuestas entre usuarios que el dueño acepta/rechaza)

---

## ✅ ARCHIVOS MODIFICADOS/CREADOS

### Backend
1. **`backend/fantasy/models.py`** - Añadidos modelos `Oferta` y `Puja` + campos y métodos
2. **`backend/fantasy/serializers.py`** - Añadidos 3 serializers nuevos
3. **`backend/fantasy/views.py`** - Añadidos 7 endpoints + 2 ViewSets
4. **`backend/fantasy/urls.py`** - Añadidas 8 rutas nuevas
5. **`backend/fantasy/management/commands/finalizar_subastas.py`** - Comando automático

### Frontend
6. **`frontend/src/services/api.js`** - Añadidas 6 funciones nuevas

---

## 🚀 PASOS PARA PROBAR (Samuel)

### 1. Aplicar Migraciones

```bash
cd backend
python manage.py makemigrations fantasy
python manage.py migrate
```

**Nota:** Si aparece "No changes detected", ejecuta:
```bash
python manage.py makemigrations fantasy -n add_subastas_y_ofertas --empty
```
Y luego edita el archivo de migración para añadir manualmente los modelos.

### 2. Iniciar Servidor Backend

```bash
# Asegúrate de que PostgreSQL esté corriendo
docker-compose up -d

# Inicia el servidor Django
python manage.py runserver
```

### 3. Poblar datos de prueba

```bash
python manage.py poblar_datos
```

### 4. Crear jugadores en el mercado (subastas)

Desde el shell de Django:
```bash
python manage.py shell
```

```python
from fantasy.models import Jugador
from django.utils import timezone

# Poner 5 jugadores libres en el mercado
jugadores_libres = Jugador.objects.filter(equipo__isnull=True)[:5]
for j in jugadores_libres:
    j.en_mercado = True
    j.fecha_mercado = timezone.now()
    j.save()
    print(f"✅ {j.nombre} añadido al mercado")
```

### 5. Crear un segundo usuario para probar ofertas

Desde el navegador o Postman:
```http
POST http://127.0.0.1:8000/api/auth/register/
Content-Type: application/json

{
  "username": "usuario2",
  "email": "usuario2@test.com",
  "password": "test1234",
  "password2": "test1234"
}
```

---

## 🧪 CASOS DE PRUEBA

### Caso 1: Pujar por jugador libre (Subasta)

**1.1 Crear primera puja:**
```http
POST http://127.0.0.1:8000/api/equipos/1/pujar_jugador/
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "jugador_id": 15,
  "monto": 6000000
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "tipo": "puja",
  "mensaje": "Puja de €6,000,000 realizada por [Nombre Jugador]",
  "puja_actual": 6000000
}
```

**1.2 Crear segunda puja (debe ser mayor):**
```http
POST http://127.0.0.1:8000/api/equipos/2/pujar_jugador/
Authorization: Bearer <TOKEN_USER2>
Content-Type: application/json

{
  "jugador_id": 15,
  "monto": 7000000
}
```

**1.3 Simular expiración de subasta:**
```python
# En Django shell
from fantasy.models import Jugador
from datetime import timedelta
from django.utils import timezone

jugador = Jugador.objects.get(id=15)
jugador.fecha_mercado = timezone.now() - timedelta(hours=25)  # Hace 25 horas
jugador.save()
```

**1.4 Finalizar subasta manualmente:**
```bash
python manage.py finalizar_subastas --verbose
```

**Resultado esperado:**
- El jugador pasa al equipo con la puja más alta
- Se descuenta el dinero del presupuesto
- La puja se marca como `es_ganadora=True`

---

### Caso 2: Hacer oferta por jugador de otro usuario

**2.1 Poner un jugador en venta:**
```python
# Django shell
from fantasy.models import Jugador

jugador = Jugador.objects.filter(equipo__isnull=False).first()
jugador.en_venta = True
jugador.save()
print(f"✅ {jugador.nombre} puesto en venta por {jugador.equipo.nombre}")
```

**2.2 Hacer oferta desde otro equipo:**
```http
POST http://127.0.0.1:8000/api/equipos/2/pujar_jugador/
Authorization: Bearer <TOKEN_USER2>
Content-Type: application/json

{
  "jugador_id": 3,
  "monto": 8000000
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "tipo": "oferta",
  "mensaje": "Oferta de €8,000,000 enviada a [Nombre Equipo]",
  "oferta_id": 1
}
```

---

### Caso 3: Ver ofertas recibidas

```http
GET http://127.0.0.1:8000/api/equipos/1/ofertas_recibidas/
Authorization: Bearer <TOKEN>
```

**Resultado esperado:**
```json
[
  {
    "id": 1,
    "jugador": 3,
    "jugador_nombre": "Carlos López",
    "jugador_posicion": "DEF",
    "jugador_valor": 7500000,
    "equipo_ofertante": 2,
    "equipo_ofertante_nombre": "Equipo de usuario2",
    "monto": 8000000,
    "estado": "pendiente",
    "fecha_oferta": "2025-10-09T14:30:00Z"
  }
]
```

---

### Caso 4: Aceptar oferta

```http
POST http://127.0.0.1:8000/api/ofertas/1/aceptar/
Authorization: Bearer <TOKEN_VENDEDOR>
```

**Resultado esperado:**
```json
{
  "success": true,
  "mensaje": "Oferta aceptada. Carlos López transferido a Equipo de usuario2",
  "monto": 8000000,
  "jugador": "Carlos López",
  "nuevo_equipo": "Equipo de usuario2"
}
```

**Verificar:**
- El jugador ahora pertenece al equipo ofertante
- El dinero se transfirió (vendedor +€8M, comprador -€8M)
- Otras ofertas por ese jugador se marcaron como "expirada"

---

### Caso 5: Rechazar oferta

```http
POST http://127.0.0.1:8000/api/ofertas/2/rechazar/
Authorization: Bearer <TOKEN_VENDEDOR>
```

**Resultado esperado:**
```json
{
  "success": true,
  "mensaje": "Oferta rechazada"
}
```

---

### Caso 6: Retirar oferta (antes de que la acepten)

**Listar ofertas realizadas:**
```http
GET http://127.0.0.1:8000/api/equipos/2/ofertas_realizadas/
Authorization: Bearer <TOKEN_USER2>
```

**Retirar oferta pendiente:**
```http
POST http://127.0.0.1:8000/api/ofertas/3/retirar/
Authorization: Bearer <TOKEN_USER2>
```

**Resultado esperado:**
```json
{
  "success": true,
  "mensaje": "Oferta retirada exitosamente"
}
```

---

## 📊 ENDPOINTS DISPONIBLES

### Sistema de Subastas y Ofertas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/equipos/{id}/pujar_jugador/` | Pujar por jugador (distingue puja vs oferta automáticamente) |
| GET | `/api/equipos/{id}/ofertas_recibidas/` | Listar ofertas pendientes recibidas |
| GET | `/api/equipos/{id}/ofertas_realizadas/` | Listar todas mis ofertas (pendientes/aceptadas/rechazadas) |
| POST | `/api/ofertas/{id}/aceptar/` | Aceptar una oferta recibida |
| POST | `/api/ofertas/{id}/rechazar/` | Rechazar una oferta recibida |
| POST | `/api/ofertas/{id}/retirar/` | Retirar una oferta realizada (solo si pendiente) |

### ViewSets (CRUD completo)

| ViewSet | Base URL | Descripción |
|---------|----------|-------------|
| OfertaViewSet | `/api/ofertas/` | CRUD de ofertas (admin/historial) |
| PujaViewSet | `/api/pujas/` | CRUD de pujas (admin/historial) |

---

## 🛠️ COMANDO AUTOMÁTICO

### Finalizar Subastas Expiradas

**Uso manual:**
```bash
# Modo normal
python manage.py finalizar_subastas

# Modo verbose (muestra detalles)
python manage.py finalizar_subastas --verbose

# Modo simulación (no guarda cambios)
python manage.py finalizar_subastas --dry-run --verbose
```

**Automatizar (Linux/Mac con cron):**
```bash
crontab -e
```
Añadir:
```
0 * * * * cd /ruta/proyecto/backend && python manage.py finalizar_subastas
```

**Automatizar (Windows Task Scheduler):**
1. Abrir "Programador de tareas"
2. Crear tarea básica
3. Desencadenador: Cada hora
4. Acción: Iniciar programa
   - Programa: `C:\Python312\python.exe`
   - Argumentos: `manage.py finalizar_subastas`
   - Directorio: `C:\ruta\proyecto\backend`

---

## 🔍 VALIDACIONES IMPLEMENTADAS

### Al pujar/ofertar:
- ✅ Verificar que el equipo tiene presupuesto suficiente
- ✅ No puedes ofertar por tu propio jugador
- ✅ No puedes tener múltiples ofertas pendientes por el mismo jugador
- ✅ Para pujas: monto debe ser mayor que puja actual
- ✅ Para pujas: jugador debe estar en mercado y no expirado

### Al aceptar oferta:
- ✅ Solo el dueño puede aceptar
- ✅ Verificar que oferta esté pendiente
- ✅ Verificar que ofertante aún tenga presupuesto
- ✅ Transferencia atómica (jugador + dinero)
- ✅ Cancelar otras ofertas pendientes por ese jugador

### Al retirar oferta:
- ✅ Solo el ofertante puede retirar
- ✅ Solo ofertas pendientes pueden retirarse

---

## 🎨 DIFERENCIAS CLAVE

### Jugador Libre (Subasta):
```json
{
  "id": 15,
  "nombre": "Pedro Sánchez",
  "equipo": null,
  "en_mercado": true,
  "en_venta": false,
  "puja_actual": 6500000,
  "fecha_mercado": "2025-10-09T10:00:00Z"
}
```
→ **Acción:** PUJAR (compite con otros, gana el mejor postor tras 24h)

### Jugador de Usuario (En Venta):
```json
{
  "id": 3,
  "nombre": "Carlos López",
  "equipo": 1,
  "en_mercado": false,
  "en_venta": true,
  "precio_venta": null
}
```
→ **Acción:** HACER OFERTA (propuesta al dueño, él decide)

---

## ❗ ERRORES COMUNES Y SOLUCIONES

### Error: "No changes detected" al hacer migraciones
**Solución:**
```bash
python manage.py makemigrations fantasy -n add_subastas_y_ofertas
```
Si persiste, verificar que los modelos Oferta y Puja estén en `models.py`.

### Error: "Module 'fantasy.models' has no attribute 'Oferta'"
**Solución:** Verificar imports en `views.py` y `serializers.py`:
```python
from .models import Oferta, Puja
```

### Error: "Jugador no está en el mercado"
**Solución:** Asegurarse de que el jugador tenga:
```python
jugador.en_mercado = True
jugador.fecha_mercado = timezone.now()
```

### Error: "Presupuesto insuficiente"
**Solución:** Verificar presupuesto del equipo:
```python
from fantasy.models import Equipo
equipo = Equipo.objects.get(id=1)
print(f"Presupuesto: €{equipo.presupuesto:,}")
```

---

## 📝 NOTAS IMPORTANTES

1. **Transacciones Atómicas:** Todas las operaciones críticas usan `transaction.atomic()` para garantizar consistencia.

2. **Timezone Aware:** Siempre usar `timezone.now()` de Django, nunca `datetime.now()`.

3. **Validaciones de Seguridad:** Todos los endpoints verifican permisos (que el equipo pertenezca al usuario autenticado).

4. **Estado de Ofertas:**
   - `pendiente`: Esperando respuesta
   - `aceptada`: Jugador transferido
   - `rechazada`: Dueño rechazó
   - `retirada`: Ofertante retiró
   - `expirada`: Otra oferta fue aceptada

5. **Puja Ganadora:** Solo una puja puede ser `es_ganadora=True` por jugador.

---

## 🎯 PRÓXIMOS PASOS (Opcional)

### Frontend UI:
- [ ] Pantalla "Mercado" con pestañas "Libres" y "En Venta"
- [ ] Modal para pujar/ofertar con input de monto
- [ ] Pantalla "Ofertas Recibidas" con botones Aceptar/Rechazar
- [ ] Pantalla "Ofertas Realizadas" con botón Retirar y badges de estado
- [ ] Countdown timer para subastas (tiempo restante)

### Mejoras Backend:
- [ ] Notificaciones por email cuando reciben oferta
- [ ] Historial de transacciones
- [ ] Estadísticas de mercado (jugador más caro, etc.)
- [ ] Sistema de reputación de usuarios

---

## 🆘 SOPORTE

Si encuentras problemas:
1. Revisa los logs del backend: `python manage.py runserver` (modo debug)
2. Verifica que PostgreSQL esté corriendo: `docker ps`
3. Comprueba las migraciones aplicadas: `python manage.py showmigrations fantasy`
4. Usa el shell de Django para debug: `python manage.py shell`

---

**✅ ¡Sistema listo para probar! Cualquier duda, contacta a Andrés.**
