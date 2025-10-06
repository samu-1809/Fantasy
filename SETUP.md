# 🚀 Guía de Setup - Fantasy Football

## Requisitos Previos

- Python 3.11+
- Node.js 18+
- Docker y Docker Compose (para PostgreSQL)
- Git

---

## 📦 Instalación Paso a Paso

### 1. Clonar el Repositorio
```bash
git clone <tu-repo>
cd Fantasy
```

### 2. Configurar Base de Datos (PostgreSQL)

**Opción A: Con Docker (RECOMENDADO)**
```bash
# Iniciar PostgreSQL
docker-compose up -d

# Verificar que está corriendo
docker ps
```

**Opción B: PostgreSQL local**
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Crear base de datos manualmente
psql -U postgres
CREATE DATABASE fantasy_db;
CREATE USER fantasy_user WITH PASSWORD 'fantasy_dev_password';
GRANT ALL PRIVILEGES ON DATABASE fantasy_db TO fantasy_user;
\q
```

### 3. Backend Setup

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv

# Activar (Linux/Mac)
source venv/bin/activate
# Activar (Windows)
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de variables de entorno
cp .env.example .env
# EDITA .env si necesitas cambiar contraseñas/puertos

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (para Django Admin)
python manage.py createsuperuser

# Poblar datos de prueba
python manage.py poblar_datos

# Iniciar servidor
python manage.py runserver
```

### 4. Frontend Setup

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---

## 🧪 Verificar que Todo Funciona

1. **Backend**: http://127.0.0.1:8000/api/
2. **Frontend**: http://localhost:5173/
3. **Admin Django**: http://127.0.0.1:8000/admin/

---

## 🔧 Comandos Útiles

### Backend
```bash
# Crear nuevas migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Resetear base de datos (¡CUIDADO!)
python manage.py flush

# Shell interactivo
python manage.py shell
```

### Frontend
```bash
# Instalar nueva dependencia
npm install <paquete>

# Build para producción
npm run build

# Preview del build
npm run preview
```

### Docker
```bash
# Iniciar PostgreSQL
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar PostgreSQL
docker-compose down

# Parar y eliminar volúmenes (resetea DB)
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Error: "role 'fantasy_user' does not exist"
```bash
# Reinicia el contenedor de Docker
docker-compose down
docker-compose up -d
```

### Error: "Module not found: decouple"
```bash
pip install python-decouple
```

### Error: "psycopg2-binary" no se instala
```bash
# macOS: Instala dependencias
brew install postgresql

# Ubuntu: Instala dependencias
sudo apt-get install python3-dev libpq-dev
```

### Frontend no conecta con Backend
- Verifica que el backend esté corriendo en `http://127.0.0.1:8000`
- Verifica CORS en `backend/settings.py`

---

## 📝 Notas de Desarrollo

- **Nunca** commitees el archivo `.env` (ya está en `.gitignore`)
- Usa `.env.example` como referencia para variables de entorno
- Activa el entorno virtual antes de trabajar: `source venv/bin/activate`
- Si cambias modelos, siempre ejecuta: `makemigrations` → `migrate`

---

## 🚢 Próximos Pasos

1. ✅ Setup completado
2. 🔐 Implementar autenticación JWT en frontend
3. 🎯 Sistema de subastas
4. 📊 Asignación automática de 7 jugadores iniciales
5. ✅ Validaciones de plantilla

Ver **ROADMAP.md** para más detalles.
