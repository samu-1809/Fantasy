import React, { useState } from 'react';
import { Send, Mail } from 'lucide-react';
import OfertasRecibidas from './OfertasRecibidas';
import OfertasRealizadas from './OfertasRealizadas';

const OfertasScreen = ({ equipoId, onUpdateEquipo }) => {
  const [tabActiva, setTabActiva] = useState('recibidas'); // 'recibidas' | 'realizadas'

  return (
    <div className="bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header con tabs */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">💸 Sistema de Ofertas</h1>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTabActiva('recibidas')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                tabActiva === 'recibidas'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Mail size={20} />
              <span>Ofertas Recibidas</span>
            </button>

            <button
              onClick={() => setTabActiva('realizadas')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                tabActiva === 'realizadas'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Send size={20} />
              <span>Ofertas Realizadas</span>
            </button>
          </div>
        </div>

        {/* Contenido según tab activa */}
        {tabActiva === 'recibidas' ? (
          <OfertasRecibidas equipoId={equipoId} onUpdateEquipo={onUpdateEquipo} />
        ) : (
          <OfertasRealizadas equipoId={equipoId} />
        )}
      </div>
    </div>
  );
};

export default OfertasScreen;
