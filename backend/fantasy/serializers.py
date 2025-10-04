from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion

class JugadorSerializer(serializers.ModelSerializer):
    posicion_display = serializers.CharField(source='get_posicion_display', read_only=True)
    
    class Meta:
        model = Jugador
        fields = ['id', 'nombre', 'posicion', 'posicion_display', 'valor', 'puntos_totales']

class LigaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Liga
        fields = ['id', 'nombre', 'codigo', 'presupuesto_inicial', 'jornada_actual', 'creada_en']

class EquipoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    liga_nombre = serializers.CharField(source='liga.nombre', read_only=True)
    jugadores = JugadorSerializer(many=True, read_only=True)
    
    class Meta:
        model = Equipo
        fields = ['id', 'nombre', 'usuario', 'usuario_username', 'liga', 'liga_nombre', 
                  'presupuesto', 'jugadores']

class JornadaSerializer(serializers.ModelSerializer):
    liga_nombre = serializers.CharField(source='liga.nombre', read_only=True)
    
    class Meta:
        model = Jornada
        fields = ['id', 'liga', 'liga_nombre', 'numero', 'fecha']

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