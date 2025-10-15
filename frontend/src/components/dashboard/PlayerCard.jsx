import React from 'react';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import MiniGrafico from '../market/components/MiniGrafico';

const PlayerCard = ({ 
  player, 
  onRemove, 
  onSelect, 
  onRemoveFromMarket,
  estado = 'normal',
  showRemoveButton = true,
  modoCambio = false,
  showGraph = false // 🆕 Nueva prop para controlar si mostrar el gráfico
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
          badge: 'bg-blue-600',
          icon: 'text-blue-600',
          card: 'bg-blue-100 border-2 border-blue-500'
        };
      default:
        return {
          container: '',
          badge: 'bg-gray-900/80',
          icon: 'text-blue-600',
          card: 'bg-white/90'
        };
    }
  };

  const estilos = getEstilosPorEstado();

  const handleClick = () => {
    // No permitir clic si está en estado no-intercambiable durante modo cambio
    if (modoCambio && (estado === 'no-apto-cambio')) {
      return;
    }
    onSelect && onSelect(player);
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    onRemove && onRemove(player);
  };

  const handleRemoveFromMarketClick = (e) => {
    e.stopPropagation();
    onRemoveFromMarket && onRemoveFromMarket(player);
  };

  return (
    <div 
      className={`flex flex-col items-center cursor-pointer group relative transition-all ${estilos.container} ${
        showGraph ? 'min-w-[200px]' : ''
      }`}
      onClick={handleClick}
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
          {formatValue(player.valor)} • {player.equipo_real_nombre}
        </div>
      </div>

      {/* 🆕 MINI GRÁFICO */}
      {showGraph && player.puntuaciones_jornadas && (
        <div className="mt-2 w-full">
          <MiniGrafico puntuaciones={player.puntuaciones_jornadas} />
        </div>
      )}

      {/* Indicadores de estado */}
      {estado === 'origen-cambio' && (
        <div className="absolute -top-1 -left-1 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          <span className="text-[10px] font-bold">↔</span>
        </div>
      )}
      
      {(estado === 'apto-cambio') && (
        <div className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          <span className="text-[10px] font-bold">✓</span>
        </div>
      )}

      {/* Indicador de en venta */}
      {player.en_venta && (
        <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          <span className="text-[10px] font-bold">€</span>
        </div>
      )}

      {/* Texto de estado para modo cambio */}
      {modoCambio && (
        <div className="absolute -bottom-6 left-0 right-0 text-center">
          {estado === 'apto-cambio' && (
            <span className="text-green-600 text-xs font-bold">INTERCAMBIABLE</span>
          )}
          {estado === 'no-apto-cambio' && (
            <span className="text-gray-500 text-xs">NO INTERCAMBIABLE</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;