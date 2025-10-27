#!/usr/bin/env bash
# build.sh - Script de construcción para Render

echo "=== Instalando dependencias ==="
pip install -r requirements.txt

echo "=== Aplicando migraciones ==="
python manage.py migrate

echo "=== Colectando archivos estáticos ==="
python manage.py collectstatic --noinput

echo "=== Build completado ==="