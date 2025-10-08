import React, { useState, useEffect } from 'react';
import { getJornadas, getPartidosJornada } from '../../services/api';

const CalendarScreen = () => {
  const [jornadas, setJornadas] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarJornadas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getJornadas();
        setJornadas(data);
        
        // Seleccionar primera jornada por defecto
        if (data.length > 0) {
          setJornadaSeleccionada(data[0].id);
        }
      } catch (err) {
        console.error('❌ Error cargando jornadas:', err);
        setError('Error al cargar las jornadas: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarJornadas();
  }, []);

  useEffect(() => {
    const cargarPartidos = async () => {
      if (!jornadaSeleccionada) return;

      try {
        setLoading(true);
        const data = await getPartidosJornada(jornadaSeleccionada);
        setPartidos(data);
      } catch (err) {
        console.error('❌ Error cargando partidos:', err);
        setError('Error al cargar los partidos: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarPartidos();
  }, [jornadaSeleccionada]);

  if (loading && jornadas.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-center mt-2">Cargando calendario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendario de Partidos</h1>

      {/* Selector de Jornadas */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Jornada:
        </label>
        <select
          value={jornadaSeleccionada || ''}
          onChange={(e) => setJornadaSeleccionada(Number(e.target.value))}
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

      {/* Lista de Partidos */}
      {partidos.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No hay partidos programados para esta jornada.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partidos.map((partido) => (
            <div key={partido.id} className="bg-white rounded-lg shadow p-4 border">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-500">Jornada {partido.jornada_numero}</div>
                <div className="text-xs text-gray-400">
                  {partido.fecha ? new Date(partido.fecha).toLocaleDateString() : 'Fecha por definir'}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <div className="font-semibold">{partido.equipo_local_nombre}</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {partido.goles_local !== null ? partido.goles_local : '-'}
                  </div>
                </div>
                
                <div className="mx-4 text-gray-500">VS</div>
                
                <div className="text-center flex-1">
                  <div className="font-semibold">{partido.equipo_visitante_nombre}</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {partido.goles_visitante !== null ? partido.goles_visitante : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarScreen;