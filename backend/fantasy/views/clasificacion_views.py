from rest_framework import viewsets, status
from rest_framework.response import Response
from ..models import Liga, Equipo
from ..serializers import EquipoSerializer

class ClasificacionViewSet(viewsets.ViewSet):
    def list(self, request):
        liga_id = request.query_params.get('liga_id')

        if not liga_id:
            return Response(
                {'error': 'Se requiere liga_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            liga = Liga.objects.get(id=liga_id)
        except Liga.DoesNotExist:
            return Response(
                {'error': 'Liga no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        equipos = Equipo.objects.filter(
            liga=liga
        ).select_related('usuario').prefetch_related('jugadores')

        clasificacion = []
        for equipo in equipos:
            puntos_totales = sum(j.puntos_totales for j in equipo.jugadores.all())
            clasificacion.append({
                'equipo_id': equipo.id,
                'nombre': equipo.nombre,
                'usuario': equipo.usuario.username,
                'puntos_totales': puntos_totales,
                'presupuesto': equipo.presupuesto
            })

        clasificacion.sort(key=lambda x: x['puntos_totales'], reverse=True)

        for idx, item in enumerate(clasificacion, 1):
            item['posicion'] = idx

        return Response(clasificacion)