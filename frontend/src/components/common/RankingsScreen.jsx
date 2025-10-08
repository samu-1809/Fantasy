import React, { useState, useEffect } from 'react';
import { Trophy, Search, Users, TrendingUp } from 'lucide-react';
import { getClasificacion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RankingsScreen = ({ datosUsuario }) => {
  const [clasificacion, setClasificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    cargarClasificacion();
  }, []);

  const cargarClasificacion = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClasificacion();
      setClasificacion(data);
    } catch (err) {
      setError('Error cargando la clasificación');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  const clasificacionFiltrada = clasificacion.filter(item =>
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.usuario.toLowerCase().includes(busqueda.toLowerCase())
  );

  const miEquipoPosicion = clasificacion.findIndex(e => e.equipo_id === datosUsuario?.equipo?.id) + 1;
  const miEquipo = clasificacion.find(e => e.equipo_id === datosUsuario?.equipo?.id);

  // Calcular estadísticas
  const estadisticas = {
    totalEquipos: clasificacion.length,
    promedioPuntos: clasificacion.length > 0 ? 
      Math.round(clasificacion.reduce((sum, item) => sum + item.puntos_totales, 0) / clasificacion.length) : 0,
    equipoConMasPuntos: clasificacion.length > 0 ? 
      clasificacion.reduce((max, item) => item.puntos_totales > max.puntos_totales ? item : max) : null
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando clasificación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg text-center max-w-md">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button 
            onClick={cargarClasificacion}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {/* Header con estadísticas */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Trophy className="text-yellow-300" size={32} />
                Clasificación
              </h1>
              <p className="text-blue-100">
                {datosUsuario?.ligaActual?.nombre || 'Liga Principal'} • 
                Jornada {datosUsuario?.ligaActual?.jornada_actual || 1} de 30
                {miEquipoPosicion > 0 && ` • Tu posición: ${miEquipoPosicion}º`}
              </p>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{estadisticas.totalEquipos}</div>
                <div className="text-blue-200">Equipos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{estadisticas.promedioPuntos}</div>
                <div className="text-blue-200">Avg pts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda y controles */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Buscar equipo o manager..."
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={cargarClasificacion}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Información de mi equipo */}
        {miEquipo && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Tu Equipo: {miEquipo.nombre}</h3>
                <p className="text-green-100">Posición {miEquipoPosicion}º de {clasificacion.length}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{miEquipo.puntos_totales} pts</div>
                <div className="text-green-200">{formatValue(miEquipo.presupuesto)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de clasificación */}
        <div className="bg-white rounded-lg shadow border-2 border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="p-4 font-semibold text-gray-700 text-left">Pos</th>
                  <th className="p-4 font-semibold text-gray-700 text-left">Equipo</th>
                  <th className="p-4 font-semibold text-gray-700 text-left">Manager</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Puntos</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Presupuesto</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Jugadores</th>
                </tr>
              </thead>
              <tbody>
                {clasificacionFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      <Users size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>No se encontraron equipos que coincidan con la búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  clasificacionFiltrada.map((item, index) => {
                    const esMiEquipo = item.equipo_id === datosUsuario?.equipo?.id;
                    const esTop3 = item.posicion <= 3;
                    
                    return (
                      <tr 
                        key={item.equipo_id} 
                        className={`border-b border-gray-200 transition-colors ${
                          esMiEquipo 
                            ? 'bg-blue-50 hover:bg-blue-100' 
                            : esTop3
                              ? 'bg-yellow-50 hover:bg-yellow-100'
                              : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-4 font-bold">
                          <div className="flex items-center gap-2">
                            {item.posicion}
                            {esTop3 && (
                              <Trophy className={`${
                                item.posicion === 1 ? 'text-yellow-500' :
                                item.posicion === 2 ? 'text-gray-400' :
                                'text-amber-600'
                              }`} size={16} />
                            )}
                            {esMiEquipo && !esTop3 && (
                              <span className="text-blue-500 text-sm">⭐</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">
                          <div className="flex items-center gap-2">
                            {item.nombre}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{item.usuario}</td>
                        <td className="p-4 text-right">
                          <div className="font-bold text-green-600">{item.puntos_totales}</div>
                        </td>
                        <td className="p-4 text-right text-blue-600 font-medium">
                          {formatValue(item.presupuesto)}
                        </td>
                        <td className="p-4 text-right text-gray-600">
                          {item.total_jugadores || 0}/13
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Tu equipo</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500" size={16} />
              <span>Posiciones de podio</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-green-500" size={16} />
              <span>Total equipos: {clasificacion.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankingsScreen;