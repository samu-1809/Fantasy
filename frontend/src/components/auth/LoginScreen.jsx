import React, { useState } from 'react';
import { LogIn, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = ({ onSwitchToRegister, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const { login, loading, error } = useAuth();

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
    
    if (!formData.username.trim()) {
      errors.username = 'El usuario es obligatorio';
    }
    
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('🔐 Intentando login...');
      await login(formData.username, formData.password);
      console.log('✅ Login exitoso en AuthContext');
      onLoginSuccess?.();
    } catch (err) {
      console.error('❌ Error en login:', err);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass = "w-full border-2 p-3 rounded bg-white focus:outline-none transition-colors";
    if (validationErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:border-red-500`;
    }
    return `${baseClass} border-gray-300 focus:border-blue-500`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚽</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Fantasy Fútbol Sala</h2>
          <p className="text-gray-600">Inicia sesión en tu cuenta</p>
        </div>

        {/* Errores */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Campo Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={getInputClass('username')}
              placeholder="Ingresa tu usuario"
              disabled={loading}
            />
            {validationErrors.username && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <span>⚠</span> {validationErrors.username}
              </p>
            )}
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={getInputClass('password')}
              placeholder="Ingresa tu contraseña"
              disabled={loading}
            />
            {validationErrors.password && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <span>⚠</span> {validationErrors.password}
              </p>
            )}
          </div>

          {/* Botón de Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Iniciar Sesión
              </>
            )}
          </button>

          {/* Enlace a Registro */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                disabled={loading}
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </form>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 text-center">
            💡 ¿Problemas para acceder? Contacta con el administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;