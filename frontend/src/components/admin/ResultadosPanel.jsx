import React, { useState, useEffect } from 'react';
import { getJornadas, getPartidosJornada, actualizarResultadoPartido } from '../../services/api';

const ResultadosPanel = () => {
  const [jornadas, setJornadas] = useState([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Cargar jornadas al montar el componente
  useEffect(() => {
    cargarJornadas();
  }, []);

  // Cargar partidos cuando se selecciona una jornada
  useEffect(() => {
    if (jornadaSeleccionada) {
      cargarPartidos(jornadaSeleccionada);
    }
  }, [jornadaSeleccionada]);

  const cargarJornadas = async () => {
    try {
      setLoading(true);
      const data = await getJornadas();
      setJornadas(data);
      
      // Seleccionar primera jornada si existe
      if (data.length > 0 && !jornadaSeleccionada) {
        setJornadaSeleccionada(data[0].id);
      }
    } catch (err) {
      console.error('❌ Error cargando jornadas:', err);
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
      console.error('❌ Error cargando partidos:', err);
      setError('Error al cargar los partidos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResultadoChange = (partidoId, campo, valor) => {
    const partidoActualizado = partidos.map(partido => 
      partido.id === partidoId 
        ? { ...partido, [campo]: valor === '' ? null : parseInt(valor) || 0 }
        : partido
    );
    setPartidos(partidoActualizado);
  };

  const guardarResultados = async () => {
    try {
      setGuardando(true);
      
      for (const partido of partidos) {
        if (partido.goles_local !== null || partido.goles_visitante !== null) {
          const updateData = {};
          
          if (partido.goles_local !== null) {
            updateData.goles_local = partido.goles_local;
          }
          
          if (partido.goles_visitante !== null) {
            updateData.goles_visitante = partido.goles_visitante;
          }
          
          // 🎯 Marcar como jugado si se actualizan ambos goles
          if (partido.goles_local !== null && partido.goles_visitante !== null) {
            updateData.jugado = true;
          }
          
          await actualizarResultadoPartido(partido.id, updateData);
        }
      }
      
      alert('✅ Resultados guardados exitosamente');
      await cargarPartidos(jornadaSeleccionada);
    } catch (err) {
      console.error('❌ Error guardando resultados:', err);
      setError('Error al guardar los resultados: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-6">Gestión de Resultados</h3>

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
          onChange={(e) => setJornadaSeleccionada(Number(e.target.value))}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="">Selecciona una jornada</option>
          {jornadas.map((jornada) => (
            <option key={jornada.id} value={jornada.id}>
              Jornada {jornada.numero}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando partidos...</p>
        </div>
      ) : partidos.length === 0 ? (
        <div className="text-center py-8 bg-yellow-50 rounded-lg">
          <p className="text-yellow-700">
            {jornadaSeleccionada 
              ? 'No hay partidos para esta jornada.' 
              : 'Selecciona una jornada para gestionar resultados.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 mb-6">
            {partidos.map((partido) => (
              <div key={partido.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  {/* Equipo Local */}
                  <div className="flex-1 text-right">
                    <div className="font-semibold">{partido.equipo_local_nombre}</div>
                    <input
                      type="number"
                      min="0"
                      value={partido.goles_local ?? ''}
                      onChange={(e) => handleResultadoChange(partido.id, 'goles_local', e.target.value)}
                      className="w-16 text-center border border-gray-300 rounded mt-1"
                      placeholder="0"
                    />
                  </div>

                  {/* Separador */}
                  <div className="mx-4 text-gray-500 font-bold">VS</div>

                  {/* Equipo Visitante */}
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{partido.equipo_visitante_nombre}</div>
                    <input
                      type="number"
                      min="0"
                      value={partido.goles_visitante ?? ''}
                      onChange={(e) => handleResultadoChange(partido.id, 'goles_visitante', e.target.value)}
                      className="w-16 text-center border border-gray-300 rounded mt-1"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Información adicional */}
                <div className="text-center mt-2 text-sm text-gray-600">
                  {partido.fecha && `Fecha: ${new Date(partido.fecha).toLocaleDateString()}`}
                </div>
              </div>
            ))}
          </div>

          {/* Botón para guardar resultados */}
          <div className="flex justify-end">
            <button
              onClick={guardarResultados}
              disabled={guardando || partidos.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                '💾 Guardar Todos los Resultados'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultadosPanel;