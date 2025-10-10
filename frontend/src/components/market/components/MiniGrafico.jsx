// components/MiniGrafico.jsx
import React from 'react';
import { TrendingUp } from 'lucide-react';

const MiniGrafico = ({ puntuaciones }) => {
  if (!puntuaciones || puntuaciones.length === 0) {
    return (
      <div className="flex items-center justify-center h-8 text-xs text-gray-400">
        Sin datos
      </div>
    );
  }

  // Tomar las últimas 5 jornadas
  const ultimasPuntuaciones = puntuaciones
    .sort((a, b) => b.jornada_numero - a.jornada_numero)
    .slice(0, 5);

  // Encontrar el valor máximo para escalar las barras
  const maxPuntos = Math.max(...ultimasPuntuaciones.map(p => p.puntos), 1);
  
  return (
    <div className="flex-1 max-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={12} className="text-gray-500" />
        <span className="text-xs font-medium text-gray-600">Últimas jornadas</span>
      </div>
      <div className="flex items-end gap-1 h-6">
        {ultimasPuntuaciones.map((puntuacion, index) => {
          const altura = (puntuacion.puntos / maxPuntos) * 20; // 20px de altura máxima
          const color = puntuacion.puntos >= 8 ? 'bg-green-500' : 
                       puntuacion.puntos >= 5 ? 'bg-blue-500' : 
                       puntuacion.puntos >= 0 ? 'bg-gray-400' : 'bg-red-500';
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-2 ${color} rounded-t transition-all duration-300`}
                style={{ height: `${Math.max(altura, 3)}px` }} // Mínimo 3px de altura
                title={`J${puntuacion.jornada_numero}: ${puntuacion.puntos} pts`}
              />
              <span className="text-[9px] text-gray-500 mt-1">
                J{puntuacion.jornada_numero}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniGrafico;