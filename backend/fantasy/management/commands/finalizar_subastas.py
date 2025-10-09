"""
Comando Django para finalizar subastas expiradas (tras 24 horas)

Uso:
    python manage.py finalizar_subastas

Para automatizar (Linux/Mac con cron):
    # Ejecutar cada hora
    0 * * * * cd /ruta/proyecto/backend && python manage.py finalizar_subastas

Para automatizar (Windows Task Scheduler):
    - Crear tarea programada que ejecute cada hora
    - Acción: python.exe
    - Argumentos: manage.py finalizar_subastas
    - Directorio: C:\\ruta\\proyecto\\backend

Para automatizar con Celery (avanzado):
    - Configurar Celery Beat
    - Añadir tarea periódica cada hora
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from fantasy.models import Jugador, Puja
from django.db import transaction


class Command(BaseCommand):
    help = 'Finaliza las subastas de jugadores que han expirado (más de 24 horas)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la ejecución sin hacer cambios reales',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Muestra información detallada',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']

        if dry_run:
            self.stdout.write(self.style.WARNING('🔸 MODO SIMULACIÓN - No se harán cambios'))

        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)

        # Buscar jugadores en mercado que han expirado
        jugadores_expirados = Jugador.objects.filter(
            en_mercado=True,
            fecha_mercado__lt=limite_expiracion,
            equipo__isnull=True  # Solo jugadores libres (sin dueño)
        )

        count = jugadores_expirados.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ No hay subastas para finalizar'))
            return

        self.stdout.write(f'📊 Encontradas {count} subasta(s) expirada(s)\n')

        finalizadas = 0
        sin_pujas = 0
        errores = 0

        for jugador in jugadores_expirados:
            try:
                if verbose:
                    self.stdout.write(f'\n🎯 Procesando: {jugador.nombre} ({jugador.posicion})')
                    self.stdout.write(f'   Fecha mercado: {jugador.fecha_mercado}')
                    self.stdout.write(f'   Puja actual: €{jugador.puja_actual or 0:,}')

                # Verificar si tiene pujas
                if jugador.puja_actual and jugador.puja_actual > 0:
                    # Obtener puja ganadora
                    puja_ganadora = jugador.pujas.filter(monto=jugador.puja_actual).first()

                    if puja_ganadora:
                        if verbose:
                            self.stdout.write(f'   🏆 Ganador: {puja_ganadora.equipo.nombre}')

                        if not dry_run:
                            # Finalizar subasta (método ya implementado en el modelo)
                            with transaction.atomic():
                                success = jugador.finalizar_subasta()

                                if success:
                                    self.stdout.write(self.style.SUCCESS(
                                        f'   ✅ {jugador.nombre} → {puja_ganadora.equipo.nombre} '
                                        f'por €{jugador.puja_actual:,}'
                                    ))
                                    finalizadas += 1
                                else:
                                    self.stdout.write(self.style.ERROR(
                                        f'   ❌ Error finalizando subasta de {jugador.nombre}'
                                    ))
                                    errores += 1
                        else:
                            self.stdout.write(
                                f'   [SIMULACIÓN] Se transferiría a {puja_ganadora.equipo.nombre}'
                            )
                            finalizadas += 1
                    else:
                        if verbose:
                            self.stdout.write(self.style.WARNING(
                                f'   ⚠️ No se encontró puja ganadora para {jugador.nombre}'
                            ))
                        errores += 1
                else:
                    # Sin pujas: simplemente quitar del mercado
                    if verbose:
                        self.stdout.write(f'   ℹ️ Sin pujas, quitando del mercado')

                    if not dry_run:
                        jugador.en_mercado = False
                        jugador.fecha_mercado = None
                        jugador.save()

                    sin_pujas += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'   ❌ Error procesando {jugador.nombre}: {str(e)}'
                ))
                errores += 1

        # Resumen final
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'✅ Subastas finalizadas: {finalizadas}'))
        self.stdout.write(self.style.WARNING(f'ℹ️  Sin pujas (removidas): {sin_pujas}'))
        if errores > 0:
            self.stdout.write(self.style.ERROR(f'❌ Errores: {errores}'))
        self.stdout.write('=' * 60)

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '\n🔸 Modo simulación: No se guardaron cambios. '
                'Ejecuta sin --dry-run para aplicar los cambios.'
            ))
