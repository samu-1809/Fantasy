// components/common/real-teams/ScorersTab.jsx
import React from 'react';
import { Goal, Target, Shield, TrendingUp, Star, Crown } from 'lucide-react';

const ScorersTab = ({ 
  goleadores, 
  searchTerm, 
  onJugadorClick, 
  coloresPosiciones, 
  nombresPosiciones 
}) => {
  const goleadoresFiltrados = goleadores.filter(jugador =>
    jugador.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estadísticas de goleadores
  const estadisticasGoleadores = {
    totalJugadores: goleadoresFiltrados.length,
    totalGoles: goleadoresFiltrados.reduce((sum, jugador) => sum + (jugador.goles || 0), 0),
    promedioGoles: goleadoresFiltrados.length > 0 ? 
      (goleadoresFiltrados.reduce((sum, jugador) => sum + (jugador.goles || 0), 0) / goleadoresFiltrados.length).toFixed(2) : 0,
    maxGoles: goleadoresFiltrados.length > 0 ? Math.max(...goleadoresFiltrados.map(j => j.goles || 0)) : 0
  };

  if (goleadoresFiltrados.length === 0) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl shadow-xl p-12 text-center border border-orange-200">
        <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Goal className="text-white" size={40} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">No se encontraron goleadores</h3>
        <p className="text-gray-600 text-lg">
          {searchTerm ? `No hay resultados para "${searchTerm}"` : 'No hay datos de goleadores disponibles'}
        </p>
        <div className="mt-6 w-32 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <>
      {/* Estadísticas de Goleadores - Diseño Mejorado */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl shadow-2xl p-8 mb-10 border border-orange-200">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
            <Crown size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Estadísticas de Goleadores</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Goleadores */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <Target size={18} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white text-center drop-shadow-sm">
              {estadisticasGoleadores.totalJugadores}
            </div>
            <div className="text-sm text-green-100 text-center font-medium mt-2">Goleadores</div>
          </div>

          {/* Total Goles */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <Goal size={18} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white text-center drop-shadow-sm">
              {estadisticasGoleadores.totalGoles}
            </div>
            <div className="text-sm text-orange-100 text-center font-medium mt-2">Goles Totales</div>
          </div>

          {/* Promedio de Goles */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <TrendingUp size={18} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white text-center drop-shadow-sm">
              {estadisticasGoleadores.promedioGoles}
            </div>
            <div className="text-sm text-blue-100 text-center font-medium mt-2">Prom. Goles/Jugador</div>
          </div>

          {/* Máximo Goleador */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <Star size={18} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white text-center drop-shadow-sm">
              {estadisticasGoleadores.maxGoles}
            </div>
            <div className="text-sm text-purple-100 text-center font-medium mt-2">Máximo Goleador</div>
          </div>
        </div>

        {/* Línea decorativa */}
        <div className="flex justify-center mt-6">
          <div className="w-48 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-full"></div>
        </div>
      </div>

      {/* Grid de Goleadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {goleadoresFiltrados.map((jugador, index) => (
          <div
            key={jugador.id}
            onClick={() => onJugadorClick(jugador)}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-orange-300 relative group"
          >
            {/* Badge de ranking especial para goleadores */}
            {index < 3 && (
              <div className={`absolute -top-3 -right-3 z-20 ${
                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-yellow-500/50' :
                index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/50' :
                'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/50'
              } rounded-full w-12 h-12 flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </div>
            )}

            {/* Header con gradiente */}
            <div className={`bg-gradient-to-r ${coloresPosiciones[jugador.posicion] || 'from-gray-500 to-gray-600'} text-white p-8 relative overflow-hidden`}>
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-white opacity-10 transform skew-y-12 -translate-y-1/2"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg backdrop-blur-sm">
                    {jugador.posicion?.charAt(0) || 'J'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold drop-shadow-sm">{jugador.nombre}</h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Estadísticas - Solo Goles */}
            <div className="p-8 bg-gradient-to-br from-orange-50 to-red-50">
              {/* Tarjeta principal de Goles */}
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-lg transform group-hover:scale-105 transition-transform duration-300 mb-4">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <Goal size={24} className="text-white" />
                  </div>
                  <div className="text-lg font-bold text-orange-100">Goles Anotados</div>
                </div>
                <div className="text-4xl font-bold text-white text-center drop-shadow-sm">
                  {jugador.goles || 0}
                </div>
              </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Equipo */}
              {jugador.equipo_real_nombre && (
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full px-4 py-2 shadow-lg">
                  <Shield size={16} className="text-white" />
                  <span className="text-sm font-semibold">{jugador.equipo_real_nombre}</span>
                </div>
              )}

              {/* Puntuación Total */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full px-4 py-2 shadow-lg">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">⭐</span>
                  <span className="text-sm font-bold">{jugador.puntos_totales || 0}</span>
                </div>
                <span className="text-sm font-semibold">Puntos</span>
              </div>
            </div>
            </div>

            {/* Footer con efecto hover */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-t border-gray-300 px-6 py-4 group-hover:from-orange-100 group-hover:to-red-200 transition-all duration-300">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700 group-hover:text-orange-800 font-medium">
                <Star size={16} className="text-yellow-500" />
                <span>Haz clic para ver detalles completos</span>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Efecto de borde en hover */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-orange-400 group-hover:shadow-orange-200 transition-all duration-300 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Contador de goleadores con estilo mejorado */}
      {goleadoresFiltrados.length > 0 && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full px-6 py-3 shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Goal size={16} className="text-white" />
            </div>
            <span className="font-semibold">
              {goleadoresFiltrados.length} goleador{goleadoresFiltrados.length !== 1 ? 'es' : ''} encontrados
            </span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
          
          {/* Línea decorativa */}
          <div className="flex justify-center mt-8">
            <div className="w-48 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-full"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScorersTab;