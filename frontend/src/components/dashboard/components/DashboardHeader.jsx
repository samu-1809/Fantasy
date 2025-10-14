import React from 'react';
import { Users, RefreshCw } from 'lucide-react';

const DashboardHeader = ({ equipo, ligaActual, ultimaActualizacion, onRefresh }) => {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-lg border border-white/20">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-3">
          <Users className="text-white" size={32} />
        </div>
        <div className="text-left">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {equipo.nombre}
          </h1>
          <p className="text-gray-600 mt-1">Liga {ligaActual?.nombre}</p>
          <p className="text-xs text-gray-400">Actualizado: {ultimaActualizacion}</p>
        </div>
        <button
          onClick={onRefresh}
          className="ml-auto bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
          title="Actualizar datos"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;