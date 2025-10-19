import { X } from 'lucide-react';
import MiniGrafico from '../../components/market/components/MiniGrafico';

const PlayerModal = ({ 
  jugador, 
  onClose, 
  coloresPosiciones, 
  nombresPosiciones, 
  loadingPuntuaciones, 
  puntuacionesJugador 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`bg-gradient-to-r ${coloresPosiciones[jugador.posicion] || 'from-gray-500 to-gray-600'} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {jugador.posicion?.charAt(0) || 'J'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{jugador.nombre}</h2>
                <p className="text-sm opacity-80">
                  {nombresPosiciones[jugador.posicion] || jugador.posicion}
                  {jugador.equipo_real_nombre && ` • ${jugador.equipo_real_nombre}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

       <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mx-4 my-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {/* Valor - Tarjeta Azul */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-sm font-medium text-blue-100">Valor de Mercado</div>
            </div>
            <div className="text-2xl font-bold text-white drop-shadow-sm">
              €{(jugador.valor / 1000000).toFixed(1)}M
            </div>
          </div>

          {/* Puntos Totales - Tarjeta Verde */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-white bg-opacity-20 rounded-full">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-sm font-medium text-green-100">Puntos Totales</div>
            </div>
            <div className="text-2xl font-bold text-white drop-shadow-sm">
              {jugador.puntos_totales || 0}
            </div>
          </div>

          {/* Goles - Tarjeta Naranja */}
          {jugador.goles !== undefined && (
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 bg-white bg-opacity-20 rounded-full">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="text-sm font-medium text-orange-100">Goles Anotados</div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-2xl font-bold text-white drop-shadow-sm">
                  {jugador.goles || 0}
                </div>
                <div className="text-xl">⚽</div>
              </div>
            </div>
          )}

          {/* Si no hay goles, mostramos una tarjeta adicional de estadísticas */}
          {jugador.goles === undefined && (
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 bg-white bg-opacity-20 rounded-full">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </div>
                <div className="text-sm font-medium text-purple-100">Rendimiento</div>
              </div>
              <div className="text-2xl font-bold text-white drop-shadow-sm">
                {jugador.puntos_totales > 0 ? '⭐' : '📊'}
              </div>
              <div className="text-xs text-purple-200 mt-1">
                {jugador.puntos_totales > 50 ? 'Excelente' : jugador.puntos_totales > 20 ? 'Bueno' : 'En progreso'}
              </div>
            </div>
          )}
        </div>

        {/* Línea decorativa inferior */}
        <div className="flex justify-center mt-4">
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full"></div>
        </div>
      </div>

        <div className="p-6 border-b border-gray-200">
          {loadingPuntuaciones ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Cargando estadísticas...</p>
            </div>
          ) : puntuacionesJugador && puntuacionesJugador.length > 0 ? (
            <MiniGrafico 
              puntuaciones={puntuacionesJugador}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay datos de puntuaciones disponibles</p>
            </div>
          )}
        </div>

        {jugador.equipo_nombre && (
          <div className="p-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-800">Información Adicional</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Pertenece a:</span>
                <span className="font-medium text-gray-800">{jugador.equipo_nombre}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;