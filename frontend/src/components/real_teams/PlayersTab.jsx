// components/common/real-teams/PlayersTab.jsx
import React from 'react';
import { Users, Target, Euro, Shield, TrendingUp, Star } from 'lucide-react';

const PlayersTab = ({ 
  jugadores, 
  searchTerm, 
  onJugadorClick, 
  coloresPosiciones, 
  nombresPosiciones 
}) => {
  const jugadoresFiltrados = jugadores.filter(jugador =>
    jugador.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (jugadoresFiltrados.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl shadow-xl p-12 text-center border border-gray-200">
        <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Users className="text-white" size={40} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">No se encontraron jugadores</h3>
        <p className="text-gray-600 text-lg">
          {searchTerm ? `No hay resultados para "${searchTerm}"` : 'No hay jugadores registrados'}
        </p>
        <div className="mt-6 w-32 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {jugadoresFiltrados.map((jugador, index) => (
          <div
            key={jugador.id}
            onClick={() => onJugadorClick(jugador)}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-green-300 relative group"
          >
            {/* Badge de ranking */}
            {index < 3 && (
              <div className={`absolute -top-3 -right-3 z-20 ${
                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-yellow-500/50' :
                index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/50' :
                'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/50'
              } rounded-full w-12 h-12 flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                #{index + 1}
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
                    <p className="text-sm opacity-90 font-medium">
                      {nombresPosiciones[jugador.posicion] || jugador.posicion}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Estadísticas con diseño de tarjetas coloridas */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Tarjeta de Puntos - Verde */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="p-2 bg-white bg-opacity-20 rounded-full">
                      <Target size={16} className="text-white" />
                    </div>
                    <div className="text-xs font-medium text-green-100">Puntos</div>
                  </div>
                  <div className="text-2xl font-bold text-white drop-shadow-sm text-center">
                    {jugador.puntos_totales || 0}
                  </div>
                </div>

                {/* Tarjeta de Valor - Azul */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="p-2 bg-white bg-opacity-20 rounded-full">
                      <Euro size={16} className="text-white" />
                    </div>
                    <div className="text-xs font-medium text-blue-100">Valor mercado</div>
                  </div>
                  <div className="text-2xl font-bold text-white drop-shadow-sm text-center">
                    €{(jugador.valor / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con efecto hover */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-t border-gray-300 px-6 py-4 group-hover:from-green-100 group-hover:to-emerald-200 transition-all duration-300">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700 group-hover:text-green-800 font-medium">
                <Star size={16} className="text-yellow-500" />
                <span>Haz clic para ver detalles completos</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Efecto de borde en hover */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-green-400 group-hover:shadow-green-200 transition-all duration-300 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Contador de jugadores con estilo mejorado */}
      {jugadoresFiltrados.length > 0 && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-6 py-3 shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
            <span className="font-semibold">
              {jugadoresFiltrados.length} jugador{jugadoresFiltrados.length !== 1 ? 'es' : ''} encontrados
            </span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
          
          {/* Línea decorativa */}
          <div className="flex justify-center mt-8">
            <div className="w-48 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayersTab;