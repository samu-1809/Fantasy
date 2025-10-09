import React, { useState } from 'react';
import { X } from 'lucide-react';

const ModalPujarOferta = ({ isOpen, jugador, tipo, presupuesto, equipoId, onClose, onSuccess }) => {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !jugador) return null;

  const esPuja = tipo === 'puja';
  const minimo = esPuja ? (jugador.puja_actual || jugador.valor) + 100000 : jugador.valor;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const montoNumero = Number(monto);

    // Validaciones
    if (!montoNumero || montoNumero <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    if (esPuja && montoNumero <= (jugador.puja_actual || 0)) {
      setError(`La puja debe ser mayor a €${((jugador.puja_actual || 0)/1000000).toFixed(1)}M`);
      return;
    }

    if (montoNumero < minimo) {
      setError(`Monto mínimo: €${(minimo/1000000).toFixed(1)}M`);
      return;
    }

    if (montoNumero > presupuesto) {
      setError(`Presupuesto insuficiente. Disponible: €${(presupuesto/1000000).toFixed(1)}M`);
      return;
    }

    setLoading(true);

    try {
      // Importar dinámicamente la función del API
      const { pujarJugador } = await import('../../services/api');

      const response = await pujarJugador(equipoId, jugador.id, montoNumero);

      onSuccess(response);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleMontoChange = (e) => {
    const value = e.target.value;
    // Permitir solo números
    if (value === '' || /^\d+$/.test(value)) {
      setMonto(value);
      setError('');
    }
  };

  // Conversión rápida de millones
  const setMontoEnMillones = (millones) => {
    setMonto(String(millones * 1000000));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">
            {esPuja ? '💰 Pujar por' : '💸 Hacer Oferta por'} {jugador.nombre}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Jugador */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Posición:</span>
              <span className="font-bold">{jugador.posicion}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Valor Base:</span>
              <span className="font-bold">€{(jugador.valor/1000000).toFixed(1)}M</span>
            </div>
            {esPuja && jugador.puja_actual && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-700">Puja Actual:</span>
                <span className="font-bold text-blue-600">
                  €{(jugador.puja_actual/1000000).toFixed(1)}M
                </span>
              </div>
            )}
          </div>

          {/* Input Monto */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto a {esPuja ? 'pujar' : 'ofertar'} (en €)
            </label>
            <input
              type="text"
              value={monto}
              onChange={handleMontoChange}
              placeholder={`Ej: ${minimo}`}
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Mínimo: €{(minimo/1000000).toFixed(1)}M
            </p>
          </div>

          {/* Botones rápidos */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Atajos rápidos:</p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 6, 7, 8].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMontoEnMillones(m)}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                  disabled={loading}
                >
                  €{m}M
                </button>
              ))}
            </div>
          </div>

          {/* Presupuesto disponible */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-700">
                Presupuesto disponible:
              </span>
              <span className="font-bold text-blue-600">
                €{(presupuesto/1000000).toFixed(1)}M
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 rounded-lg font-medium text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : esPuja
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Procesando...' : esPuja ? '✅ Confirmar Puja' : '📤 Enviar Oferta'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalPujarOferta;
