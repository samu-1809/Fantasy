# Generated manually - Add database indexes for performance

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fantasy', '0001_initial'),
    ]

    operations = [
        # Liga indexes
        migrations.AlterField(
            model_name='liga',
            name='codigo',
            field=models.CharField(db_index=True, max_length=20, unique=True),
        ),
        migrations.AddIndex(
            model_name='liga',
            index=models.Index(fields=['-creada_en'], name='fantasy_lig_creada__idx'),
        ),

        # Jugador indexes
        migrations.AlterField(
            model_name='jugador',
            name='nombre',
            field=models.CharField(db_index=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='jugador',
            name='posicion',
            field=models.CharField(
                choices=[
                    ('POR', 'Portero'),
                    ('DEF', 'Defensa'),
                    ('MED', 'Centrocampista'),
                    ('DEL', 'Delantero')
                ],
                max_length=3
            ),
        ),
        migrations.AlterField(
            model_name='jugador',
            name='puntos_totales',
            field=models.IntegerField(db_index=True, default=0),
        ),
        migrations.AddIndex(
            model_name='jugador',
            index=models.Index(fields=['posicion', '-puntos_totales'], name='fantasy_jug_posicio_idx'),
        ),
        migrations.AddIndex(
            model_name='jugador',
            index=models.Index(fields=['valor'], name='fantasy_jug_valor_idx'),
        ),

        # Equipo indexes
        migrations.AddIndex(
            model_name='equipo',
            index=models.Index(fields=['liga', 'usuario'], name='fantasy_equ_liga_us_idx'),
        ),
        migrations.AddIndex(
            model_name='equipo',
            index=models.Index(fields=['liga', '-presupuesto'], name='fantasy_equ_liga_pr_idx'),
        ),

        # Jornada indexes
        migrations.AddIndex(
            model_name='jornada',
            index=models.Index(fields=['liga', '-numero'], name='fantasy_jor_liga_nu_idx'),
        ),
        migrations.AddIndex(
            model_name='jornada',
            index=models.Index(fields=['-fecha'], name='fantasy_jor_fecha_idx'),
        ),
    ]
