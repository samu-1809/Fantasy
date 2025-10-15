// components/MarketHeader.jsx
import React from 'react';
import { RefreshCw, Bell } from 'lucide-react';

const MarketHeader = ({ 
  pestañaActiva, 
  setPestañaActiva, 
  mercado, 
  ofertasRecibidas, 
  ofertasRealizadas, 
  pujasRealizadas,
  ultimaActualizacion,
  onRefresh 
}) => {
  // Calcular ofertas pendientes
  const ofertasPendientes = (ofertasRecibidas || []).filter(oferta => 
    oferta.estado === 'pendiente' || !oferta.estado
  ).length;

  const tieneOfertasPendientes = ofertasPendientes > 0;
  
  // Calcular total de ofertas y pujas realizadas
  const totalOfertasPujas = (ofertasRealizadas?.length || 0) + (pujasRealizadas?.length || 0);

  return (
    <div className="mb-8">
      {/* Información superior */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-800">Sistema de Subastas</h3>
          <p className="text-sm text-gray-600 mt-1">
            {pestañaActiva === 'mercado' && `Jugadores disponibles para pujar (${mercado?.length || 0})`}
            {pestañaActiva === 'ofertas-recibidas' && `Ofertas recibidas por tus jugadores (${ofertasRecibidas?.length || 0})`}
            {pestañaActiva === 'ofertas-realizadas' && `Tus ofertas y pujas realizadas (${totalOfertasPujas})`}
          </p>
          {ultimaActualizacion && (
            <p className="text-xs text-gray-400 mt-1">
              Última actualización: {ultimaActualizacion}
            </p>
          )}
        </div>
        
        {/* Botón de actualizar */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setPestañaActiva('mercado')}
          className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all relative ${
            pestañaActiva === 'mercado'
              ? 'bg-white text-green-600 shadow-sm border border-green-200'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🏪</span>
            <span>Mercado</span>
            {mercado?.length > 0 && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full min-w-6">
                {mercado.length}
              </span>
            )}
          </div>
        </button>
        
        <button
          onClick={() => setPestañaActiva('ofertas-recibidas')}
          className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all relative ${
            pestañaActiva === 'ofertas-recibidas'
              ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>📥</span>
            <span>Ofertas Recibidas</span>
            {tieneOfertasPendientes && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-6 flex items-center gap-1 animate-pulse">
                <Bell size={12} />
                {ofertasPendientes}
              </span>
            )}
            {!tieneOfertasPendientes && ofertasRecibidas?.length > 0 && (
              <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded-full min-w-6">
                {ofertasRecibidas.length}
              </span>
            )}
          </div>
        </button>
        
        <button
          onClick={() => setPestañaActiva('ofertas-realizadas')}
          className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all relative ${
            pestañaActiva === 'ofertas-realizadas'
              ? 'bg-white text-purple-600 shadow-sm border border-purple-200'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>📤</span>
            <span>Ofertas Realizadas</span>
            {totalOfertasPujas > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full min-w-6">
                {totalOfertasPujas}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Indicador de estado */}
      {tieneOfertasPendientes && (
        <div className="mt-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 rounded-full p-2">
              <Bell className="text-white" size={16} />
            </div>
            <div>
              <p className="font-semibold text-red-700">
                Tienes {ofertasPendientes} oferta(s) pendiente(s)
              </p>
              <p className="text-sm text-red-600">
                Revisa la pestaña "Ofertas Recibidas" para aceptar o rechazar las ofertas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketHeader;