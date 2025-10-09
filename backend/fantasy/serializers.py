from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion, Oferta, Puja

class FicharJugadorSerializer(serializers.Serializer):
    jugador_id = serializers.IntegerField()
    en_banquillo = serializers.BooleanField(required=False, allow_null=True)

class LigaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Liga
        fields = ['id', 'nombre', 'codigo', 'jornada_actual']

class JugadorSerializer(serializers.ModelSerializer):
    posicion_display = serializers.CharField(source='get_posicion_display', read_only=True)
    equipo_real_nombre = serializers.CharField(source='equipo_real.nombre', read_only=True)
    
    class Meta:
        model = Jugador
        fields = [
            'id', 'nombre', 'posicion', 'posicion_display', 
            'valor', 'puntos_totales', 'equipo_real', 'equipo_real_nombre',
            'equipo', 'en_banquillo', 'en_venta', 'fecha_mercado', 
        ]


class EquipoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    liga_nombre = serializers.CharField(source='liga.nombre', read_only=True)
    jugadores = JugadorSerializer(many=True, read_only=True)
    jugadores_campo = serializers.SerializerMethodField()
    jugadores_banquillo = serializers.SerializerMethodField() 
    class Meta:
        model = Equipo
        fields = [
            'id', 'nombre', 'usuario', 'usuario_username', 'liga', 'liga_nombre', 
            'presupuesto', 'puntos_totales', 'jugadores',
            'jugadores_campo', 'jugadores_banquillo'
        ]
    
    def get_jugadores_campo(self, obj):
        """Jugadores en el campo (no en banquillo)"""
        jugadores_campo = obj.jugadores.filter(en_banquillo=False)
        return JugadorSerializer(jugadores_campo, many=True).data
    
    def get_jugadores_banquillo(self, obj):
        """Jugadores en el banquillo"""
        jugadores_banquillo = obj.jugadores.filter(en_banquillo=True)
        return JugadorSerializer(jugadores_banquillo, many=True).data

class PuntuacionSerializer(serializers.ModelSerializer):
    jugador_nombre = serializers.CharField(source='jugador.nombre', read_only=True)
    jornada_numero = serializers.IntegerField(source='jornada.numero', read_only=True)
    
    class Meta:
        model = Puntuacion
        fields = ['id', 'jugador', 'jugador_nombre', 'jornada', 'jornada_numero', 'puntos']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True}}

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class EquipoRealSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipoReal
        fields = ['id', 'nombre']

class JornadaSerializer(serializers.ModelSerializer):
    partidos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Jornada
        fields = ['id', 'numero', 'fecha', 'partidos_count']
    
    def get_partidos_count(self, obj):
        return obj.partidos.count()

class PartidoSerializer(serializers.ModelSerializer):
    equipo_local_nombre = serializers.CharField(source='equipo_local.nombre', read_only=True)
    equipo_visitante_nombre = serializers.CharField(source='equipo_visitante.nombre', read_only=True)
    
    class Meta:
        model = Partido
        fields = ['id', 'jornada', 'equipo_local', 'equipo_visitante', 'equipo_local_nombre', 'equipo_visitante_nombre', 'fecha', 'goles_local', 'goles_visitante', 'jugado']

class AlineacionSerializer(serializers.ModelSerializer):

    portero_titular_info = JugadorSerializer(source='portero_titular', read_only=True)
    defensa1_titular_info = JugadorSerializer(source='defensa1_titular', read_only=True)
    defensa2_titular_info = JugadorSerializer(source='defensa2_titular', read_only=True)
    delantero1_titular_info = JugadorSerializer(source='delantero1_titular', read_only=True)
    delantero2_titular_info = JugadorSerializer(source='delantero2_titular', read_only=True)
    banquillo_info = JugadorSerializer(source='banquillo', many=True, read_only=True)
    total_titulares = serializers.ReadOnlyField()
    
    class Meta:
        model = Alineacion
        fields = '__all__'

class FicharJugadorSerializer(serializers.Serializer):
    jugador_id = serializers.IntegerField()
    en_banquillo = serializers.BooleanField(required=False, allow_null=True)

class VenderJugadorSerializer(serializers.Serializer):
    jugador_id = serializers.IntegerField()

class OfertaSerializer(serializers.ModelSerializer):
    """Serializer para ofertas de compra"""
    jugador_nombre = serializers.CharField(source='jugador.nombre', read_only=True)
    jugador_posicion = serializers.CharField(source='jugador.posicion', read_only=True)
    jugador_valor = serializers.IntegerField(source='jugador.valor', read_only=True)
    equipo_ofertante_nombre = serializers.CharField(source='equipo_ofertante.nombre', read_only=True)
    equipo_receptor_nombre = serializers.CharField(source='equipo_receptor.nombre', read_only=True)

    class Meta:
        model = Oferta
        fields = [
            'id', 'jugador', 'jugador_nombre', 'jugador_posicion', 'jugador_valor',
            'equipo_ofertante', 'equipo_ofertante_nombre',
            'equipo_receptor', 'equipo_receptor_nombre',
            'monto', 'estado', 'fecha_oferta', 'fecha_respuesta'
        ]
        read_only_fields = ['fecha_oferta', 'fecha_respuesta', 'estado']

class PujaSerializer(serializers.ModelSerializer):
    """Serializer para pujas en subastas"""
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    jugador_nombre = serializers.CharField(source='jugador.nombre', read_only=True)

    class Meta:
        model = Puja
        fields = ['id', 'jugador', 'jugador_nombre', 'equipo', 'equipo_nombre', 'monto', 'fecha_puja', 'es_ganadora']
        read_only_fields = ['fecha_puja', 'es_ganadora']

class JugadorMercadoSerializer(serializers.ModelSerializer):
    """Serializer extendido para jugadores en el mercado"""
    equipo_real_nombre = serializers.CharField(source='equipo_real.nombre', read_only=True)
    equipo_dueno_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    expirado = serializers.SerializerMethodField()
    tiempo_restante = serializers.SerializerMethodField()

    class Meta:
        model = Jugador
        fields = [
            'id', 'nombre', 'posicion', 'equipo_real', 'equipo_real_nombre',
            'valor', 'puntos_totales', 'en_mercado', 'en_venta',
            'fecha_mercado', 'precio_venta', 'puja_actual',
            'equipo', 'equipo_dueno_nombre', 'expirado', 'tiempo_restante'
        ]

    def get_expirado(self, obj):
        return obj.expirado if hasattr(obj, 'expirado') else False

    def get_tiempo_restante(self, obj):
        """Calcula el tiempo restante en horas"""
        if obj.fecha_mercado:
            from django.utils import timezone
            from datetime import timedelta
            expiracion = obj.fecha_mercado + timedelta(hours=24)
            ahora = timezone.now()
            if ahora < expiracion:
                diff = expiracion - ahora
                return int(diff.total_seconds() / 3600)  # Retorna horas
        return 0