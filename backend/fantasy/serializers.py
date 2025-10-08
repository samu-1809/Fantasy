from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion

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
    jornada_numero = serializers.IntegerField(source='jornada.numero', read_only=True)

    class Meta:
        model = Partido
        fields = [
            'id', 'jornada', 'jornada_numero', 'equipo_local', 'equipo_visitante',
            'equipo_local_nombre', 'equipo_visitante_nombre', 'goles_local', 
            'goles_visitante', 'fecha', 'jugado'  # 🎯 Quitado 'estado'
        ]

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        
        if instance and not any(field in data for field in ['equipo_local', 'equipo_visitante']):
            return data

        equipo_local = data.get('equipo_local', instance.equipo_local if instance else None)
        equipo_visitante = data.get('equipo_visitante', instance.equipo_visitante if instance else None)

        if equipo_local and equipo_visitante and equipo_local == equipo_visitante:
            raise serializers.ValidationError("Un equipo no puede jugar contra sí mismo.")

        jornada = data.get('jornada', instance.jornada if instance else None)

        if not jornada:
            return data

        partidos_query = Partido.objects.filter(jornada=jornada)
        if instance:
            partidos_query = partidos_query.exclude(id=instance.id)

        if equipo_local and partidos_query.filter(equipo_local=equipo_local).exists():
            raise serializers.ValidationError(f"El equipo {equipo_local.nombre} ya tiene un partido como local en esta jornada.")

        if equipo_visitante and partidos_query.filter(equipo_visitante=equipo_visitante).exists():
            raise serializers.ValidationError(f"El equipo {equipo_visitante.nombre} ya tiene un partido como visitante en esta jornada.")

        if equipo_local and partidos_query.filter(equipo_visitante=equipo_local).exists():
            raise serializers.ValidationError(f"El equipo {equipo_local.nombre} ya tiene un partido como visitante en esta jornada.")

        if equipo_visitante and partidos_query.filter(equipo_local=equipo_visitante).exists():
            raise serializers.ValidationError(f"El equipo {equipo_visitante.nombre} ya tiene un partido como local en esta jornada.")

        return data

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