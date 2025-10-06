# ⚡ QUICKSTART - Pasos Inmediatos

**Última actualización:** 2025-10-06
**Tiempo estimado:** 30-45 minutos

---

## 🚀 Setup Inicial (Primera Vez)

### 1. Instalar Dependencias del Backend
```bash
cd backend
pip install -r requirements.txt
```

### 2. Iniciar PostgreSQL
```bash
# Desde la raíz del proyecto
docker-compose up -d

# Verificar que esté corriendo
docker ps
```

### 3. Configurar Base de Datos
```bash
cd backend

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (para Django Admin)
python manage.py createsuperuser

# Poblar datos de prueba
python manage.py poblar_datos
```

### 4. Iniciar Backend
```bash
# Desde backend/
python manage.py runserver
```

### 5. Instalar Dependencias del Frontend
```bash
# Nueva terminal
cd frontend
npm install
```

### 6. Iniciar Frontend
```bash
# Desde frontend/
npm run dev
```

---

## ✅ Verificar que Todo Funciona

1. **Backend API**: http://127.0.0.1:8000/api/
2. **Django Admin**: http://127.0.0.1:8000/admin/
3. **Frontend**: http://localhost:5173/

---

## 🧪 Probar las Nuevas Funcionalidades

### Test 1: Registro con Auto-Asignación
1. Ve al frontend (http://localhost:5173/)
2. Usa el componente Register (integrar en tu App.jsx)
3. Regístrate con un nuevo usuario
4. Verifica en el backend que el equipo tiene 7 jugadores:
   ```bash
   python manage.py shell
   >>> from fantasy.models import Equipo
   >>> equipo = Equipo.objects.last()
   >>> equipo.jugadores.count()  # Debería ser 7
   >>> list(equipo.jugadores.values('nombre', 'posicion'))
   ```

### Test 2: Validaciones de Venta
1. Intenta vender tu único portero
2. Deberías recibir error: "No puedes vender este POR. Mínimo requerido: 1"
3. Lo mismo con defensas si solo tienes 2

### Test 3: Autenticación JWT
1. Inicia sesión desde el frontend
2. Abre DevTools (F12) → Application → Local Storage
3. Deberías ver `accessToken` y `refreshToken`
4. Todas las peticiones ahora incluyen el header `Authorization: Bearer <token>`

---

## 🔧 Comandos Útiles Diarios

### Backend
```bash
# Activar entorno virtual
cd backend
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Iniciar servidor
python manage.py runserver

# Ver logs de PostgreSQL
docker-compose logs -f

# Resetear BD (¡CUIDADO!)
python manage.py flush
python manage.py poblar_datos
```

### Frontend
```bash
cd frontend
npm run dev        # Desarrollo
npm run build      # Producción
npm run preview    # Preview del build
```

### Docker
```bash
docker-compose up -d      # Iniciar PostgreSQL
docker-compose down       # Parar PostgreSQL
docker-compose down -v    # Parar + eliminar volúmenes (resetea DB)
```

---

## 🐛 Troubleshooting Rápido

### Error: "ModuleNotFoundError: No module named 'decouple'"
```bash
pip install python-decouple
```

### Error: PostgreSQL no conecta
```bash
# Reiniciar contenedor
docker-compose down
docker-compose up -d

# Ver logs
docker-compose logs
```

### Error: "CORS policy" en el navegador
- Verifica que el backend esté en `http://127.0.0.1:8000`
- Revisa `CORS_ALLOWED_ORIGINS` en `backend/settings.py`

### Frontend no carga componentes de Auth
Asegúrate de que `main.jsx` tenga:
```jsx
import { AuthProvider } from './context/AuthContext'

<AuthProvider>
  <App />
</AuthProvider>
```

---

## 📂 Estructura de Archivos Clave

```
Fantasy/
├── backend/
│   ├── backend/
│   │   └── settings.py          ← PostgreSQL config
│   ├── fantasy/
│   │   ├── views.py             ← Auth, asignación, validaciones
│   │   └── models.py            ← Modelos de datos
│   ├── requirements.txt         ← Dependencias Python
│   └── .env.example             ← Template de variables
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx  ← Estado de autenticación
│   │   ├── components/
│   │   │   ├── Login.jsx        ← Componente login
│   │   │   └── Register.jsx     ← Componente registro
│   │   ├── services/
│   │   │   └── api.js           ← Llamadas API con JWT
│   │   └── main.jsx             ← Entry point (con AuthProvider)
│   └── package.json
│
├── docker-compose.yml           ← PostgreSQL containerizado
├── .gitignore                   ← Archivos ignorados en git
├── SETUP.md                     ← Guía detallada
├── PROGRESO.md                  ← Cambios implementados
└── QUICKSTART.md                ← Este archivo
```

---

## 🎯 Próximos Pasos

1. **HOY**:
   - Ejecutar el setup completo
   - Probar registro y auto-asignación
   - Familiarizarte con la nueva estructura

2. **Esta Semana**:
   - Integrar Login/Register en tu UI actual
   - Agregar rutas protegidas
   - Mejorar manejo de errores

3. **Próxima Semana**:
   - Empezar sistema de subastas (Fase 2)
   - Ver `PROGRESO.md` para roadmap completo

---

## 📞 Ayuda

- **Docs completas**: Ver `SETUP.md`
- **Cambios aplicados**: Ver `PROGRESO.md`
- **Análisis original**: Ver el mensaje con el análisis completo

---

**¡Todo listo! Ahora ejecuta el setup y empieza a probar las nuevas funcionalidades.** 🎉
