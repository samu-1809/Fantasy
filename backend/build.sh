#!/usr/bin/env bash
# build.sh - Script de construcción para Render

echo "=== Instalando dependencias Python ==="
pip install -r requirements.txt

echo "=== Aplicando migraciones de base de datos ==="
python manage.py migrate

echo "=== Creando superusuario si no existe ==="
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin1', 'admin@example.com', 'admin1')
    print('Superusuario creado: admin1 / admin1')
else:
    print('El superusuario ya existe')
"

echo "=== Colectando archivos estáticos ==="
python manage.py collectstatic --noinput --clear

echo "✅ Build completado exitosamente ==="