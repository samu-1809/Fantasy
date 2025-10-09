import React from 'react';
import { Users, Minus } from 'lucide-react';

const PlayerCard = ({ 
  player, 
  onRemove, 
  onSelect, 
  estado = 'normal',
  showRemoveButton = true 
}) => {
  
  const getBadgeColor = (pts) => {
    if (pts > 0) return 'bg-green-500';
    if (pts < 0) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const formatValue = (value) => {
    return `€${(value / 1000000).toFixed(1)}M`;
  };

  // 🆕 FUNCIÓN PARA ETIQUETAS DE POSICIÓN
  const getEtiquetaPosicion = (posicion) => {
    const etiquetas = {
      'POR': 'POR',
      'DEF': 'DEF', 
      'DEL': 'ATA' 
    };
    return etiquetas[posicion] || posicion;
  };

  // Determinar estilos según el estado
  const getEstilosPorEstado = () => {
    switch(estado) {
      case 'origen-cambio':
        return {
          container: 'scale-110 transform ring-4 ring-yellow-500 bg-yellow-50',
          badge: 'bg-yellow-600',
          icon: 'text-yellow-600',
          card: 'bg-yellow-100 border-2 border-yellow-500'
        };
      case 'apto-cambio':
        return {
          container: 'scale-105 transform ring-2 ring-green-400 bg-green-50 cursor-pointer hover:scale-110',
          badge: 'bg-green-600',
          icon: 'text-green-600',
          card: 'bg-green-50 border-2 border-green-400'
        };
      case 'no-apto-cambio':
        return {
          container: 'opacity-50 cursor-not-allowed',
          badge: 'bg-gray-600',
          icon: 'text-gray-400',
          card: 'bg-gray-100 border-gray-300'
        };
      case 'seleccionado':
        return {
          container: 'scale-110 transform',
          badge: 'bg-green-600',
          icon: 'text-green-600',
          card: 'bg-green-100 border-2 border-green-500'
        };
      default:
        return {
          container: '',
          badge: 'bg-gray-900/80',
          icon: 'text-blue-600 group-hover:text-blue-800',
          card: 'bg-white/90'
        };
    }
  };

  const estilos = getEstilosPorEstado();

  return (
    <div 
      className={`flex flex-col items-center cursor-pointer group relative transition-all ${estilos.container}`}
      onClick={() => onSelect && onSelect(player)}
    >
      {/* 🎯 CORREGIDO: Usar etiqueta correcta */}
      <div className={`mb-1 text-white text-xs font-bold px-2 py-0.5 rounded ${estilos.badge}`}>
        {getEtiquetaPosicion(player.posicion)}
      </div>
      <div className="relative">
        <Users 
          size={48} 
          className={`transition-colors drop-shadow-lg ${estilos.icon}`} 
        />
        <div className={`absolute -top-1 -right-1 ${getBadgeColor(player.puntos_totales)} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white`}>
          {player.puntos_totales}
        </div>
      </div>
      <div className={`mt-2 backdrop-blur px-3 py-1 rounded-lg shadow-md text-center min-w-[120px] transition-all ${estilos.card}`}>
        <div className="font-bold text-sm">{player.nombre}</div>
        <div className="text-xs text-gray-600">
          {formatValue(player.valor)} • {player.equipo_real}
        </div>
      </div>
      
      {/* Botón de eliminar/vender (solo en estado normal y si está permitido) */}
      {onRemove && estado === 'normal' && showRemoveButton && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(player);
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Minus size={16} />
        </button>
      )}

      {/* Indicadores de estado */}
      {estado === 'origen-cambio' && (
        <div className="absolute -top-1 -left-1 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          <span className="text-[10px] font-bold">↔</span>
        </div>
      )}
      {estado === 'apto-cambio' && (
        <div className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          <span className="text-[10px] font-bold">✓</span>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;