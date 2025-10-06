from django.db import models
from django.contrib.auth.models import User

class Liga(models.Model):
    nombre = models.CharField(max_length=100)
    codigo = models.CharField(max_length=20, unique=True, db_index=True)
    presupuesto_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=50000000)
    jornada_actual = models.IntegerField(default=1)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['-creada_en']),
        ]

    def __str__(self):
        return self.nombre

class Jugador(models.Model):
    PORTERO = 'POR'
    DEFENSA = 'DEF'
    CENTROCAMPISTA = 'MED'
    DELANTERO = 'DEL'

    POSICIONES = [
        (PORTERO, 'Portero'),
        (DEFENSA, 'Defensa'),
        (CENTROCAMPISTA, 'Centrocampista'),
        (DELANTERO, 'Delantero'),
    ]

    nombre = models.CharField(max_length=100, db_index=True)
    posicion = models.CharField(max_length=3, choices=POSICIONES)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    puntos_totales = models.IntegerField(default=0, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['posicion', '-puntos_totales']),
            models.Index(fields=['valor']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.posicion})"

class Equipo(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    liga = models.ForeignKey(Liga, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    presupuesto = models.DecimalField(max_digits=10, decimal_places=2)
    jugadores = models.ManyToManyField(Jugador, blank=True)

    class Meta:
        unique_together = ('usuario', 'liga')
        indexes = [
            models.Index(fields=['liga', 'usuario']),
            models.Index(fields=['liga', '-presupuesto']),
        ]

    def __str__(self):
        return f"{self.nombre} - {self.usuario.username}"

class Jornada(models.Model):
    liga = models.ForeignKey(Liga, on_delete=models.CASCADE)
    numero = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('liga', 'numero')
        indexes = [
            models.Index(fields=['liga', '-numero']),
            models.Index(fields=['-fecha']),
        ]

    def __str__(self):
        return f"Jornada {self.numero} - {self.liga.nombre}"

class Puntuacion(models.Model):
    jugador = models.ForeignKey(Jugador, on_delete=models.CASCADE)
    jornada = models.ForeignKey(Jornada, on_delete=models.CASCADE)
    puntos = models.IntegerField()
    
    class Meta:
        unique_together = ('jugador', 'jornada')
    
    def __str__(self):
        return f"{self.jugador.nombre} - J{self.jornada.numero}: {self.puntos} pts"