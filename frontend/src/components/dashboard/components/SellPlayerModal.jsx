import React from 'react';
import { X } from 'lucide-react';

const SellPlayerModal = ({
  jugadorSeleccionado,
  equipo,
  precioVenta,
  setPrecioVenta,
  onCancel,
  onConfirm,
  cargando
}) => {
  const formatNumber = (number) => {
    if (!number && number !== 0) return '0';
    const num = parseInt(number) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatValue = (value) => {
    if (!value) return '€0.0M';
    return `€${(value / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Poner en Venta</h3>
            <button
              onClick={onCancel}
              className="text-white hover:text-green-200"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-green-100 mt-1">
            {jugadorSeleccionado.nombre} • Valor: {formatValue(jugadorSeleccionado.valor)}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio de venta (€)
            </label>
            <input
              type="number"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value.replace(/[^\d]/g, ''))}
              className="w-full border border-gray-300 rounded-lg p-3 text-lg font-semibold"
              placeholder="Ingresa el precio"
            />
            <p className="text-sm text-gray-500 mt-1">
              Valor actual: €{formatNumber(jugadorSeleccionado.valor || 0)}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Precio mínimo recomendado: €{formatNumber(Math.floor((jugadorSeleccionado.valor || 0) * 0.8))}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Tu presupuesto:</span>
              <span className="font-semibold text-blue-800">
                €{formatNumber(equipo?.presupuesto || 0)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={cargando || !precioVenta}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? 'Procesando...' : 'Confirmar Venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellPlayerModal;