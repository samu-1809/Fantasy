// components/common/real-teams/TeamModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Euro, Target } from 'lucide-react';
import { getJugadoresPorEquipoReal } from '../../services/api';

const TeamModal = ({ equipo, onClose, coloresPosiciones, nombresPosiciones }) => {
  const [jugadoresEquipo, setJugadoresEquipo] = useState([]);
  const [loadingJugadores, setLoadingJugadores] = useState(false);

  useEffect(() => {
    const cargarJugadoresEquipo = async () => {
      try {
        setLoadingJugadores(true);
        const data = await getJugadoresPorEquipoReal(equipo.id);
        setJugadoresEquipo(data.jugadores || []);
      } catch (err) {
        console.error('Error cargando jugadores:', err);
      } finally {
        setLoadingJugadores(false);
      }
    };

    if (equipo) {
      cargarJugadoresEquipo();
    }
  }, [equipo]);

  // Calcular estadísticas del equipo
  const estadisticasEquipo = {
    totalJugadores: jugadoresEquipo.length,
    totalValor: jugadoresEquipo.reduce((sum, jugador) => sum + (jugador.valor || 0), 0),
    totalPuntos: jugadoresEquipo.reduce((sum, jugador) => sum + (jugador.puntos_totales || 0), 0),
    porPosicion: {
      POR: jugadoresEquipo.filter(j => j.posicion === 'POR').length,
      DEF: jugadoresEquipo.filter(j => j.posicion === 'DEF').length,
      DEL: jugadoresEquipo.filter(j => j.posicion === 'DEL').length,
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 sticky top-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{equipo.nombre}</h2>
                <p className="text-sm opacity-80">Plantilla de jugadores</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <div className="text-lg font-bold">{estadisticasEquipo.totalJugadores}</div>
              <div className="text-xs opacity-80">Jugadores</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <div className="text-lg font-bold">€{(estadisticasEquipo.totalValor / 1000000).toFixed(1)}M</div>
              <div className="text-xs opacity-80">Valor Total</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <div className="text-lg font-bold">{estadisticasEquipo.totalPuntos}</div>
              <div className="text-xs opacity-80">Puntos Totales</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingJugadores ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando jugadores...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jugadoresEquipo.map((jugador) => (
                <div 
                  key={jugador.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-green-500 cursor-pointer group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${coloresPosiciones[jugador.posicion] || 'from-gray-500 to-gray-600'} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                    {jugador.posicion?.charAt(0) || 'J'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-800 text-lg group-hover:text-green-700 transition-colors">
                        {jugador.nombre}
                      </h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="bg-gray-200 px-2 py-1 rounded">{nombresPosiciones[jugador.posicion] || jugador.posicion}</span>
                      {jugador.equipo_fantasy_nombre && (
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {jugador.equipo_fantasy_nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Euro size={14} />
                        Valor
                      </div>
                      <div className="font-bold text-gray-800">
                        €{(jugador.valor / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Target size={14} />
                        Puntos
                      </div>
                      <div className="font-bold text-gray-800">
                        {jugador.puntos_totales || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {jugadoresEquipo.length === 0 && (
                <div className="text-center py-8">
                  <Users size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay jugadores</h3>
                  <p className="text-gray-500">Este equipo no tiene jugadores registrados.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>{estadisticasEquipo.totalJugadores} jugadores</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                {estadisticasEquipo.porPosicion.POR} Porteros
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                {estadisticasEquipo.porPosicion.DEF} Defensas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                {estadisticasEquipo.porPosicion.DEL} Delanteros
              </span>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamModal;