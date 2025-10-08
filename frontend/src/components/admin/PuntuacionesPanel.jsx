import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { asignarPuntos } from '../../services/api';

const PuntuacionesPanel = ({ jugadores, onAsignarPuntosSuccess }) => {
  const [puntuaciones, setPuntuaciones] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [asignandoPuntos, setAsignandoPuntos] = useState(false);
  
  const {
    jornadas,
    equiposReales,
    jornadaSeleccionada,
    setJornadaSeleccionada
  } = useAdmin();

  // 🆕 Filtrar jugadores según búsqueda y equipo REAL
  const jugadoresFiltrados = jugadores.filter(jugador => {
    const coincideBusqueda = jugador.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            (jugador.equipo_real_nombre && jugador.equipo_real_nombre.toLowerCase().includes(busqueda.toLowerCase()));
    
    const coincideEquipo = filtroEquipo === 'todos' || 
                          (jugador.equipo_real_nombre && jugador.equipo_real_nombre === filtroEquipo);
    
    return coincideBusqueda && coincideEquipo;
  });

  const handlePuntuacionChange = (jugadorId, puntos) => {
    setPuntuaciones(prev => ({
      ...prev,
      [jugadorId]: parseInt(puntos) || 0
    }));
  };

  const handleAsignarPuntos = async () => {
    if (Object.keys(puntuaciones).length === 0) {
      alert('No hay puntuaciones para asignar');
      return;
    }

    const puntosArray = Object.entries(puntuaciones).map(([jugador_id, puntos]) => ({
      jugador_id: parseInt(jugador_id),
      puntos
    }));

    setAsignandoPuntos(true);
    try {
      const jornada = jornadas.find(j => j.id === jornadaSeleccionada);
      const numeroJornada = jornada?.numero || 1;
      
      await asignarPuntos(numeroJornada, puntosArray);
      alert(`Puntos asignados exitosamente para la jornada ${numeroJornada}`);
      setPuntuaciones({});
      onAsignarPuntosSuccess?.();
    } catch (err) {
      alert('Error al asignar puntos: ' + err.message);
    } finally {
      setAsignandoPuntos(false);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEquipo('todos');
  };

  const limpiarPuntuaciones = () => {
    setPuntuaciones({});
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  const jornadaActual = jornadas.find(j => j.id === jornadaSeleccionada);
  const totalPuntosAsignados = Object.values(puntuaciones).reduce((sum, puntos) => sum + puntos, 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Selector de Jornada */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Jornada</label>
          <select
            value={jornadaSeleccionada || ''}
            onChange={(e) => setJornadaSeleccionada(parseInt(e.target.value))}
            className="w-full border-2 border-gray-300 p-3 rounded bg-white"
          >
            {jornadas.map(jornada => (
              <option key={jornada.id} value={jornada.id}>
                Jornada {jornada.numero}
              </option>
            ))}
          </select>
        </div>

        {/* Buscador */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Buscar Jugador</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border-2 border-gray-300 p-3 pl-10 rounded"
              placeholder="Nombre o equipo real..."
            />
          </div>
        </div>

        {/* 🆕 Filtro por Equipo REAL */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Filtrar por Equipo Real</label>
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            className="w-full border-2 border-gray-300 p-3 rounded bg-white"
          >
            <option value="todos">Todos los equipos</option>
            {equiposReales.map(equipo => (
              <option key={equipo.id} value={equipo.nombre}>
                {equipo.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de acción */}
        <div className="flex items-end gap-2">
          <button
            onClick={limpiarFiltros}
            className="bg-gray-500 text-white p-3 rounded font-medium hover:bg-gray-600 whitespace-nowrap"
          >
            Limpiar Filtros
          </button>
          <button
            onClick={limpiarPuntuaciones}
            className="bg-red-500 text-white p-3 rounded font-medium hover:bg-red-600 whitespace-nowrap"
          >
            Limpiar Puntos
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4">
        Asignar Puntos - Jornada {jornadaActual?.numero}
      </h3>
      
      <div className="mb-4 text-sm text-gray-600">
        Mostrando {jugadoresFiltrados.length} de {jugadores.length} jugadores
        {filtroEquipo !== 'todos' && ` • Filtrado por: ${filtroEquipo}`}
        {Object.keys(puntuaciones).length > 0 && ` • ${Object.keys(puntuaciones).length} jugadores con puntos asignados (Total: ${totalPuntosAsignados} pts)`}
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {jugadoresFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No se encontraron jugadores con los filtros aplicados</p>
          </div>
        ) : (
          jugadoresFiltrados.map((player) => (
            <div key={player.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded border-2 border-gray-300 hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="font-medium">{player.nombre}</div>
                <div className="text-sm text-gray-600">
                  {player.posicion === 'POR' ? 'Portero' : 
                   player.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
                  {player.equipo_real_nombre} • {formatValue(player.valor)} • {player.puntos_totales} pts totales
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Puntos:</label>
                <input
                  type="number"
                  className="w-20 border-2 border-gray-300 p-2 rounded text-center focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                  value={puntuaciones[player.id] || ''}
                  onChange={(e) => handlePuntuacionChange(player.id, e.target.value)}
                  min="-10"
                  max="20"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {jugadoresFiltrados.length > 0 && (
        <div className="mt-6 pt-6 border-t-2 border-gray-300">
          <button
            onClick={handleAsignarPuntos}
            disabled={asignandoPuntos || Object.keys(puntuaciones).length === 0}
            className="w-full bg-green-600 text-white p-4 rounded font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {asignandoPuntos ? 'Asignando Puntos...' : `Aplicar Puntos a Jornada ${jornadaActual?.numero}`}
          </button>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Los valores de los jugadores se recalcularán automáticamente según los puntos asignados
          </p>
        </div>
      )}
    </div>
  );
};

export default PuntuacionesPanel;