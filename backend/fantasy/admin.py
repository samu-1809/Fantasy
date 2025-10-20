from django.contrib import admin
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, AlineacionCongelada

@admin.register(Liga)
class LigaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo', 'jornada_actual')
    search_fields = ('nombre', 'codigo')

@admin.register(Jugador)
class JugadorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'posicion', 'valor', 'puntos_totales', 'equipo_real', 'en_venta')
    list_filter = ('posicion', 'equipo_real', 'en_venta')
    search_fields = ('nombre', 'equipo_real__nombre')

@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario', 'liga', 'presupuesto', 'puntos_totales','total_jugadores')
    list_filter = ('liga',)
    search_fields = ('nombre', 'usuario__username')
    def total_jugadores(self, obj):
        return obj.jugadores.count()
    total_jugadores.short_description = 'Jugadores'
    
@admin.register(Puntuacion)
class PuntuacionAdmin(admin.ModelAdmin):
    list_display = ('jugador', 'jornada', 'puntos')
    list_filter = ('jornada',)
    search_fields = ('jugador__nombre',)
    
@admin.register(EquipoReal)
class EquipoRealAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(Partido)
class PartidoAdmin(admin.ModelAdmin):
    list_display = ('jornada', 'equipo_local', 'equipo_visitante', 'fecha', 'goles_local', 'goles_visitante', 'jugado', 'resultado')
    list_filter = ('jornada', 'jugado') 
    search_fields = ('equipo_local__nombre', 'equipo_visitante__nombre')
    list_editable = ('goles_local', 'goles_visitante', 'jugado')
    ordering = ('-fecha',)

@admin.register(Jornada)
class JornadaAdmin(admin.ModelAdmin):
    list_display = ('numero', 'fecha', 'fecha_inicio', 'alineaciones_congeladas', 'total_partidos')
    search_fields = ('numero',)
    list_filter = ('alineaciones_congeladas',)

    def total_partidos(self, obj):
        return obj.partidos.count()
    total_partidos.short_description = 'Partidos'

@admin.register(AlineacionCongelada)
class AlineacionCongeladaAdmin(admin.ModelAdmin):
    list_display = ('equipo', 'jornada', 'fecha_congelacion', 'tiene_posiciones_completas', 'puntos_obtenidos', 'dinero_ganado', 'total_titulares')
    list_filter = ('jornada', 'tiene_posiciones_completas')
    search_fields = ('equipo__nombre', 'jornada__numero')
    readonly_fields = ('fecha_congelacion', 'puntos_obtenidos', 'dinero_ganado')
    filter_horizontal = ('jugadores_titulares',)

    def total_titulares(self, obj):
        return obj.jugadores_titulares.count()
    total_titulares.short_description = 'Titulares'