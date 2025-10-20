import { useState } from "react";

const EmptySlot = ({ posicion, onClickBench, jugadoresBanquillo, onSeleccionarJugador }) => {
  const [mostrarMenu, setMostrarMenu] = useState(false);

  // Filtrar jugadores del banquillo por posición
  const jugadoresFiltrados = jugadoresBanquillo?.filter(jugador => 
    jugador.posicion === posicion
  ) || [];

  const handleClickAñadir = () => {
    if (jugadoresFiltrados.length === 0) {
      alert(`No hay jugadores de ${posicion} en el banquillo`);
      return;
    }
    setMostrarMenu(!mostrarMenu);
  };

  const handleSeleccionarJugador = (jugador) => {
    onSeleccionarJugador(jugador);
    setMostrarMenu(false);
  };

  return (
    <div className="relative">
      <div className="w-24 h-32 bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center opacity-60 hover:opacity-80 transition-opacity">
        <div className="text-4xl mb-2">👤</div>
        <div className="text-xs font-semibold text-gray-600">{posicion}</div>
        <div className="text-xs text-gray-500">Vacío</div>
        
        {/* Badge con cantidad disponible */}
        {jugadoresFiltrados.length > 0 && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {jugadoresFiltrados.length}
          </div>
        )}
      </div>

      {onClickBench && (
        <button
          onClick={handleClickAñadir}
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg transition-colors whitespace-nowrap"
          title="Añadir desde banquillo"
        >
          + Añadir
        </button>
      )}

      {/* Menú desplegable de jugadores */}
      {mostrarMenu && jugadoresFiltrados.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-2 max-h-60 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 mb-2">
              Seleccionar {posicion}:
            </div>
            {jugadoresFiltrados.map((jugador) => (
              <button
                key={jugador.id}
                onClick={() => handleSeleccionarJugador(jugador)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-md mb-1 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-sm">{jugador.nombre}</div>
                <div className="text-xs text-gray-500">
                  Valor: €{(jugador.valor / 1000000).toFixed(1)}M
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptySlot;