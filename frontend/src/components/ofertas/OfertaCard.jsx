import React from 'react';
import { Clock, User, TrendingUp } from 'lucide-react';

const estadoColors = {
  pendiente: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    badge: 'bg-yellow-200',
    icon: '🟡'
  },
  aceptada: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-800',
    badge: 'bg-green-200',
    icon: '✅'
  },
  rechazada: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    badge: 'bg-red-200',
    icon: '❌'
  },
  retirada: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-800',
    badge: 'bg-gray-200',
    icon: '🔙'
  },
  expirada: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-600',
    badge: 'bg-gray-200',
    icon: '⏰'
  },
};

const OfertaCard = ({ oferta, tipo, onAceptar, onRechazar, onRetirar }) => {
  const colorInfo = estadoColors[oferta.estado] || estadoColors.pendiente;
  const esRecibida = tipo === 'recibida';

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffHoras < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffHoras < 24) {
      return `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    } else if (diffDias < 7) {
      return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  return (
    <div className={`border-2 rounded-lg p-5 ${colorInfo.bg} ${colorInfo.border} transition-shadow hover:shadow-lg`}>
      {/* Header: Estado y Fecha */}
      <div className="flex justify-between items-start mb-4">
        <span className={`px-3 py-1 rounded-full ${colorInfo.badge} ${colorInfo.text} font-bold text-sm inline-flex items-center gap-1`}>
          <span>{colorInfo.icon}</span>
          <span>{oferta.estado.toUpperCase()}</span>
        </span>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock size={14} />
          <span>{formatearFecha(oferta.fecha_oferta)}</span>
        </div>
      </div>

      {/* Info Jugador */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-1">{oferta.jugador_nombre}</h3>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="font-medium bg-gray-200 px-2 py-1 rounded">
            {oferta.jugador_posicion}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp size={14} />
            Valor: €{(oferta.jugador_valor / 1000000).toFixed(1)}M
          </span>
        </div>
      </div>

      {/* Info Equipos */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-500" />
          {esRecibida ? (
            <>
              <span className="text-sm font-medium text-gray-600">Ofertante:</span>
              <span className="text-sm font-bold text-gray-800">{oferta.equipo_ofertante_nombre}</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-600">Para:</span>
              <span className="text-sm font-bold text-gray-800">{oferta.equipo_receptor_nombre}</span>
            </>
          )}
        </div>
      </div>

      {/* Monto */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Monto ofertado:</p>
        <p className="text-3xl font-bold text-blue-600">
          €{(oferta.monto / 1000000).toFixed(1)}M
        </p>
      </div>

      {/* Fecha de respuesta si existe */}
      {oferta.fecha_respuesta && (
        <div className="mb-4 text-xs text-gray-500">
          Respondida: {new Date(oferta.fecha_respuesta).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}

      {/* Botones de Acción */}
      {oferta.estado === 'pendiente' && (
        <div className="flex gap-2 mt-4">
          {esRecibida ? (
            <>
              {/* Botones para ofertas recibidas */}
              <button
                onClick={onAceptar}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>✅</span>
                <span>Aceptar</span>
              </button>
              <button
                onClick={onRechazar}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>❌</span>
                <span>Rechazar</span>
              </button>
            </>
          ) : (
            <>
              {/* Botón para ofertas realizadas */}
              {onRetirar && (
                <button
                  onClick={onRetirar}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <span>🔙</span>
                  <span>Retirar Oferta</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Mensaje según estado final */}
      {oferta.estado !== 'pendiente' && (
        <div className={`mt-3 p-3 rounded-lg ${colorInfo.bg} border ${colorInfo.border}`}>
          <p className={`text-sm ${colorInfo.text} font-medium`}>
            {oferta.estado === 'aceptada' && '✅ Oferta aceptada - Jugador transferido'}
            {oferta.estado === 'rechazada' && '❌ Oferta rechazada por el vendedor'}
            {oferta.estado === 'retirada' && '🔙 Oferta retirada'}
            {oferta.estado === 'expirada' && '⏰ Oferta expirada - Jugador ya no disponible'}
          </p>
        </div>
      )}
    </div>
  );
};

export default OfertaCard;
