import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

const PujaModal = ({
  mostrarModalPuja,
  modoEdicionPuja,
  jugadorSeleccionado,
  pujaEditando,
  montoPuja,
  loadingPuja,
  handleChangeMontoPuja,
  confirmarPuja,
  cerrarModalPuja,
  formatValue,
  formatNumber,
  datosUsuario
}) => {
  // Obtener presupuesto de forma robusta
  const obtenerPresupuesto = () => {
    if (datosUsuario?.equipo?.presupuesto !== undefined && datosUsuario?.equipo?.presupuesto !== null) {
      return datosUsuario.equipo.presupuesto;
    }
    if (datosUsuario?.presupuesto !== undefined && datosUsuario?.presupuesto !== null) {
      return datosUsuario.presupuesto;
    }
    if (datosUsuario?.equipo_presupuesto !== undefined && datosUsuario?.equipo_presupuesto !== null) {
      return datosUsuario.equipo_presupuesto;
    }
    return 0;
  };

  const presupuestoActual = obtenerPresupuesto();

  // 🆕 FUNCIÓN CORREGIDA para manejar el input
  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // Permitir solo números y eliminar puntos existentes para el cálculo
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Actualizar el estado con el valor numérico
    if (handleChangeMontoPuja) {
      handleChangeMontoPuja(numericValue);
    } else {
      console.error('❌ handleChangeMontoPuja no está definido');
    }
  };

  // 🆕 Calcular valor formateado para mostrar
  const displayValue = montoPuja ? formatNumber(montoPuja) : '';

  // 🆕 Obtener información del jugador actual
  const nombreJugador = modoEdicionPuja 
    ? pujaEditando?.jugador_nombre 
    : jugadorSeleccionado?.nombre;
  
  const posicionJugador = modoEdicionPuja 
    ? pujaEditando?.jugador_posicion 
    : jugadorSeleccionado?.posicion;
  
  const equipoRealJugador = modoEdicionPuja 
    ? pujaEditando?.jugador_equipo_real_nombre 
    : jugadorSeleccionado?.equipo_real_nombre;
  
  const valorJugador = modoEdicionPuja 
    ? (pujaEditando?.valor_jugador || pujaEditando?.monto) 
    : jugadorSeleccionado?.valor;
  
  const puntosJugador = modoEdicionPuja 
    ? pujaEditando?.puntos_jugador 
    : jugadorSeleccionado?.puntos_totales;

  // 🆕 Calcular precio mínimo según tipo de venta
  const getPrecioMinimo = () => {
    if (modoEdicionPuja && pujaEditando) {
      return Math.max(
        (pujaEditando.valor_jugador || 0) + 1,
        (pujaEditando.monto || 0) + 1
      );
    } else if (jugadorSeleccionado) {
      // Si es venta de usuario usar precio_venta, sino valor + 1
      if (jugadorSeleccionado.tipo === 'venta_usuario' && jugadorSeleccionado.precio_venta) {
        return jugadorSeleccionado.precio_venta;
      } else {
        return (jugadorSeleccionado.valor || 0) + 1;
      }
    }
    return 0;
  };

  const precioMinimo = getPrecioMinimo();

  // 🆕 Calcular presupuesto restante
  const montoNumerico = montoPuja ? parseInt(montoPuja) : 0;
  const presupuestoRestante = presupuestoActual - montoNumerico;

  if (!mostrarModalPuja) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white p-6">
          <h2 className="text-2xl font-bold">
            {modoEdicionPuja ? 'Editar Puja' : 'Realizar Puja'}
          </h2>
          <p className="text-yellow-100">
            {nombreJugador || 'Jugador no disponible'}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Información del jugador */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="font-semibold text-gray-800">{nombreJugador || 'Nombre no disponible'}</p>
              <p className="text-sm text-gray-600">
                {posicionJugador ? (
                  `${posicionJugador === 'POR' ? 'Portero' : 
                   posicionJugador === 'DEF' ? 'Defensa' : 
                   posicionJugador === 'DEL' ? 'Delantero' : posicionJugador} • 
                  ${equipoRealJugador || 'Libre'}`
                ) : 'Posición no disponible'}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-xs text-gray-500">Valor</div>
                  <div className="font-bold text-green-600 text-lg">
                    {formatValue(valorJugador || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Puntos</div>
                  <div className="font-bold text-purple-600 text-lg">
                    {puntosJugador || 0}
                  </div>
                </div>
              </div>
              
              {modoEdicionPuja && pujaEditando && (
                <>
                  <div className={`text-sm font-semibold mt-2 ${
                    pujaEditando.jugador_en_venta && !pujaEditando.jugador_expirado 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {pujaEditando.jugador_en_venta && !pujaEditando.jugador_expirado 
                      ? '✅ Jugador disponible' 
                      : '❌ Jugador no disponible'}
                  </div>
                  
                  <div className="text-sm font-semibold text-blue-600 mt-2">
                    Puja actual: €{formatNumber(pujaEditando.monto || 0)}
                  </div>
                </>
              )}
            </div>

            {/* Input de monto - CORREGIDO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu oferta (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                  €
                </span>
                <input
                  type="text"
                  value={displayValue}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-lg font-semibold text-right pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                  placeholder={`Mínimo: €${formatNumber(precioMinimo)}`}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1 text-right">
                Puja mínima: €{formatNumber(precioMinimo)}
              </p>
              {jugadorSeleccionado?.tipo === 'venta_usuario' && (
                <p className="text-xs text-green-600 mt-1 text-right">
                  💰 Precio establecido por el vendedor
                </p>
              )}
            </div>

            {/* Información de presupuesto */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Tu presupuesto:</span>
                <span className="font-semibold text-blue-800">
                  €{formatNumber(presupuestoActual)}
                </span>
              </div>
              {montoPuja && !isNaN(montoNumerico) && montoNumerico > 0 && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-blue-700">Presupuesto restante:</span>
                  <span className={`font-semibold ${
                    presupuestoRestante < 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    €{formatNumber(presupuestoRestante)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones - fuera del scroll */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            <button
              onClick={cerrarModalPuja}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarPuja}
              disabled={loadingPuja || !montoPuja || montoPuja === '0' || montoNumerico < precioMinimo || (
                modoEdicionPuja && 
                pujaEditando && 
                (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado)
              )}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                modoEdicionPuja && 
                pujaEditando && 
                (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado)
                  ? 'Este jugador ya no está disponible'
                  : montoNumerico < precioMinimo
                  ? `La puja debe ser al menos €${formatNumber(precioMinimo)}`
                  : undefined
              }
            >
              <DollarSign size={20} />
              {loadingPuja ? 'Procesando...' : (modoEdicionPuja ? 'Confirmar Edición' : 'Confirmar Puja')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PujaModal;