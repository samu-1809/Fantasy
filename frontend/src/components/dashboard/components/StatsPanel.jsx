import React from 'react';
import { Trophy, Target, TrendingUp, Crown, Star, RefreshCw } from 'lucide-react';

const StatsPanel = ({ equipo, puntosTotales, posicionLiga, loadingPosicion }) => {
  const formatValue = (value) => {
    if (!value) return '€0.0M';
    return `€${(value / 1000000).toFixed(1)}M`;
  };

  const getPosicionIcono = (posicion) => {
    if (!posicion) return <TrendingUp className="text-gray-400" size={20} />;
    
    switch(posicion) {
      case 1: return <Crown className="text-yellow-500" size={24} />;
      case 2: return <Trophy className="text-gray-400" size={20} />;
      case 3: return <Trophy className="text-orange-500" size={20} />;
      case 4: case 5: case 6: return <Star className="text-blue-500" size={18} />;
      default: return <TrendingUp className="text-gray-400" size={18} />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Presupuesto */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Presupuesto</p>
            <p className="text-3xl font-bold mt-2">{formatValue(equipo.presupuesto)}</p>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <Target className="text-white" size={28} />
          </div>
        </div>
      </div>

      {/* Puntos Totales */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Puntos Totales</p>
            <p className="text-3xl font-bold mt-2">{puntosTotales}</p>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <Trophy className="text-white" size={28} />
          </div>
        </div>
      </div>

      {/* Posición Liga */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium">Posición Liga</p>
            <div className="flex items-center gap-3 mt-2">
              {getPosicionIcono(posicionLiga)}
              <span className="text-3xl font-bold">
                {loadingPosicion ? (
                  <RefreshCw className="animate-spin" size={28} />
                ) : posicionLiga ? (
                  `${posicionLiga}º`
                ) : (
                  'N/A'
                )}
              </span>
            </div>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <TrendingUp className="text-white" size={28} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;