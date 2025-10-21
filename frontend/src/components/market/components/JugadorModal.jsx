import React from 'react';
import { X, Users, Goal } from 'lucide-react';
import MiniGrafico from './MiniGrafico';

const JugadorModal = ({ 
  jugador, 
  onClose, 
  formatValue, 
  formatNumber 
}) => {
  
  // DEPURACIÓN: Mostrar los datos del jugador en consola
  React.useEffect(() => {
    console.log('🔍 Datos del jugador en modal:', jugador);
    console.log('📊 Puntuaciones jornadas:', jugador?.puntuaciones_jornadas);
    console.log('⚽ Goles disponibles:', {
      goles: jugador?.goles,
      estadisticas: jugador?.estadisticas
    });
  }, [jugador]);

  const getBadgeColor = (pts) => {
    if (pts > 0) return 'bg-green-500';
    if (pts < 0) return 'bg-red-500';
    return 'bg-gray-400';
  };

  // Obtener número de goles de forma más robusta
  const goles = jugador?.goles || jugador?.estadisticas?.goles || 0;

  // Verificar si hay datos para el gráfico
  const tieneDatosGrafico = jugador?.puntuaciones_jornadas && 
                           Array.isArray(jugador.puntuaciones_jornadas) && 
                           jugador.puntuaciones_jornadas.length > 0 &&
                           jugador.puntuaciones_jornadas.some(p => p.puntos !== undefined);

  // Función para generar datos de ejemplo si no hay datos reales
  const generarDatosEjemplo = () => {
    return Array.from({ length: 6 }, (_, i) => ({
      jornada_numero: i + 1,
      puntos: Math.floor(Math.random() * 10) + 1
    }));
  };

  const datosGrafico = tieneDatosGrafico ? jugador.puntuaciones_jornadas : generarDatosEjemplo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl sticky top-0">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">{jugador?.nombre || 'Jugador'}</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Información del jugador */}
          <div className="flex items-center justify-between mt-4 px-4">
            {/* Badge de posición */}
            <div className="bg-white/20 text-white text-lg font-bold px-4 py-2 rounded">
              {jugador?.posicion === 'POR' ? 'POR' : 
               jugador?.posicion === 'DEF' ? 'DEF' : 'DEL'}
            </div>
            
            {/* Icono y puntos */}
            <div className="relative">
              <Users size={64} className="text-white drop-shadow-lg" />
              <div className={`absolute -top-1 -right-1 ${getBadgeColor(jugador?.puntos_totales || 0)} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-white`}>
                {jugador?.puntos_totales || 0}
              </div>
            </div>
            
            {/* Detalles */}
            <div className="text-white text-center">
              <div className="font-bold text-xl">{formatValue(jugador?.valor || 0)}</div>
              <div className="text-blue-100 text-lg mt-1">{jugador?.equipo_real_nombre || 'Sin equipo'}</div>
            </div>
          </div>
        </div>

        {/* Sección del Mini Gráfico */}
        <div className="p-6 border-b border-gray-200">
          <div className="w-full">
            {tieneDatosGrafico ? (
                <MiniGrafico puntuaciones={datosGrafico} />
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-700">Rendimiento en Jornadas</h4>
                  <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    Datos de ejemplo
                  </span>
                </div>
                <MiniGrafico puntuaciones={datosGrafico} />
                <p className="text-gray-500 text-xs mt-2">
                  ⚠️ Mostrando datos de ejemplo. Los datos reales no están disponibles.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500">Posición</div>
              <div className="font-semibold">
                {jugador?.posicion === 'POR' ? 'Portero' : 
                 jugador?.posicion === 'DEF' ? 'Defensa' : 
                 jugador?.posicion === 'DEL' ? 'Delantero' : 'Sin definir'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500">Valor de mercado</div>
              <div className="font-semibold">{formatValue(jugador?.valor || 0)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500">Puntos totales</div>
              <div className="font-semibold">{jugador?.puntos_totales || 0}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-500 flex items-center gap-1">
                Goles esta temporada
              </div>
              <div className="font-semibold">{goles}</div>
            </div>
          </div>
        </div>

        {/* Botón de cierre */}
        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default JugadorModal;