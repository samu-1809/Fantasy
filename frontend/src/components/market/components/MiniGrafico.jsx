// components/MiniGrafico.jsx
import React from 'react';
import { TrendingUp, Target, Goal } from 'lucide-react';

const MiniGrafico = ({ puntuaciones }) => {
  if (!puntuaciones || puntuaciones.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-gray-400">
        Sin datos de jornadas
      </div>
    );
  }

  // Tomar las últimas 11 jornadas, ordenadas de más antigua a más reciente
  const ultimasPuntuaciones = puntuaciones
    .sort((a, b) => a.jornada_numero - b.jornada_numero)
    .slice(-11);

  // Encontrar el valor máximo para escalar las barras (mínimo 10 para que se vea bien)
  const maxPuntos = Math.max(...ultimasPuntuaciones.map(p => Math.abs(p.puntos)), 10);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-gray-600" />
        <span className="text-base font-semibold text-gray-700">Rendimiento por Jornada</span>
      </div>
      
      <div className="flex items-end justify-between gap-3 h-40 px-2">
        {ultimasPuntuaciones.map((puntuacion, index) => {
          // Calcular altura relativa (usando valor absoluto para negativos)
          const alturaBase = (Math.abs(puntuacion.puntos) / maxPuntos) * 80;
          const altura = Math.max(alturaBase, 8); // Mínimo 8px de altura
          
          const color = puntuacion.puntos >= 8 ? 'bg-green-500' : 
                       puntuacion.puntos >= 5 ? 'bg-blue-500' : 
                       puntuacion.puntos >= 0 ? 'bg-gray-400' : 'bg-red-500';
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              {/* Contenedor de la barra */}
              <div className="flex flex-col items-center justify-end h-32 w-full">
                {/* GOLES ENCIMA DE LA BARRA */}
                {puntuacion.goles > 0 && (
                  <div className="mb-1 flex items-center justify-center">
                    <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-full border border-orange-200">
                      <span className="text-xs font-bold text-orange-700">{puntuacion.goles}</span>
                      <span className="text-xs">⚽</span>
                    </div>
                  </div>
                )}
                
                {/* Barra del gráfico */}
                <div
                  className={`w-10 ${color} rounded-t-lg transition-all duration-300 relative group`}
                  style={{ height: `${altura}px` }}
                >
                  {/* Tooltip con valor exacto */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    <div className="flex items-center gap-1">
                      <Target size={12} />
                      <span>{puntuacion.puntos} puntos</span>
                    </div>
                    {puntuacion.goles > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Goal size={12} />
                        <span>{puntuacion.goles} goles</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* PUNTOS DEBAJO DE LA BARRA */}
                <div className="mt-2 text-center">
                  <div className={`text-sm font-bold ${
                    puntuacion.puntos >= 8 ? 'text-green-600' : 
                    puntuacion.puntos >= 5 ? 'text-blue-600' : 
                    puntuacion.puntos >= 0 ? 'text-gray-600' : 'text-red-600'
                  }`}>
                    {puntuacion.puntos}
                  </div>
                </div>
              </div>
              
              {/* Etiqueta de jornada */}
              <span className="text-xs text-gray-500 font-medium mt-2">
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