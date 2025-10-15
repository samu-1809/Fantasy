import React, { useState } from 'react';
import { DollarSign, Clock, Edit2 } from 'lucide-react';

const OfertasRealizadasTab = ({
  ofertasRealizadas = [],
  pujasRealizadas = [],
  mercado = [],
  handleEditarPuja,
  handleRetirarPuja,
  handleRetirarOferta,
  handleEditarOferta, // 🆕 Nueva prop
  formatNormalValue,
  totalJugadores = 0,
  maxJugadores = 13,
  equipoId
}) => {
  const [editando, setEditando] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');

  if (!equipoId) {
    return (
      <div className="text-center text-red-500 py-8">
        <p className="text-lg mb-2">❌ Error: No se pudo identificar tu equipo</p>
      </div>
    );
  }

  // 🆕 Función para iniciar edición
  const iniciarEdicion = (item, tipo, montoActual) => {
    setEditando({ id: item.id, tipo, montoActual });
    setNuevoMonto(montoActual.toString());
  };

  // 🆕 Función para cancelar edición
  const cancelarEdicion = () => {
    setEditando(null);
    setNuevoMonto('');
  };

  // 🆕 Función para confirmar edición
  const confirmarEdicion = async () => {
    if (!nuevoMonto || isNaN(nuevoMonto) || parseFloat(nuevoMonto) <= editando.montoActual) {
      alert('El monto debe ser un número válido y mayor al actual');
      return;
    }

    try {
      if (editando.tipo === 'puja') {
        await handleEditarPuja(editando.id, parseFloat(nuevoMonto));
      } else {
        await handleEditarOferta(editando.id, parseFloat(nuevoMonto));
      }
      cancelarEdicion();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // 🆕 Filtrar pujas activas (con fallback seguro)
  const pujasActivas = pujasRealizadas.filter(puja => 
    puja.activa !== false && // Si existe el campo, filtrar por él
    !puja.es_ganadora
  );

  const tieneOfertas = ofertasRealizadas.length > 0;
  const tienePujas = pujasActivas.length > 0;

  if (!tieneOfertas && !tienePujas) {
    return (
      <div className="text-center text-gray-500 py-8">
        <DollarSign className="mx-auto mb-4" size={48} />
        <p className="text-lg mb-2">No has realizado ofertas ni pujas</p>
        <p className="text-sm">Realiza ofertas o pujas por jugadores en el mercado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tieneOfertas && (
        <div>
          <h4 className="font-semibold text-lg mb-3 text-blue-600">📨 Ofertas Enviadas</h4>
          <div className="space-y-3">
            {ofertasRealizadas.map((oferta) => (
              <div key={`oferta-${oferta.id}`} className={`p-4 bg-white rounded border-2 ${
                oferta.estado === 'aceptada' ? 'border-green-200' :
                oferta.estado === 'rechazada' ? 'border-red-200' : 'border-yellow-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg">{oferta.jugador_nombre}</div>
                    <div className="text-sm text-gray-600">
                      {oferta.jugador_posicion} • {oferta.jugador_equipo}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-xl ${
                      oferta.estado === 'aceptada' ? 'text-green-600' :
                      oferta.estado === 'rechazada' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {formatNormalValue(oferta.monto)}
                    </div>
                    <div className={`text-sm font-medium ${
                      oferta.estado === 'pendiente' ? 'text-green-600' :
                      oferta.estado === 'aceptada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {oferta.estado === 'pendiente' ? '🟡 Pendiente' :
                       oferta.estado === 'aceptada' ? '✅ Aceptada' : '❌ Rechazada'}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  <Clock size={14} className="inline mr-1" />
                  {new Date(oferta.fecha_oferta).toLocaleDateString()}
                </div>

                {/* 🆕 Botones para ofertas pendientes */}
                {oferta.estado === 'pendiente' && (
                  <div className="mt-3 flex justify-end gap-2">
                    {editando && editando.tipo === 'oferta' && editando.id === oferta.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={nuevoMonto}
                          onChange={(e) => setNuevoMonto(e.target.value)}
                          className="px-2 py-1 border rounded w-32"
                          placeholder="Nuevo monto"
                          min={oferta.monto + 100000}
                          step={100000}
                        />
                        <button 
                          onClick={confirmarEdicion}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={cancelarEdicion}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                        >
                          ❌
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => iniciarEdicion(oferta, 'oferta', oferta.monto)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 transition-colors"
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button 
                          onClick={() => handleRetirarOferta(oferta.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2 transition-colors"
                        >
                          <span>❌</span>
                          Retirar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tienePujas && (
        <div>
          <h4 className="font-semibold text-lg mb-3 text-yellow-600">💰 Pujas Activas</h4>
          <div className="space-y-3">
            {pujasActivas.map((puja) => {
              // 🆕 Detección más robusta de pujas expiradas
              const expirada = puja.jugador_expirado || 
                              !puja.jugador_en_venta || 
                              (puja.jugador && !puja.jugador.en_venta);
              
              return (
                <div key={`puja-${puja.id}`} className={`p-4 bg-white rounded border-2 ${
                  expirada ? 'border-gray-200' : 'border-yellow-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg">{puja.jugador_nombre}</div>
                      <div className="text-sm text-gray-600">
                        {puja.jugador_posicion} • {puja.jugador_equipo_real_nombre}
                      </div>
                      <div className={`text-xs mt-1 ${
                        puja.es_ganadora ? 'text-green-600' : 
                        expirada ? 'text-gray-500' : 'text-yellow-600'
                      }`}>
                        {puja.es_ganadora ? '🎉 Puja ganadora' : 
                         expirada ? '⏰ Subasta expirada' : '⏳ Subasta en curso'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-600 font-bold text-xl">
                        {formatNormalValue(puja.monto)}
                      </div>
                      <div className="text-sm text-gray-500">Tu puja actual</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-500">
                      <Clock size={14} className="inline mr-1" />
                      {new Date(puja.fecha_puja).toLocaleDateString()}
                    </div>
                    {!puja.es_ganadora && !expirada && (
                      <div className="flex gap-2">
                        {editando && editando.tipo === 'puja' && editando.id === puja.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              value={nuevoMonto}
                              onChange={(e) => setNuevoMonto(e.target.value)}
                              className="px-2 py-1 border rounded w-32"
                              placeholder="Nuevo monto"
                              min={puja.monto + 100000}
                              step={100000}
                            />
                            <button 
                              onClick={confirmarEdicion}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                            >
                              ✅
                            </button>
                            <button 
                              onClick={cancelarEdicion}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => iniciarEdicion(puja, 'puja', puja.monto)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 transition-colors"
                            >
                              <Edit2 size={14} />
                              Editar
                            </button>
                            <button 
                              onClick={() => handleRetirarPuja(puja.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2 transition-colors"
                            >
                              <span>❌</span>
                              Retirar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h5 className="font-semibold text-blue-800 mb-1">Información sobre pujas</h5>
            <p className="text-sm text-blue-700">
              <strong>Pujas activas:</strong> {pujasActivas.filter(p => !p.es_ganadora && !p.jugador_expirado).length}<br/>
              <strong>Pujas permitidas:</strong> {Math.max(0, maxJugadores - totalJugadores)}<br/>
              <strong>Espacio en plantilla:</strong> {maxJugadores - totalJugadores} jugadores
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfertasRealizadasTab;