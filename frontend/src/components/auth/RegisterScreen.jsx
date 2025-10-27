import React, { useState } from 'react';
import { UserPlus, Loader, CheckCircle, Users, Trophy, DollarSign } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const RegisterScreen = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',    
    last_name: ''      
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamInfo, setTeamInfo] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error de validación cuando el usuario escribe
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Validación de username
    if (!formData.username.trim()) {
      errors.username = 'El usuario es obligatorio';
    } else if (formData.username.length < 3) {
      errors.username = 'El usuario debe tener al menos 3 caracteres';
    }

    // Validación de email
    if (!formData.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El formato del email no es válido';
    }

    // Validación de nombre
    if (!formData.first_name.trim()) {
      errors.first_name = 'El nombre es obligatorio';
    }

    // Validación de apellido
    if (!formData.last_name.trim()) {
      errors.last_name = 'El apellido es obligatorio';
    }

    // Validación de contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.password2) {
      errors.password2 = 'Confirma tu contraseña';
    } else if (formData.password !== formData.password2) {
      errors.password2 = 'Las contraseñas no coinciden';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTeamInfo(null);
      
      const requestData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name
      };

      console.log('📤 Datos enviados al registro:', requestData);

      const response = await fetch(`${API_URL}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Respuesta del servidor:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || JSON.stringify(errorData));
        } catch {
          throw new Error(errorText || 'Error en el registro');
        }
      }

      const data = await response.json();
      console.log('✅ Registro exitoso:', data);
      
      // Guardar información del equipo para mostrarla en el éxito
      if (data.equipo_creado) {
        setTeamInfo({
          nombre: data.equipo?.nombre,
          jugadores: data.jugadores_asignados,
          titulares: data.titulares,
          banquillo: data.banquillo,
          presupuesto: data.presupuesto_restante,
          costo: data.costo_equipo
        });
      }
      
      setFormData({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: ''
      });
      setError('');
      
      // Mostrar mensaje de éxito
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSwitchToLogin();
      }, 4000); // Un poco más de tiempo para leer la info del equipo
      
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full border-2 p-3 rounded bg-white focus:outline-none transition-colors";
    if (validationErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:border-red-500`;
    }
    return `${baseClass} border-gray-300 focus:border-blue-500`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Si se muestra éxito
  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 border border-gray-200 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Cuenta Creada!</h2>
          
          {teamInfo && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center justify-center gap-2">
                <Trophy size={20} />
                ¡Equipo Creado Automáticamente!
              </h3>
              
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nombre del equipo</p>
                    <p className="font-semibold text-gray-800">{teamInfo.nombre}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Jugadores asignados</p>
                    <p className="font-semibold text-gray-800">
                      {teamInfo.jugadores} jugadores ({teamInfo.titulares} titulares + {teamInfo.banquillo} banquillo)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Presupuesto restante</p>
                    <p className="font-semibold text-gray-800">
                      {formatCurrency(teamInfo.presupuesto)}
                    </p>
                  </div>
                </div>
                
                {teamInfo.costo && (
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Inversión inicial: {formatCurrency(teamInfo.costo)}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="text-gray-600 mb-6">
            Tu cuenta y equipo han sido creados exitosamente. 
            <br />
            <span className="text-sm text-gray-500">
              Redirigiendo al login...
            </span>
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-green-500 h-2 rounded-full animate-pulse"></div>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>🎯 <strong>Formación 1-2-2</strong> - 5 jugadores titulares</p>
            <p>🪑 <strong>2 suplentes</strong> - 1 defensa + 1 delantero en banquillo</p>
            <p>💰 <strong>Presupuesto inicial</strong> - {formatCurrency(150000000)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Crear Cuenta</h2>
          <p className="text-gray-600">Únete a Fantasy Fútbol Sala</p>
        </div>

        {/* Errores */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <div className="flex-1">
              <p className="font-medium">Error en el registro</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Campos en grid para nombre y apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={getInputClass('first_name')}
                placeholder="Tu nombre"
                disabled={loading}
              />
              {validationErrors.first_name && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.first_name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={getInputClass('last_name')}
                placeholder="Tu apellido"
                disabled={loading}
              />
              {validationErrors.last_name && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.last_name}</p>
              )}
            </div>
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={getInputClass('username')}
              placeholder="Elige un usuario"
              disabled={loading}
            />
            {validationErrors.username && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={getInputClass('email')}
              placeholder="tu@email.com"
              disabled={loading}
            />
            {validationErrors.email && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={getInputClass('password')}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
            />
            {validationErrors.password && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña *
            </label>
            <input
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              className={getInputClass('password2')}
              placeholder="Repite tu contraseña"
              disabled={loading}
            />
            {validationErrors.password2 && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password2}</p>
            )}
          </div>

          {/* Botón de Registro */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Creando cuenta y equipo...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Crear Cuenta
              </>
            )}
          </button>

          {/* Enlace a Login */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                disabled={loading}
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </form>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-green-600" />
            <p className="font-semibold text-green-800 text-sm">Ventajas al registrarte:</p>
          </div>
          <ul className="text-xs text-green-700 space-y-1">
            <li>✅ <strong>Equipo automático</strong> - 7 jugadores (5 titulares + 2 banquillo)</li>
            <li>✅ <strong>Presupuesto inicial</strong> - {formatCurrency(150000000)}</li>
            <li>✅ <strong>Formación 1-2-2</strong> - 1 Portero, 2 Defensas, 2 Delanteros titulares</li>
            <li>✅ <strong>Banquillo completo</strong> - 1 Defensa y 1 Delantero suplentes</li>
            <li>✅ <strong>Listo para jugar</strong> - Empieza a competir inmediatamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;