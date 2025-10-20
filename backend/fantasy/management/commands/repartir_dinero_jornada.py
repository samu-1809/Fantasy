# fantasy/management/commands/repartir_dinero_jornada.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from fantasy.models import Jornada, AlineacionCongelada, Puntuacion, Notificacion

class Command(BaseCommand):
    help = 'Reparte dinero a los equipos al finalizar una jornada'

    def add_arguments(self, parser):
        parser.add_argument('jornada_id', type=int, help='ID de la jornada a finalizar')

    @transaction.atomic()
    def handle(self, *args, **options):
        jornada_id = options['jornada_id']

        try:
            jornada = Jornada.objects.get(id=jornada_id)
        except Jornada.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Jornada {jornada_id} no encontrada'))
            return

        if not jornada.alineaciones_congeladas:
            self.stdout.write(
                self.style.ERROR(
                    f'❌ La jornada {jornada.numero} no tiene alineaciones congeladas. '
                    f'Ejecuta primero: python manage.py congelar_alineaciones'
                )
            )
            return

        self.stdout.write(f'\n💰 Repartiendo dinero para Jornada {jornada.numero}...\n')

        alineaciones = AlineacionCongelada.objects.filter(
            jornada=jornada
        ).select_related('equipo').prefetch_related('jugadores_titulares')

        total_equipos = alineaciones.count()
        equipos_con_dinero = 0
        equipos_sin_dinero = 0

        for alineacion in alineaciones:
            if alineacion.tiene_posiciones_completas:
                # Calcular puntos totales de los jugadores titulares en esta jornada
                puntos_totales = 0

                for jugador in alineacion.jugadores_titulares.all():
                    try:
                        puntuacion = Puntuacion.objects.get(
                            jugador=jugador,
                            jornada=jornada
                        )
                        puntos_totales += puntuacion.puntos
                    except Puntuacion.DoesNotExist:
                        # El jugador no tiene puntuación en esta jornada (0 puntos)
                        pass

                # Calcular dinero (100.000€ por punto)
                dinero_ganado = puntos_totales * 100000

                # Actualizar equipo
                equipo = alineacion.equipo
                equipo.presupuesto += dinero_ganado
                equipo.save()

                # Actualizar alineación congelada
                alineacion.puntos_obtenidos = puntos_totales
                alineacion.dinero_ganado = dinero_ganado
                alineacion.save()

                # Notificar
                Notificacion.objects.create(
                    destinatario=equipo.usuario,
                    tipo='privada',
                    categoria='dinero_jornada',
                    titulo='💰 Dinero ganado',
                    mensaje=f'Has ganado €{dinero_ganado:,} en la Jornada {jornada.numero} '
                           f'({puntos_totales} puntos × €100.000)',
                    leida=False
                )

                equipos_con_dinero += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✅ {equipo.nombre}: {puntos_totales}pts → €{dinero_ganado:,}'
                    )
                )
            else:
                # No reparte dinero por alineación incompleta
                Notificacion.objects.create(
                    destinatario=alineacion.equipo.usuario,
                    tipo='privada',
                    categoria='sin_dinero_jornada',
                    titulo='⚠️ Sin dinero en esta jornada',
                    mensaje=f'No ganaste dinero en la Jornada {jornada.numero} porque tu alineación estaba incompleta. '
                           f'Te faltaban: {", ".join(alineacion.posiciones_faltantes)}',
                    leida=False
                )

                equipos_sin_dinero += 1

                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠️ {alineacion.equipo.nombre}: Alineación incompleta, sin dinero'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Dinero repartido para Jornada {jornada.numero}:\n'
                f'   - {equipos_con_dinero} equipos recibieron dinero\n'
                f'   - {equipos_sin_dinero} equipos sin dinero (alineación incompleta)\n'
                f'   - Total: {total_equipos} equipos'
            )
        )
