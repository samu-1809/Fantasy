// components/movimientos_mercado/MovimientosMercadoScreen.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { 
  obtenerNotificaciones, 
  marcarTodasNotificacionesLeidas, 
  marcarNotificacionLeida,
  contarNotificacionesNoLeidas 
} from '../../services/api';

const MovimientosMercadoScreen = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // 'todas', 'no-leidas', 'publicas', 'privadas'

  const cargarNotificaciones = async () => {
    setCargando(true);
    try {
      const datos = await obtenerNotificaciones();
      setNotificaciones(datos.notificaciones);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    } finally {
      setCargando(false);
    }
  };

  const manejarMarcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      await cargarNotificaciones();
      // Disparar evento para actualizar NavBar
      window.dispatchEvent(new Event('notificacionesActualizadas'));
    } catch (error) {
      console.error('Error marcando movimientos como leídos:', error);
    }
  };

  const manejarMarcarComoLeida = async (notificacion) => {
    if (!notificacion.leida) {
      try {
        await marcarNotificacionLeida(notificacion.id);
        await cargarNotificaciones();
        // Disparar evento para actualizar NavBar
        window.dispatchEvent(new Event('notificacionesActualizadas'));
      } catch (error) {
        console.error('Error marcando movimiento como leído:', error);
      }
    }
  };

  const obtenerIconoMovimiento = (categoria) => {
    switch (categoria) {
      case 'distribucion_dinero':
        return '💰';
      case 'traspaso':
        return '🔄';
      case 'oferta_rechazada':
        return '❌';
      case 'oferta_editada':
        return '✏️';
      case 'oferta_retirada':
        return '📤';
      default:
        return '📊';
    }
  };

  const obtenerTipoMovimiento = (tipo, categoria) => {
    if (tipo === 'publica') {
      if (categoria === 'distribucion_dinero') return 'Distribución';
      if (categoria === 'traspaso') return 'Traspaso';
    }
    // Para las privadas
    if (categoria === 'oferta_rechazada') return 'Oferta Rechazada';
    if (categoria === 'oferta_editada') return 'Oferta Editada';
    if (categoria === 'oferta_retirada') return 'Oferta Retirada';
    return 'Movimiento';
  };

  const filtrarMovimientos = () => {
    let filtradas = notificaciones;
    
    switch (filtro) {
      case 'no-leidas':
        filtradas = notificaciones.filter(n => !n.leida);
        break;
      case 'publicas':
        filtradas = notificaciones.filter(n => n.tipo === 'publica');
        break;
      case 'privadas':
        filtradas = notificaciones.filter(n => n.tipo === 'privada');
        break;
      default:
        break;
    }
    
    return filtradas;
  };

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const movimientosFiltrados = filtrarMovimientos();
  const noLeidasCount = notificaciones.filter(n => !n.leida).length;
  const publicasCount = notificaciones.filter(n => n.tipo === 'publica').length;
  const privadasCount = notificaciones.filter(n => n.tipo === 'privada').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Movimientos del Mercado
              </h1>
              <p className="text-gray-600">
                Seguimiento de traspasos, distribuciones y ofertas
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {noLeidasCount > 0 && (
                <button
                  onClick={manejarMarcarTodasLeidas}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Eye size={16} />
                  Marcar todas como leídas
                </button>
              )}
              
              <button
                onClick={cargarNotificaciones}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFiltro('todas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filtro === 'todas' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todas ({notificaciones.length})
            </button>
            
            <button
              onClick={() => setFiltro('no-leidas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filtro === 'no-leidas' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              No leídas ({noLeidasCount})
            </button>
            
            <button
              onClick={() => setFiltro('publicas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filtro === 'publicas' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Públicas ({publicasCount})
            </button>
            
            <button
              onClick={() => setFiltro('privadas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filtro === 'privadas' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Privadas ({privadasCount})
            </button>
          </div>
        </div>

        {/* Lista de movimientos */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {cargando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando movimientos...</p>
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {filtro === 'todas' ? 'No hay movimientos' : `No hay movimientos ${filtro}`}
              </h3>
              <p className="text-gray-600">
                Los traspasos, distribuciones de dinero y ofertas rechazadas aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {movimientosFiltrados.map((movimiento) => (
                <div 
                  key={movimiento.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !movimiento.leida ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">
                      {obtenerIconoMovimiento(movimiento.categoria)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className={`font-semibold ${!movimiento.leida ? 'text-blue-800' : 'text-gray-800'}`}>
                            {movimiento.titulo}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {obtenerTipoMovimiento(movimiento.tipo, movimiento.categoria)}
                            {movimiento.tipo === 'privada' && ' • Solo para ti'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!movimiento.leida && (
                            <button
                              onClick={() => manejarMarcarComoLeida(movimiento)}
                              className="text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1 text-sm"
                              title="Marcar como leído"
                            >
                              <Eye size={14} />
                              Marcar leído
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-2">
                        {movimiento.mensaje}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {movimiento.tiempo_desde_creacion}
                        </span>
                        
                        {movimiento.leida && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded flex items-center gap-1">
                            <EyeOff size={12} />
                            Leído
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovimientosMercadoScreen;