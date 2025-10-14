import React from 'react';
import { X, DollarSign, RefreshCw, TrendingDown } from 'lucide-react';
import MiniGrafico from '../../market/components/MiniGrafico';

const PlayerOptionsModal = ({ 
  jugadorSeleccionado, 
  onClose, 
  onSell, 
  onExchange, 
  onRemoveFromMarket 
}) => {
  const formatValue = (value) => {
    if (!value) return '€0.0M';
    return `€${(value / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
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
          <p className="text-blue-100 mt-2 text-lg">
            {jugadorSeleccionado.posicion} • {formatValue(jugadorSeleccionado.valor)} • {jugadorSeleccionado.equipo_real_nombre}
          </p>
          <div className="flex items-center gap-4 mt-3 text-base">
            <span className="bg-white/20 px-3 py-1 rounded">
              Puntos totales: <strong>{jugadorSeleccionado.puntos_totales}</strong>
            </span>
            {jugadorSeleccionado.en_venta && (
              <span className="bg-orange-500 px-3 py-1 rounded">
                EN VENTA
              </span>
            )}
            <span className="bg-white/20 px-3 py-1 rounded">
              {jugadorSeleccionado.en_banquillo ? 'Suplente' : 'Titular'}
            </span>
          </div>
        </div>

        {/* Sección del Mini Gráfico */}
        <div className="p-6 border-b border-gray-200">
          <MiniGrafico puntuaciones={jugadorSeleccionado.puntuaciones_jornadas} />
        </div>

        {/* Botones de Acción CONDICIONALES MEJORADOS */}
        <div className="p-6 space-y-4">
          {/* CASO 1: Jugador del banquillo EN VENTA - solo Quitar del Mercado y Cancelar */}
          {jugadorSeleccionado.en_banquillo && jugadorSeleccionado.en_venta && (
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

          {/* CASO 2: Jugador del banquillo NO en venta - Poner en Venta, Cambiar y Cancelar */}
          {jugadorSeleccionado.en_banquillo && !jugadorSeleccionado.en_venta && (
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

          {/* CASO 3: Jugador TITULAR - solo Cambiar y Cancelar */}
          {!jugadorSeleccionado.en_banquillo && (
            <>
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