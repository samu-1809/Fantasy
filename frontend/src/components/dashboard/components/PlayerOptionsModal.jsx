import { X, DollarSign, RefreshCw, TrendingDown, Users } from 'lucide-react';
import MiniGrafico from '../../market/components/MiniGrafico';

const PlayerOptionsModal = ({ 
  jugadorSeleccionado, 
  onClose, 
  onSell, 
  onExchange, 
  onRemoveFromMarket,
  formatValue,
  formatNumber 
}) => {
  
  const getBadgeColor = (pts) => {
    if (pts > 0) return 'bg-green-500';
    if (pts < 0) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getEtiquetaPosicion = (posicion) => {
    const etiquetas = {
      'POR': 'POR',
      'DEF': 'DEF', 
      'DEL': 'ATA' 
    };
    return etiquetas[posicion] || posicion;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* MODAL MÁS ANCHO: Cambiado de max-w-lg a max-w-2xl */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header del Modal */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">{jugadorSeleccionado.nombre}</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* CONTENEDOR MÁS ANCHO para información del jugador */}
          <div className="flex items-center justify-between mt-4 px-4">
            {/* Badge de posición */}
            <div className="bg-white/20 text-white text-lg font-bold px-4 py-2 rounded">
              {getEtiquetaPosicion(jugadorSeleccionado.posicion)}
            </div>
            
            {/* Icono y puntos */}
            <div className="relative">
              <Users size={64} className="text-white drop-shadow-lg" />
              <div className={`absolute -top-1 -right-1 ${getBadgeColor(jugadorSeleccionado.puntos_totales)} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-white`}>
                {jugadorSeleccionado.puntos_totales}
              </div>
            </div>
            
            {/* DETALLES MÁS AMPLIOS */}
            <div className="text-white text-center">
              <div className="font-bold text-xl">{formatValue(jugadorSeleccionado.valor)}</div>
              <div className="text-blue-100 text-lg mt-1">{jugadorSeleccionado.equipo_real_nombre}</div>
            </div>
          </div>

          {/* Estados */}
          <div className="flex items-center justify-center gap-4 mt-4 text-base">
            {jugadorSeleccionado.en_venta && (
              <span className="bg-orange-500 px-4 py-2 rounded text-lg">
                EN VENTA
              </span>
            )}
            <span className="bg-white/20 px-4 py-2 rounded text-lg">
              {jugadorSeleccionado.en_banquillo ? 'Suplente' : 'Titular'}
            </span>
          </div>
        </div>

        {/* SECCIÓN DEL GRÁFICO MÁS ANCHA */}
        <div className="p-6 border-b border-gray-200">
          <div className="w-full">
            <MiniGrafico puntuaciones={jugadorSeleccionado.puntuaciones_jornadas} />
          </div>
        </div>

        {/* 🆕 BOTONES DE ACCIÓN ACTUALIZADOS - Permitir venta de titulares */}
        <div className="p-6 space-y-4">
          {/* CASO 1: Jugador EN VENTA (tanto titular como suplente) - solo Quitar del Mercado y Cancelar */}
          {jugadorSeleccionado.en_venta && (
            <>
              <button
                onClick={onRemoveFromMarket}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 text-lg"
              >
                <TrendingDown size={24} />
                Quitar del Mercado
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-500 text-white py-4 rounded-xl font-semibold hover:bg-gray-600 transition-colors text-lg"
              >
                Cancelar
              </button>
            </>
          )}

          {/* CASO 2: Jugador NO en venta - Poner en Venta, Cambiar y Cancelar (tanto titular como suplente) */}
          {!jugadorSeleccionado.en_venta && (
            <>
              <button
                onClick={onSell}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 text-lg"
              >
                <DollarSign size={24} />
                Poner en Venta
              </button>
              <button
                onClick={onExchange}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 text-lg"
              >
                <RefreshCw size={24} />
                Cambiar con otro jugador
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-500 text-white py-4 rounded-xl font-semibold hover:bg-gray-600 transition-colors text-lg"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerOptionsModal;