// components/MarketHeader.jsx
import React from 'react';

const MarketHeader = ({ 
  pestañaActiva, 
  setPestañaActiva, 
  mercado, 
  ofertasRecibidas, 
  ofertasRealizadas, 
  pujasRealizadas,
  ultimaActualizacion 
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h3 className="text-xl font-bold">Sistema de Subastas</h3>
        <p className="text-sm text-gray-600 mt-1">
          {pestañaActiva === 'mercado' && `Jugadores disponibles para pujar (${mercado.length})`}
          {pestañaActiva === 'ofertas-recibidas' && `Ofertas recibidas por tus jugadores (${ofertasRecibidas.length})`}
          {pestañaActiva === 'ofertas-realizadas' && `Tus ofertas y pujas realizadas (${ofertasRealizadas.length + pujasRealizadas.length})`}
        </p>
        {ultimaActualizacion && (
          <p className="text-xs text-gray-400 mt-1">
            Última actualización: {ultimaActualizacion}
          </p>
        )}
      </div>
      
      <div className="flex space-x-1 bg-gray-200 rounded-lg p-1">
        <button
          onClick={() => setPestañaActiva('mercado')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            pestañaActiva === 'mercado'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🏪 Mercado
        </button>
        <button
          onClick={() => setPestañaActiva('ofertas-recibidas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            pestañaActiva === 'ofertas-recibidas'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📥 Ofertas Recibidas
        </button>
        <button
          onClick={() => setPestañaActiva('ofertas-realizadas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            pestañaActiva === 'ofertas-realizadas'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📤 Ofertas & Pujas
        </button>
      </div>
    </div>
  );
};

export default MarketHeader;