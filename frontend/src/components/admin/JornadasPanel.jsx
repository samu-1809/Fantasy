import React, { useState, useEffect } from 'react';
import { 
  getJornadas, 
  getPartidosJornada, 
  crearJornada, 
  crearPartido, 
  eliminarPartido,
  getEquiposDisponiblesJornada
} from '../../services/api';
import { Trash2, Plus, Calendar, RefreshCw } from 'lucide-react';

const JornadasPanel = () => {
  const [jornadas, setJornadas] = useState([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creandoPartido, setCreandoPartido] = useState(false);
  const [nuevoPartido, setNuevoPartido] = useState({
    equipo_local: '',
    equipo_visitante: '',
    fecha: ''
  });

  // Cargar jornadas al montar
  useEffect(() => {
    cargarJornadas();
  }, []);

  // Cuando se selecciona una jornada, cargar partidos y equipos disponibles
  useEffect(() => {
    if (jornadaSeleccionada) {
      cargarPartidos(jornadaSeleccionada);
      cargarEquiposDisponibles(jornadaSeleccionada);
    }
  }, [jornadaSeleccionada]);

  const cargarJornadas = async () => {
    try {
      setLoading(true);
      const data = await getJornadas();
      setJornadas(data);
      
      if (data.length > 0 && !jornadaSeleccionada) {
        setJornadaSeleccionada(data[0].id);
      }
    } catch (err) {
      setError('Error al cargar las jornadas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarPartidos = async (jornadaId) => {
    try {
      setLoading(true);
      const data = await getPartidosJornada(jornadaId);
      setPartidos(data);
    } catch (err) {
      setError('Error al cargar los partidos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarEquiposDisponibles = async (jornadaId) => {
    try {
      const data = await getEquiposDisponiblesJornada(jornadaId);
      setEquiposDisponibles(data);
    } catch (err) {
      setError('Error al cargar equipos disponibles: ' + err.message);
    }
  };

  const handleCrearJornada = async () => {
    try {
      setLoading(true);
      const nuevaJornadaNumero = jornadas.length + 1;
      await crearJornada(nuevaJornadaNumero);
      await cargarJornadas();
      alert(`✅ Jornada ${nuevaJornadaNumero} creada exitosamente`);
    } catch (err) {
      setError('Error al crear la jornada: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPartido = async (partidoId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este partido?')) {
      return;
    }

    try {
      setLoading(true);
      await eliminarPartido(partidoId);
      await cargarPartidos(jornadaSeleccionada);
      await cargarEquiposDisponibles(jornadaSeleccionada);
      alert('✅ Partido eliminado exitosamente');
    } catch (err) {
      setError('Error al eliminar el partido: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPartido = async () => {
    if (!nuevoPartido.equipo_local || !nuevoPartido.equipo_visitante) {
      alert('Selecciona ambos equipos');
      return;
    }

    if (nuevoPartido.equipo_local === nuevoPartido.equipo_visitante) {
      alert('No puedes seleccionar el mismo equipo como local y visitante');
      return;
    }

    try {
      setLoading(true);
      await crearPartido({
        jornada: jornadaSeleccionada,
        equipo_local: nuevoPartido.equipo_local,
        equipo_visitante: nuevoPartido.equipo_visitante,
        fecha: nuevoPartido.fecha || new Date().toISOString().split('T')[0]
      });
      
      // Reset y recargar
      setNuevoPartido({ equipo_local: '', equipo_visitante: '', fecha: '' });
      setCreandoPartido(false);
      await cargarPartidos(jornadaSeleccionada);
      await cargarEquiposDisponibles(jornadaSeleccionada);
      alert('✅ Partido creado exitosamente');
    } catch (err) {
      setError('Error al crear el partido: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const equiposParaLocal = equiposDisponibles.filter(equipo => 
    equipo.id !== nuevoPartido.equipo_visitante
  );

  const equiposParaVisitante = equiposDisponibles.filter(equipo => 
    equipo.id !== nuevoPartido.equipo_local
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Gestión de Jornadas y Partidos</h3>
        <button
          onClick={handleCrearJornada}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          <Plus size={16} />
          Crear Jornada
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Selector de Jornadas */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Jornada:
        </label>
        <select
          value={jornadaSeleccionada || ''}
          onChange={(e) => {
            setJornadaSeleccionada(Number(e.target.value));
            setCreandoPartido(false);
          }}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecciona una jornada</option>
          {jornadas.map((jornada) => (
            <option key={jornada.id} value={jornada.id}>
              Jornada {jornada.numero}
            </option>
          ))}
        </select>
      </div>

      {/* Información de disponibilidad */}
      {jornadaSeleccionada && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Equipos disponibles:</strong> {equiposDisponibles.length}
            {equiposDisponibles.length < 2 && ' (Se necesitan al menos 2 equipos para crear un partido)'}
          </p>
        </div>
      )}

      {/* Botón para crear partido */}
      {jornadaSeleccionada && equiposDisponibles.length >= 2 && (
        <div className="mb-6">
          <button
            onClick={() => setCreandoPartido(!creandoPartido)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Calendar size={16} />
            {creandoPartido ? 'Cancelar' : 'Crear Partido'}
          </button>
        </div>
      )}

      {/* Formulario de creación */}
      {creandoPartido && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border-2 border-blue-200">
          <h4 className="font-semibold mb-3 text-lg">Crear Nuevo Partido</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Equipo Local */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipo Local *
              </label>
              <select
                value={nuevoPartido.equipo_local}
                onChange={(e) => setNuevoPartido({...nuevoPartido, equipo_local: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona equipo local</option>
                {equiposParaLocal.map(equipo => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipo Visitante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipo Visitante *
              </label>
              <select
                value={nuevoPartido.equipo_visitante}
                onChange={(e) => setNuevoPartido({...nuevoPartido, equipo_visitante: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona equipo visitante</option>
                {equiposParaVisitante.map(equipo => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={nuevoPartido.fecha}
                onChange={(e) => setNuevoPartido({...nuevoPartido, fecha: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCrearPartido}
              disabled={loading || !nuevoPartido.equipo_local || !nuevoPartido.equipo_visitante}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Crear Partido
            </button>
            
            <button
              onClick={() => setCreandoPartido(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Partidos */}
      {loading && partidos.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      ) : partidos.length === 0 ? (
        <div className="text-center py-8 bg-yellow-50 rounded-lg">
          <p className="text-yellow-700">
            {jornadaSeleccionada 
              ? 'No hay partidos en esta jornada.' 
              : 'Selecciona una jornada.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {partidos.map((partido) => (
            <div key={partido.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold">
                    {partido.equipo_local_nombre} vs {partido.equipo_visitante_nombre}
                  </div>
                  <div className="text-sm text-gray-600">
                    {partido.fecha && new Date(partido.fecha).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-center mx-4">
                  <div className="text-xl font-bold">
                    {partido.goles_local ?? '-'} : {partido.goles_visitante ?? '-'}
                  </div>
                </div>
                <button
                  onClick={() => handleEliminarPartido(partido.id)}
                  className="bg-red-600 text-white p-2 rounded hover:bg-red-700"
                  title="Eliminar partido"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JornadasPanel;