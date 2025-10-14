import React, { useState, useEffect } from 'react';
import { 
  Bell, DollarSign, Users, ShoppingCart, CheckCircle, 
  AlertCircle, TrendingUp, RefreshCw, 
  TrendingDown, Target, Trophy, Clock, CreditCard,
  MessageSquare, X
} from 'lucide-react';
import { getNotificaciones, marcarNotificacionLeida, getTransacciones } from '../../services/api';

const NotificacionScreen = ({ onNavigate, onRefresh }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date().toLocaleTimeString());

  const cargarDatos = async () => {
    console.log('🔄 Cargando tablón de actividades...');
    try {
      setLoading(true);
      setError(null);
      
      const [notificacionesData, transaccionesData] = await Promise.all([
        getNotificaciones(),
        getTransacciones()
      ]);
      
      setNotificaciones(notificacionesData.notificaciones || []);
      setTransacciones(transaccionesData.transacciones || []);
      setUltimaActualizacion(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('❌ Error cargando tablón:', error);
      setError('Error al cargar el tablón: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    
    const handleNuevaNotificacion = () => {
      console.log('🔔 Evento nuevaNotificacion recibido');
      cargarDatos();
    };

    window.addEventListener('nuevaNotificacion', handleNuevaNotificacion);
    return () => {
      window.removeEventListener('nuevaNotificacion', handleNuevaNotificacion);
    };
  }, []);

  const handleMarcarLeida = async (notificacionId) => {
    try {
      await marcarNotificacionLeida(notificacionId);
      setNotificaciones(prev => 
        prev.map(notif => 
          notif.id === notificacionId ? { ...notif, es_leida: true } : notif
        )
      );
    } catch (error) {
      console.error('❌ Error marcando notificación como leída:', error);
      setError('Error al marcar notificación como leída');
    }
  };

  const handleMarcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(notif => !notif.es_leida);
    for (const notif of noLeidas) {
      await handleMarcarLeida(notif.id);
    }
  };

  // Combinar y ordenar todas las actividades por fecha
  const todasLasActividades = [
    ...notificaciones.map(n => ({ ...n, tipoItem: 'notificacion' })),
    ...transacciones.map(t => ({ ...t, tipoItem: 'transaccion' }))
  ].sort((a, b) => new Date(b.fecha_creacion || b.fecha) - new Date(a.fecha_creacion || a.fecha));

  const notificacionesNoLeidas = notificaciones.filter(notif => !notif.es_leida).length;

  const getIconoActividad = (item) => {
    if (item.tipoItem === 'transaccion') {
      switch (item.tipo) {
        case 'ingreso':
          return <TrendingUp className="text-green-500" size={24} />;
        case 'egreso':
          return <TrendingDown className="text-red-500" size={24} />;
        case 'pago_jornada':
          return <DollarSign className="text-blue-500" size={24} />;
        case 'compra':
          return <ShoppingCart className="text-purple-500" size={24} />;
        case 'venta':
          return <Target className="text-orange-500" size={24} />;
        default:
          return <CreditCard className="text-gray-500" size={24} />;
      }
    } else {
      switch (item.tipo) {
        case 'pago_jornada':
          return <DollarSign className="text-green-500" size={24} />;
        case 'fichaje_exitoso':
          return <Users className="text-blue-500" size={24} />;
        case 'venta_exitosa':
          return <ShoppingCart className="text-purple-500" size={24} />;
        case 'oferta_rechazada':
          return <AlertCircle className="text-red-500" size={24} />;
        case 'jugador_quitado_mercado':
          return <TrendingUp className="text-orange-500" size={24} />;
        case 'puja_ganada':
          return <Trophy className="text-yellow-500" size={24} />;
        case 'puja_perdida':
          return <TrendingDown className="text-gray-500" size={24} />;
        case 'jugador_no_adquirido':
          return <X className="text-red-500" size={24} />;
        default:
          return <Bell className="text-gray-500" size={24} />;
      }
    }
  };

  const getColorBorde = (item) => {
    if (item.tipoItem === 'transaccion') {
      switch (item.tipo) {
        case 'ingreso':
        case 'pago_jornada':
        case 'venta':
          return 'border-l-green-500';
        case 'egreso':
        case 'compra':
          return 'border-l-red-500';
        default:
          return 'border-l-gray-500';
      }
    } else {
      switch (item.tipo) {
        case 'pago_jornada':
          return 'border-l-green-500';
        case 'fichaje_exitoso':
          return 'border-l-blue-500';
        case 'venta_exitosa':
          return 'border-l-purple-500';
        case 'oferta_rechazada':
        case 'jugador_no_adquirido':
          return 'border-l-red-500';
        case 'jugador_quitado_mercado':
          return 'border-l-orange-500';
        case 'puja_ganada':
          return 'border-l-yellow-500';
        case 'puja_perdida':
          return 'border-l-gray-500';
        default:
          return 'border-l-gray-500';
      }
    }
  };

  const getBadgeColor = (item) => {
    if (item.tipoItem === 'transaccion') {
      switch (item.tipo) {
        case 'ingreso':
        case 'pago_jornada':
        case 'venta':
          return 'bg-green-100 text-green-800';
        case 'egreso':
        case 'compra':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  const getTipoTexto = (item) => {
    if (item.tipoItem === 'transaccion') {
      return item.tipo.replace('_', ' ');
    } else {
      switch (item.tipo) {
        case 'pago_jornada': return 'Pago de Jornada';
        case 'fichaje_exitoso': return 'Fichaje Exitoso';
        case 'venta_exitosa': return 'Venta Exitosa';
        case 'oferta_rechazada': return 'Oferta Rechazada';
        case 'jugador_quitado_mercado': return 'Jugador Retirado';
        case 'puja_ganada': return 'Puja Ganada';
        case 'puja_perdida': return 'Puja Perdida';
        case 'jugador_no_adquirido': return 'Jugador No Adquirido';
        default: return item.tipo;
      }
    }
  };

  const formatMonto = (monto) => {
    if (!monto && monto !== 0) return '€0';
    const num = parseInt(monto) || 0;
    return `€${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-xl text-gray-600">Cargando tablón de actividades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={cargarDatos}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
            >
              Reintentar
            </button>
            <button 
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header simplificado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg border border-white/20">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-4">
              <Bell className="text-white" size={32} />
            </div>
            <div className="text-left flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                Tablón de Actividades
              </h1>
              <p className="text-gray-600 mt-1">
                {todasLasActividades.length} actividades • {notificacionesNoLeidas} sin leer
              </p>
              <p className="text-xs text-gray-400">Actualizado: {ultimaActualizacion}</p>
            </div>
            <div className="flex items-center gap-2">
              {notificacionesNoLeidas > 0 && (
                <button
                  onClick={handleMarcarTodasLeidas}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Marcar todas
                </button>
              )}
              <button
                onClick={cargarDatos}
                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors"
                title="Actualizar tablón"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de actividades */}
        <div className="space-y-4">
          {todasLasActividades.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <MessageSquare className="mx-auto mb-4 text-gray-400" size={64} />
              <h3 className="text-2xl font-bold text-gray-600 mb-2">
                No hay actividades
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Las actividades de tu equipo aparecerán aquí.
              </p>
            </div>
          ) : (
            todasLasActividades.map((item) => (
              <div
                key={`${item.tipoItem}-${item.id}`}
                className={`bg-white rounded-2xl shadow-lg border-l-4 ${getColorBorde(item)} ${
                  item.tipoItem === 'notificacion' && item.es_leida 
                    ? 'opacity-80' 
                    : 'border-l-4 shadow-md'
                } transition-all duration-200 hover:shadow-xl`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getIconoActividad(item)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`text-xl font-semibold ${
                            item.tipoItem === 'notificacion' && item.es_leida ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {item.tipoItem === 'notificacion' ? item.titulo : item.descripcion}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getBadgeColor(item)}`}>
                            {getTipoTexto(item)}
                          </span>
                          {item.tipoItem === 'notificacion' && !item.es_leida && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              Nuevo
                            </span>
                          )}
                        </div>
                        
                        {item.tipoItem === 'notificacion' ? (
                          <p className="text-gray-600 text-lg mb-3">
                            {item.mensaje}
                          </p>
                        ) : (
                          <div className="flex items-center gap-4 mb-3">
                            <span className={`text-2xl font-bold ${
                              item.tipo === 'ingreso' || item.tipo === 'pago_jornada' || item.tipo === 'venta'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {formatMonto(item.monto)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatFecha(item.fecha_creacion || item.fecha)}
                          </div>
                          <div className="flex items-center gap-1">
                            {item.tipoItem === 'notificacion' ? (
                              <Bell size={14} />
                            ) : (
                              <CreditCard size={14} />
                            )}
                            {item.tipoItem === 'notificacion' ? 'Notificación' : 'Transacción'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {item.tipoItem === 'notificacion' && !item.es_leida && (
                      <button
                        onClick={() => handleMarcarLeida(item.id)}
                        className="ml-4 p-2 text-gray-400 hover:text-green-500 transition-colors hover:bg-green-50 rounded-lg"
                        title="Marcar como leída"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificacionScreen;