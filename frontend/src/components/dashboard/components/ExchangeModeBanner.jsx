import React from 'react';
import { RefreshCw } from 'lucide-react';

const ExchangeModeBanner = ({ 
  jugadorSeleccionado, 
  jugadoresIntercambiables, 
  cargando 
}) => {
  return (
    <div className="mb-6 p-4 bg-blue-100 border-2 border-blue-300 rounded-2xl">
      <div className="flex items-center gap-3">
        <RefreshCw className="text-blue-600" size={24} />
        <div>
          <h3 className="font-bold text-blue-800">Modo Cambio Activado</h3>
          <p className="text-blue-600 text-sm">
            Selecciona un {jugadorSeleccionado?.posicion} para intercambiar con {jugadorSeleccionado?.nombre}
          </p>
          <p className="text-blue-500 text-xs mt-1">
            {jugadoresIntercambiables.length} jugadores disponibles para intercambio
          </p>
          <p className="text-blue-400 text-xs mt-1">
            💡 Haz clic en el mismo jugador o fuera del campo para cancelar
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExchangeModeBanner;