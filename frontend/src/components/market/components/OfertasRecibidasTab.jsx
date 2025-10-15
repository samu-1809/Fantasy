// components/OfertasRecibidasTab.jsx
import React, { useState } from 'react';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { aceptarOferta, rechazarOferta } from '../../../services/api';

const OfertasRecibidasTab = ({
  ofertasRecibidas,
  equipoId,
  datosUsuario,
  user,
  refresh,
  cargarOfertasRecibidas,
  formatNormalValue
}) => {
  const [procesando, setProcesando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  console.log('🔍 DEBUG datosUsuario:', datosUsuario);
  
  const handleAceptar = async (ofertaId) => {
    if (!window.confirm('¿Estás seguro de que quieres aceptar esta oferta? El jugador será transferido.')) {
      return;
    }

    setProcesando(ofertaId);
    setMensaje({ tipo: '', texto: '' });
    
    try {
      const resultado = await aceptarOferta(ofertaId);
      setMensaje({ tipo: 'exito', texto: resultado.mensaje });
      
      // 🆕 Disparar evento para animación de venta en Dashboard
      window.dispatchEvent(new CustomEvent('ofertaAceptadaConExito', {
        detail: {
          jugadorVendido: { 
            nombre: resultado.jugador_nombre || 'Jugador',
            precio: resultado.monto
          }
        }
      }));
      
      setTimeout(() => {
        cargarOfertasRecibidas();
        refresh(); 
      }, 1500);
      
    } catch (error) {
      console.error('Error al aceptar oferta:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: error.message || 'Error al aceptar la oferta. Inténtalo de nuevo.' 
      });
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (ofertaId) => {
    if (!window.confirm('¿Estás seguro de que quieres rechazar esta oferta?')) {
      return;
    }

    setProcesando(ofertaId);
    setMensaje({ tipo: '', texto: '' });
    
    try {
      const resultado = await rechazarOferta(ofertaId);
      setMensaje({ tipo: 'exito', texto: resultado.mensaje });
      
      setTimeout(() => {
        cargarOfertasRecibidas();
      }, 1500);
      
    } catch (error) {
      console.error('Error al rechazar oferta:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: error.message || 'Error al rechazar la oferta. Inténtalo de nuevo.' 
      });
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mensajes de éxito/error */}
      {mensaje.texto && (
        <div className={`p-3 rounded ${
          mensaje.tipo === 'exito' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {ofertasRecibidas.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Users className="mx-auto mb-4" size={48} />
          <p className="text-lg mb-2">No has recibido ofertas</p>
          <p className="text-sm mb-4">
            Equipo: <strong>{datosUsuario?.equipo?.nombre}</strong> (ID: {equipoId})
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded max-w-md mx-auto">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Posibles causas:</strong>
            </p>
            <ul className="text-sm text-yellow-700 text-left space-y-1">
              <li>• No tienes jugadores en venta</li>
              <li>• Nadie ha pujado por tus jugadores</li>
              <li>• Las ofertas pendientes ya fueron respondidas</li>
              <li>• Error de conexión con el servidor</li>
              <li>• El equipo ID no coincide</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-green-50 border border-green-200 p-3 rounded mb-4">
            <p className="text-green-700 font-semibold">
              ✅ Tienes {ofertasRecibidas.length} oferta(s) pendiente(s)
            </p>
          </div>
          
          {ofertasRecibidas.map((oferta) => (
            <div key={oferta.id} className="p-4 bg-white rounded border-2 border-blue-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-lg">{oferta.jugador_nombre}</div>
                  <div className="text-sm text-gray-600">
                    {oferta.jugador_posicion} • {oferta.jugador_equipo}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ofertante: {oferta.equipo_ofertante_nombre}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-bold text-xl">{formatNormalValue(oferta.monto)}</div>
                  <div className="text-sm text-gray-500">
                    {oferta.equipo_ofertante_nombre === 'Mercado' ? '🤖 Oferta automática' : '👤 Oferta de usuario'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-500">
                  <Clock size={14} className="inline mr-1" />
                  {new Date(oferta.fecha_oferta).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAceptar(oferta.id)}
                    disabled={procesando === oferta.id}
                    className={`px-3 py-1 flex items-center gap-1 rounded text-sm transition-all ${
                      procesando === oferta.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {procesando === oferta.id ? (
                      <>⏳ Procesando...</>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Aceptar
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => handleRechazar(oferta.id)}
                    disabled={procesando === oferta.id}
                    className={`px-3 py-1 flex items-center gap-1 rounded text-sm transition-all ${
                      procesando === oferta.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {procesando === oferta.id ? (
                      <>⏳ Procesando...</>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Rechazar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfertasRecibidasTab;