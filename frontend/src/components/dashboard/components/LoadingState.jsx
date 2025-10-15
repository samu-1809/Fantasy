import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

const LoadingState = ({ tipo = 'loading', onRetry, onReload }) => {
  if (tipo === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  if (tipo === 'no-team') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Equipo No Encontrado</h2>
          <p className="text-gray-600 mb-6">
            No se pudo cargar tu equipo. Esto puede deberse a un error en el servidor.
          </p>
          <div className="space-y-3">
            <button 
              onClick={onRetry}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
            >
              Reintentar Carga
            </button>
            <button 
              onClick={onReload}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Recargar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LoadingState;