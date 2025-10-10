// components/OfertasRecibidasTab.jsx
import React from 'react';
import { Users, Clock } from 'lucide-react';

const OfertasRecibidasTab = ({
  ofertasRecibidas,
  equipoId,
  datosUsuario,
  user,
  refresh,
  cargarOfertasRecibidas,
  formatNormalValue
}) => {
  if (!equipoId) {
    return (
      <div className="text-center text-red-500 py-8">
        <p className="text-lg mb-2">❌ Error: No se pudo identificar tu equipo</p>
        <p className="text-sm">equipoId: {equipoId}</p>
        <p className="text-sm">Usuario: {user?.username}</p>
        <p className="text-sm">Nombre equipo: {datosUsuario?.equipo?.nombre}</p>
        <button 
          onClick={refresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <h4 className="font-bold text-blue-800 mb-2">Información de Ofertas Recibidas</h4>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div><strong>Equipo ID:</strong> {equipoId}</div>
          <div><strong>Nombre:</strong> {datosUsuario?.equipo?.nombre}</div>
          <div><strong>Usuario:</strong> {user?.username}</div>
          <div><strong>Ofertas:</strong> {ofertasRecibidas.length}</div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              try {
                await cargarOfertasRecibidas(equipoId);
              } catch (error) {
                console.error('❌ Error en recarga manual:', error);
              }
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            🔄 Recargar Ofertas
          </button>
          
          <button 
            onClick={() => {
              console.log('🐛 Debug completo del estado:', {
                equipoId,
                datosUsuario,
                user,
                ofertasRecibidas
              });
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            📊 Debug Estado
          </button>
          
          <button 
            onClick={refresh}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            ♻️ Refresh General
          </button>
        </div>
      </div>

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
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Aceptar
                  </button>
                  <button 
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Rechazar
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