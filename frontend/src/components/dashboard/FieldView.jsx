import PlayerCard from './PlayerCard';
<<<<<<< Updated upstream
=======
import EmptySlot from './components/EmptySlot';
import { useState } from 'react';
>>>>>>> Stashed changes

const FieldView = ({
  portero_titular,
  defensas_titulares,
  delanteros_titulares,
  banquillo,
  onPlayerClick,
  onSellPlayer,
  onRemoveFromMarket,
  getPlayerState,
  modoCambio = false,
  onMoverJugadorAlineacion // ← Nueva prop para manejar el movimiento
}) => {
<<<<<<< Updated upstream
=======
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
          index: i // ← Añadimos el índice para identificar el slot
        });
      }
    }
    return slots;
  };

  // Filtrar banquillo por posición
  const getJugadoresBanquilloPorPosicion = (posicion) => {
    return banquillo.filter(jugador => jugador.posicion === posicion);
  };

  // Manejar selección de jugador para slot vacío
  const handleSeleccionarJugador = (jugador, posicion, index) => {
    if (onMoverJugadorAlineacion) {
      onMoverJugadorAlineacion(jugador, posicion, index);
    }
  };

  // Crear slots (siempre 1 POR, 2 DEF, 2 DEL)
  const delanterosSlots = fillSlots(delanteros_titulares, 2, 'DEL');
  const defensasSlots = fillSlots(defensas_titulares, 2, 'DEF');
  const porteroSlots = fillSlots(portero_titular ? [portero_titular] : [], 1, 'POR');

>>>>>>> Stashed changes
  return (
    <div className="space-y-8">
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
<<<<<<< Updated upstream
              {delanteros_titulares.map((del, idx) => (
                <PlayerCard 
                  key={del.id} 
                  player={del}
                  onSelect={onPlayerClick}
                  onRemove={onSellPlayer}
                  onRemoveFromMarket={onRemoveFromMarket}
                  estado={getPlayerState(del)}
                  showRemoveButton={!modoCambio}
                  modoCambio={modoCambio}
                />
=======
              {delanterosSlots.map((slot) => (
                slot.type === 'player' ? (
                  <PlayerCard
                    key={slot.key}
                    player={slot.data}
                    onSelect={onPlayerClick}
                    onRemove={onSellPlayer}
                    onRemoveFromMarket={onRemoveFromMarket}
                    estado={getPlayerState(slot.data)}
                    showRemoveButton={!modoCambio}
                    modoCambio={modoCambio}
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
>>>>>>> Stashed changes
              ))}
            </div>

            {/* Defensas TITULARES */}
            <div className="flex justify-around px-24">
<<<<<<< Updated upstream
              {defensas_titulares.map((def, idx) => (
                <PlayerCard 
                  key={def.id} 
                  player={def}
                  onSelect={onPlayerClick}
                  onRemove={onSellPlayer}
                  onRemoveFromMarket={onRemoveFromMarket}
                  estado={getPlayerState(def)}
                  showRemoveButton={!modoCambio}
                  modoCambio={modoCambio}
                />
=======
              {defensasSlots.map((slot) => (
                slot.type === 'player' ? (
                  <PlayerCard
                    key={slot.key}
                    player={slot.data}
                    onSelect={onPlayerClick}
                    onRemove={onSellPlayer}
                    onRemoveFromMarket={onRemoveFromMarket}
                    estado={getPlayerState(slot.data)}
                    showRemoveButton={!modoCambio}
                    modoCambio={modoCambio}
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
>>>>>>> Stashed changes
              ))}
            </div>

            {/* Portero TITULAR */}
            <div className="flex justify-center">
<<<<<<< Updated upstream
              {portero_titular && (
                <PlayerCard 
                  player={portero_titular}
                  onSelect={onPlayerClick}
                  onRemove={onSellPlayer}
                  onRemoveFromMarket={onRemoveFromMarket}
                  estado={getPlayerState(portero_titular)}
                  showRemoveButton={!modoCambio}
                  modoCambio={modoCambio}
                />
              )}
=======
              {porteroSlots.map((slot) => (
                slot.type === 'player' ? (
                  <PlayerCard
                    key={slot.key}
                    player={slot.data}
                    onSelect={onPlayerClick}
                    onRemove={onSellPlayer}
                    onRemoveFromMarket={onRemoveFromMarket}
                    estado={getPlayerState(slot.data)}
                    showRemoveButton={!modoCambio}
                    modoCambio={modoCambio}
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
>>>>>>> Stashed changes
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {banquillo.map((jugador) => (
              <PlayerCard 
                key={jugador.id} 
                player={jugador} 
                onRemove={onSellPlayer}
                onRemoveFromMarket={onRemoveFromMarket}
                onSelect={onPlayerClick}
                estado={getPlayerState(jugador)}
                showRemoveButton={!modoCambio}
                modoCambio={modoCambio}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldView;