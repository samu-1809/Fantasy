import React, { useState, useEffect } from 'react';
import { getClasificacion } from '../../services/api';

const RankingsScreen = ({ datosUsuario, onTeamClick }) => {
  const [clasificacion, setClasificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarClasificacion = async () => {
      if (!datosUsuario?.ligaActual?.id) {
        setError('No se pudo cargar la información de la liga');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getClasificacion(datosUsuario.ligaActual.id);
        console.log('📊 Datos de clasificación recibidos:', data);
        setClasificacion(data);
      } catch (err) {
        console.error('❌ Error cargando clasificación:', err);
        setError('Error al cargar la clasificación: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarClasificacion();
  }, [datosUsuario]);

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  // 🎯 FUNCIÓN MEJORADA: Verificar y manejar el clic en equipos
  const handleTeamClick = (equipo) => {
    console.log('🎯 Team clickeado en Rankings:', {
      equipo_id: equipo.equipo_id,
      id: equipo.id,
      nombre: equipo.nombre
    });

    // 🎯 CORREGIDO: Usar el ID correcto del equipo
    const equipoId = equipo.id || equipo.equipo_id;
    
    if (!equipoId) {
      console.error('❌ No se pudo determinar el ID del equipo:', equipo);
      return;
    }

    console.log('🔄 Navegando a equipo con ID:', equipoId);
    onTeamClick(equipoId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-center mt-2">Cargando clasificación...</p>
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
      <h1 className="text-2xl font-bold mb-6">Clasificación</h1>
      
      {clasificacion.length === 0 ? (
        <p className="text-gray-500 text-center">No hay datos de clasificación disponibles</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puntos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clasificacion.map((equipo, index) => (
                <tr key={equipo.id || equipo.equipo_id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {equipo.posicion || index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {/* 🎯 CORREGIDO: Pasar el objeto equipo completo a handleTeamClick */}
                    <button
                      onClick={() => handleTeamClick(equipo)}
                      className="text-blue-600 hover:text-blue-900 font-medium transition-colors hover:underline"
                    >
                      {equipo.nombre}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {equipo.usuario || equipo.usuario_username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                    {equipo.puntos_totales || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(equipo.presupuesto || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RankingsScreen;