// components/MarketStats.jsx
import React from 'react';

const MarketStats = ({ datosUsuario, formatNormalValue }) => {
  if (!datosUsuario?.equipo) return null;

  const totalJugadores = datosUsuario.equipo.jugadores?.length || 0;
  const maxJugadores = 13;
  const presupuesto = datosUsuario.equipo.presupuesto || 0;

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
        <div className="text-sm text-gray-600">Presupuesto disponible</div>
        <div className="text-2xl font-bold text-blue-600">{formatNormalValue(presupuesto)}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
        <div className="text-sm text-gray-600">Jugadores</div>
        <div className="text-2xl font-bold text-green-600">
          {totalJugadores}/{maxJugadores}
          {totalJugadores >= maxJugadores && (
            <span className="text-sm text-red-600 ml-2">(Plantilla completa)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketStats;