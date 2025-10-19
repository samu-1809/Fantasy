// components/common/real-teams/StandingsTab.jsx
import React from 'react';
import { Medal, BarChart3 } from 'lucide-react';

const StandingsTab = ({ clasificacion, getColorEquipo }) => {
  // Calcular estadísticas de la clasificación
  const estadisticasClasificacion = {
    totalEquipos: clasificacion.length,
    totalPartidos: clasificacion.reduce((sum, item) => sum + item.partidos_jugados, 0),
    totalGoles: clasificacion.reduce((sum, item) => sum + item.goles_a_favor, 0),
    promedioGoles: clasificacion.length > 0 ? 
      (clasificacion.reduce((sum, item) => sum + item.goles_a_favor, 0) / clasificacion.reduce((sum, item) => sum + item.partidos_jugados, 0)).toFixed(2) : 0
  };

  if (clasificacion.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="text-yellow-600" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay datos de clasificación</h3>
        <p className="text-gray-500">
          No hay datos de clasificación disponibles en este momento
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{estadisticasClasificacion.totalEquipos}</div>
            <div className="text-sm text-green-800">Equipos</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{estadisticasClasificacion.totalPartidos}</div>
            <div className="text-sm text-blue-800">Partidos Jugados</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{estadisticasClasificacion.totalGoles}</div>
            <div className="text-sm text-purple-800">Goles Totales</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{estadisticasClasificacion.promedioGoles}</div>
            <div className="text-sm text-orange-800">Prom. Goles/Partido</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                <th className="py-4 px-6 text-left font-semibold">Pos</th>
                <th className="py-4 px-6 text-left font-semibold">Equipo</th>
                <th className="py-4 px-6 text-center font-semibold">PJ</th>
                <th className="py-4 px-6 text-center font-semibold">PG</th>
                <th className="py-4 px-6 text-center font-semibold">PE</th>
                <th className="py-4 px-6 text-center font-semibold">PP</th>
                <th className="py-4 px-6 text-center font-semibold">GF</th>
                <th className="py-4 px-6 text-center font-semibold">GC</th>
                <th className="py-4 px-6 text-center font-semibold">DG</th>
                <th className="py-4 px-6 text-center font-semibold">PTS</th>
              </tr>
            </thead>
            <tbody>
              {clasificacion.map((item, index) => (
                <tr 
                  key={item.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    index < 8 ? 'bg-green-50 hover:bg-green-100' : 'bg-white'
                  }`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${
                        index === 0 ? 'text-yellow-600 text-lg' :
                        index === 1 ? 'text-gray-600' :
                        index === 2 ? 'text-orange-600' :
                        'text-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                      {index < 3 && (
                        <Medal size={16} className={
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-500'
                        } />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${getColorEquipo(index)} rounded-full flex items-center justify-center text-white font-bold`}>
                        {item.equipo.nombre.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">{item.equipo.nombre}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center font-medium">{item.partidos_jugados}</td>
                  <td className="py-4 px-6 text-center font-medium text-green-600">{item.partidos_ganados}</td>
                  <td className="py-4 px-6 text-center font-medium text-yellow-600">{item.partidos_empatados}</td>
                  <td className="py-4 px-6 text-center font-medium text-red-600">{item.partidos_perdidos}</td>
                  <td className="py-4 px-6 text-center font-medium text-blue-600">{item.goles_a_favor}</td>
                  <td className="py-4 px-6 text-center font-medium text-red-600">{item.goles_en_contra}</td>
                  <td className={`py-4 px-6 text-center font-bold ${
                    item.diferencia_goles > 0 ? 'text-green-600' : 
                    item.diferencia_goles < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {item.diferencia_goles > 0 ? '+' : ''}{item.diferencia_goles}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-2 px-4 rounded-full">
                      {item.puntos}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Clasificados para Playoffs (Top 8)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-gray-300 rounded-full"></div>
              <span>Fuera de Playoffs</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StandingsTab;