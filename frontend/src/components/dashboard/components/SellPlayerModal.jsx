import React from 'react';
import { X, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const SellPlayerModal = ({
  jugadorSeleccionado,
  equipo,
  precioVenta,
  setPrecioVenta,
  onCancel,
  onConfirm,
  cargando,
  formatValue,
  formatNumber
}) => {
  const valorActual = jugadorSeleccionado?.valor || 0;

  const handlePrecioChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setPrecioVenta(value);
  };

  const mostrarAdvertenciaTitular = !jugadorSeleccionado?.en_banquillo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Poner en el Mercado</h2>
            <button
              onClick={onCancel}
              className="text-white hover:text-green-200"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-green-100 mt-2">
            {jugadorSeleccionado?.nombre}
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Información del jugador */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <DollarSign className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{jugadorSeleccionado?.nombre}</p>
                  <p className="text-sm text-gray-600">
                    {jugadorSeleccionado?.posicion} • {jugadorSeleccionado?.equipo_real_nombre}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-xs text-gray-500">Valor actual</div>
                  <div className="font-bold text-green-600 text-lg">
                    {formatValue(valorActual)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Puntos totales</div>
                  <div className="font-bold text-purple-600 text-lg">
                    {jugadorSeleccionado?.puntos_totales || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Advertencia para titulares */}
            {mostrarAdvertenciaTitular && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-yellow-800">Jugador Titular</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Este jugador es titular. Si lo vendes, quedarás con un hueco en tu alineación.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Input de precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio de venta (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                  €
                </span>
                <input
                  type="text"
                  value={precioVenta ? formatNumber(precioVenta) : ''}
                  onChange={handlePrecioChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-lg font-semibold text-right pl-10"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                disabled={cargando}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={cargando || !precioVenta}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <DollarSign size={20} />
                    Poner en el Mercado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellPlayerModal;