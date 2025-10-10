// components/PujaModal.jsx
import React from 'react';
import { DollarSign } from 'lucide-react';

const PujaModal = ({
  mostrarModalPuja,
  modoEdicionPuja,
  jugadorSeleccionado,
  pujaEditando,
  montoPuja,
  montoPujaFormateado,
  loadingPuja,
  handleChangeMontoPuja,
  confirmarPuja,
  cerrarModalPuja,
  formatValue,
  formatNumber
}) => {
  if (!mostrarModalPuja) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {modoEdicionPuja ? 'Editar Puja' : 'Realizar Puja'}
        </h3>
        
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="font-semibold">
            {modoEdicionPuja ? pujaEditando?.jugador_nombre : jugadorSeleccionado?.nombre}
          </p>
          <p className="text-sm text-gray-600">
            {modoEdicionPuja ? 
              `${pujaEditando?.jugador_posicion} • ${pujaEditando?.jugador_equipo_real_nombre}` :
              `${jugadorSeleccionado?.posicion === 'POR' ? 'Portero' : 
                jugadorSeleccionado?.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
               ${jugadorSeleccionado?.equipo_real_nombre}`
            }
          </p>
          <p className="text-sm">
            Valor: {formatValue(modoEdicionPuja ? 
              (pujaEditando?.valor_jugador || pujaEditando?.monto) : 
              jugadorSeleccionado?.valor)}
          </p>
          <p className="text-sm">
            Puntos: {modoEdicionPuja ? 
              pujaEditando?.puntos_jugador : 
              jugadorSeleccionado?.puntos_totales}
          </p>
          
          {modoEdicionPuja && (
            <div className={`text-xs font-semibold mt-1 ${
              pujaEditando?.jugador_en_venta && !pujaEditando?.jugador_expirado 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {pujaEditando?.jugador_en_venta && !pujaEditando?.jugador_expirado 
                ? '✅ Jugador disponible' 
                : '❌ Jugador no disponible'}
            </div>
          )}
          
          {modoEdicionPuja && (
            <p className="text-sm font-semibold text-blue-600">
              Puja actual: {formatNumber(pujaEditando?.monto)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tu oferta (€):
          </label>
          <input
            type="text"
            value={montoPujaFormateado}
            onChange={handleChangeMontoPuja}
            className="w-full p-2 border border-gray-300 rounded text-right font-mono"
            placeholder={`Mínimo: ${formatNumber(
              modoEdicionPuja ? 
              Math.max(
                (pujaEditando?.valor_jugador || 0) + 1,
                (pujaEditando?.monto || 0) + 1
              ) : 
              (jugadorSeleccionado?.valor || 0) + 1
            )}`}
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {modoEdicionPuja ? 
              `Puja mínima: ${formatNumber(
                Math.max(
                  (pujaEditando?.valor_jugador || 0) + 1,
                  (pujaEditando?.monto || 0) + 1
                )
              )} (más que el valor del jugador y tu puja actual)` :
              `Puja mínima: ${formatNumber((jugadorSeleccionado?.valor || 0) + 1)} (más que el valor del jugador)`
            }
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={confirmarPuja}
            disabled={loadingPuja || !montoPuja || (
              modoEdicionPuja && 
              pujaEditando && 
              (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado)
            )}
            className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 disabled:bg-yellow-400 flex items-center justify-center gap-2"
            title={
              modoEdicionPuja && 
              pujaEditando && 
              (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado)
                ? 'Este jugador ya no está disponible'
                : undefined
            }
          >
            <DollarSign size={16} />
            {loadingPuja ? 'Procesando...' : (modoEdicionPuja ? 'Confirmar Edición' : 'Confirmar Puja')}
          </button>
          <button
            onClick={cerrarModalPuja}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PujaModal;