// components/real_teams/RealTeamDetailScreen.jsx - Versión simplificada
import React, { useState, useEffect } from 'react';
import { obtenerJugadoresEquipoReal } from '../../services/api';
import MiniGrafico from '../market/components/MiniGrafico';

const RealTeamDetailScreen = ({ equipoRealId, onBack }) => {
  const [equipoData, setEquipoData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatosEquipo = async () => {
      try {
        setCargando(true);
        console.log(`🔄 Cargando datos para equipo real ID: ${equipoRealId}`);
        const data = await obtenerJugadoresEquipoReal(equipoRealId);
        console.log('✅ Datos recibidos:', data);
        setEquipoData(data);
      } catch (err) {
        console.error('❌ Error cargando datos del equipo:', err);
        setError(err.message || 'Error al cargar los datos del equipo');
      } finally {
        setCargando(false);
      }
    };

    if (equipoRealId) {
      cargarDatosEquipo();
    }
  }, [equipoRealId]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando jugadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { jugadores, nombre } = equipoData || {};

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mb-4 flex items-center gap-2"
          >
            ← Volver a Equipos Reales
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {nombre || 'Equipo'}
                </h1>
                <p className="text-gray-600">
                  Plantilla completa del equipo real
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {jugadores?.length || 0} Jugadores
                </p>
                <p className="text-gray-600">Total del plantel</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de jugadores */}
        {jugadores && jugadores.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jugador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posición
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Puntos Totales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rendimiento por Jornada
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jugadores.map((jugador, index) => (
                    <tr key={jugador.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {jugador.nombre?.charAt(0) || 'J'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {jugador.nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              {jugador.equipo_real_nombre}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{jugador.posicion_display}</div>
                        <div className="text-sm text-gray-500">{jugador.posicion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${jugador.valor?.toFixed(1) || '0.0'}M
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-blue-600">
                          {jugador.puntos_totales?.toFixed(1) || '0.0'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-64">
                          <MiniGrafico 
                            puntuaciones={jugador.puntuaciones_jornadas || []} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🥅</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay jugadores en este equipo
            </h3>
            <p className="text-gray-500">
              El equipo no tiene jugadores registrados en el sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTeamDetailScreen;