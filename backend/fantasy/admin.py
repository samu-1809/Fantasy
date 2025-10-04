from django.contrib import admin
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion

@admin.register(Liga)
class LigaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo', 'presupuesto_inicial', 'jornada_actual', 'creada_en')
    search_fields = ('nombre', 'codigo')

@admin.register(Jugador)
class JugadorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'posicion', 'valor', 'puntos_totales')
    list_filter = ('posicion',)
    search_fields = ('nombre',)

@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario', 'liga', 'presupuesto')
    list_filter = ('liga',)
    search_fields = ('nombre', 'usuario__username')
    filter_horizontal = ('jugadores',)

@admin.register(Jornada)
class JornadaAdmin(admin.ModelAdmin):
    list_display = ('numero', 'liga', 'fecha')
    list_filter = ('liga',)

@admin.register(Puntuacion)
class PuntuacionAdmin(admin.ModelAdmin):
    list_display = ('jugador', 'jornada', 'puntos')
    list_filter = ('jornada__liga',)
    search_fields = ('jugador__nombre',)