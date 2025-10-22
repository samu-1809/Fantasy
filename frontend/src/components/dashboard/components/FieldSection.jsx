import React from 'react';
import { Target, RefreshCw, Users } from 'lucide-react';
import EmptySlot from './EmptySlot';

const FieldSection = ({
  titularesCount,
  totalCount,
  onRefresh,
  // Props de FieldView
  portero_titular,
  defensas_titulares,
  delanteros_titulares,
  banquillo,
  onPlayerClick,
  onSellPlayer,
  onRemoveFromMarket,
  getPlayerState,
  modoCambio = false,
  onMoverJugadorAlineacion,
  getJugadoresBanquilloPorPosicion
}) => {
  // Función para llenar slots vacíos
  const fillSlots = (players, requiredCount, posicion) => {
    const slots = [];
    for (let i = 0; i < requiredCount; i++) {
      if (players[i]) {
        slots.push({ type: 'player', data: players[i], key: players[i].id });
      } else {
        slots.push({ 
          type: 'empty', 
          posicion, 
          key: `empty-${posicion}-${i}`,
          index: i
        });
      }
    }
    return slots;
  };

  // Manejar selección de jugador para slot vacío
  const handleSeleccionarJugador = (jugador, posicion, index) => {
    if (onMoverJugadorAlineacion) {
      onMoverJugadorAlineacion(jugador, posicion, index);
    }
  };

  // Componente PlayerCard integrado - MÁS ANCHO
  const PlayerCard = ({ 
    player, 
    estado = 'normal',
    showRemoveButton = true,
    variant = 'field' // 'field' | 'bench'
  }) => {
    
    const getBadgeColor = (pts) => {
      if (pts > 0) return 'bg-green-500';
      if (pts < 0) return 'bg-red-500';
      return 'bg-gray-400';
    };

    const formatValue = (value) => {
      return `€${(value / 1000000).toFixed(1)}M`;
    };

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
            card: variant === 'bench' ? 'bg-white border border-gray-200' : 'bg-white/90'
          };
      }
    };

    const estilos = getEstilosPorEstado();

    const handleClick = () => {
      if (modoCambio && (estado === 'no-apto-cambio')) {
        return;
      }
      onPlayerClick && onPlayerClick(player);
    };

    const handleRemoveClick = (e) => {
      e.stopPropagation();
      onSellPlayer && onSellPlayer(player);
    };

    const handleRemoveFromMarketClick = (e) => {
      e.stopPropagation();
      onRemoveFromMarket && onRemoveFromMarket(player);
    };

    return (
      <div 
        className={`flex flex-col items-center cursor-pointer group relative transition-all ${estilos.container} ${
          // MÁS ANCHO: Ajustado para mejor visualización
          variant === 'bench' ? 'min-w-[180px]' : 'min-w-[160px]'
        }`}
        onClick={handleClick}
      >
        {/* Badge de posición */}
        <div className={`mb-1 text-white text-xs font-bold px-2 py-0.5 rounded ${estilos.badge}`}>
          {getEtiquetaPosicion(player.posicion)}
        </div>
        
        {/* Icono y puntos */}
        <div className="relative">
          <Users 
            size={variant === 'bench' ? 40 : 48} 
            className={`transition-colors drop-shadow-lg ${estilos.icon}`} 
          />
          <div className={`absolute -top-1 -right-1 ${getBadgeColor(player.puntos_totales)} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white`}>
            {player.puntos_totales}
          </div>
        </div>
        
        {/* CONTENEDOR MÁS ANCHO para información del jugador */}
        <div className={`mt-2 px-4 py-2 rounded-lg shadow-md text-center transition-all ${estilos.card} ${
          variant === 'bench' ? 'min-w-[170px]' : 'min-w-[150px]'
        }`}>
          <div className="font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
            {player.nombre}
          </div>
          <div className="text-xs text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
            {formatValue(player.valor)} • {player.equipo_real_nombre}
          </div>
        </div>

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

  // Crear slots (siempre 1 POR, 2 DEF, 2 DEL)
  const delanterosSlots = fillSlots(delanteros_titulares, 2, 'DEL');
  const defensasSlots = fillSlots(defensas_titulares, 2, 'DEF');
  const porteroSlots = fillSlots(portero_titular ? [portero_titular] : [], 1, 'POR');

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-full p-2">
            <Target className="text-white" size={24} />
          </div>
          Alineación Actual
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {titularesCount} titulares • {totalCount} total
          </div>
          <button
            onClick={onRefresh}
            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
            title="Actualizar alineación"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Campo de fútbol */}
      <div className="bg-amber-50 rounded-lg shadow-2xl p-6 relative overflow-hidden border-4 border-blue-500 max-w-4xl mx-auto">
        <div className="absolute inset-0">
          <div className="absolute left-2 top-2 bottom-2 w-1 bg-blue-500"></div>
          <div className="absolute right-2 top-2 bottom-2 w-1 bg-blue-500"></div>
          <div className="absolute left-2 right-2 bottom-2 h-1 bg-blue-500"></div>
          <div className="absolute left-2 right-2 top-2 h-1 bg-blue-500"></div>
          <div className="absolute left-1/2 top-2 transform -translate-x-1/2 w-24 h-12 border-4 border-blue-500 border-t-0 rounded-b-full"></div>
          <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 w-48 h-20 border-4 border-blue-500 border-b-0 rounded-t-3xl"></div>
          <div className="absolute left-1/2 bottom-16 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-4 border-b-4 border-blue-500 rounded-bl-full"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-4 border-b-4 border-blue-500 rounded-br-full"></div>
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-500"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-500"></div>
        </div>

        <div className="relative z-10">
          <div className="relative z-10 h-96 flex flex-col justify-between py-4 pb-12">
            {/* Delanteros TITULARES */}
            <div className="flex justify-around px-24">
              {delanterosSlots.map((slot) => (
                slot.type === 'player' ? (
                  <PlayerCard
                    key={slot.key}
                    player={slot.data}
                    estado={getPlayerState(slot.data)}
                    showRemoveButton={!modoCambio}
                  />
                ) : (
                  <EmptySlot 
                    key={slot.key} 
                    posicion="DEL"
                    jugadoresBanquillo={getJugadoresBanquilloPorPosicion('DEL')}
                    onSeleccionarJugador={(jugador) => 
                      handleSeleccionarJugador(jugador, 'DEL', slot.index)
                    }
                    onClickBench={true}
                  />
                )
              ))}
            </div>

            {/* Defensas TITULARES */}
            <div className="flex justify-around px-24">
              {defensasSlots.map((slot) => (
                slot.type === 'player' ? (
                  <PlayerCard
                    key={slot.key}
                    player={slot.data}
                    estado={getPlayerState(slot.data)}
                    showRemoveButton={!modoCambio}
                  />
                ) : (
                  <EmptySlot 
                    key={slot.key} 
                    posicion="DEF"
                    jugadoresBanquillo={getJugadoresBanquilloPorPosicion('DEF')}
                    onSeleccionarJugador={(jugador) => 
                      handleSeleccionarJugador(jugador, 'DEF', slot.index)
                    }
                    onClickBench={true}
                  />
                )
              ))}
            </div>

            {/* Portero TITULAR */}
            <div className="flex justify-center">
              {porteroSlots.map((slot) => (
                slot.type === 'player' ? (
                  <PlayerCard
                    key={slot.key}
                    player={slot.data}
                    estado={getPlayerState(slot.data)}
                    showRemoveButton={!modoCambio}
                  />
                ) : (
                  <EmptySlot 
                    key={slot.key} 
                    posicion="POR"
                    jugadoresBanquillo={getJugadoresBanquilloPorPosicion('POR')}
                    onSeleccionarJugador={(jugador) => 
                      handleSeleccionarJugador(jugador, 'POR', slot.index)
                    }
                    onClickBench={true}
                  />
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Banquillo */}
      {banquillo.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow border-2 border-gray-300 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🪑</span>
            Banquillo ({banquillo.length} jugadores)
          </h3>
          {/* GRID AJUSTADO para tarjetas más anchas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {banquillo.map((jugador) => (
              <PlayerCard 
                key={jugador.id} 
                player={jugador}
                variant="bench"
                estado={getPlayerState(jugador)}
                showRemoveButton={!modoCambio}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldSection;