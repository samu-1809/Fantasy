import React from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useMarket } from '../../hooks/useMarket';
import { useAuth } from '../../context/AuthContext';

const MarketScreen = ({ datosUsuario, onFichajeExitoso }) => {
  const { user } = useAuth();
  const equipoId = datosUsuario?.equipo?.id;

  // 🎯 CORREGIDO: Obtener TODAS las funciones del hook
  const { 
    mercado, 
    loading, 
    error, 
    filtros, 
    cargarMercado, // 🎯 AÑADIDO
    actualizarFiltro, 
    limpiarFiltros,
    ficharJugador,
    estaExpirado, // 🎯 AÑADIDO
    calcularExpiracion // 🎯 AÑADIDO
  } = useMarket(datosUsuario?.ligaActual?.id);

  // 🎯 ELIMINADO: Filtros locales duplicados
  // Usar directamente filtros del hook

  const handleFichar = async (jugadorId) => {
    if (!equipoId) {
      alert('No se pudo identificar tu equipo');
      return;
    }

    try {
      const jugador = await ficharJugador(equipoId, jugadorId);
      alert(`✅ ${jugador.nombre} fichado para el banquillo`);
      onFichajeExitoso?.();
    } catch (err) {
      alert('❌ Error al fichar: ' + err.message);
    }
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  const totalJugadores = datosUsuario?.equipo?.jugadores?.length || 0;
  const maxJugadores = 13;
  const presupuesto = datosUsuario?.equipo?.presupuesto || 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-bold">Mercado de Fichajes ({mercado.length})</h3>
              <p className="text-sm text-gray-600 mt-1">
                Jugadores disponibles para fichar en tu liga
              </p>
            </div>
            
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={filtros.nombre} // 🎯 CORREGIDO: Usar filtros del hook
                  onChange={(e) => actualizarFiltro('nombre', e.target.value)} // 🎯 CORREGIDO: Directo
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Buscar jugador..."
                />
              </div>
              
              <select
                value={filtros.posicion} // 🎯 CORREGIDO: Usar filtros del hook
                onChange={(e) => actualizarFiltro('posicion', e.target.value)} // 🎯 CORREGIDO: Directo
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas las posiciones</option>
                <option value="POR">Portero</option>
                <option value="DEF">Defensa</option>
                <option value="DEL">Delantero</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                >
                  <span>🗑️</span>
                  Limpiar
                </button>
                <button
                  onClick={cargarMercado}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
              <button 
                onClick={cargarMercado}
                className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Cargando jugadores disponibles...</p>
            </div>
          ) : mercado.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg mb-2">No hay jugadores disponibles en el mercado</p>
              <p className="text-sm mb-4">
                {filtros.nombre || filtros.posicion // 🎯 CORREGIDO: Usar filtros del hook
                  ? 'Prueba a limpiar los filtros para ver más jugadores'
                  : 'Vuelve más tarde para ver nuevas incorporaciones al mercado'
                }
              </p>
              <button 
                onClick={cargarMercado}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mercado.map((player) => {
                const expirado = estaExpirado(player.fecha_mercado);
                const esVentaUsuario = player.tipo === 'venta_usuario';
                
                return (
                  <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded border-2 border-gray-300 hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium">{player.nombre}</div>
                      <div className="text-sm text-gray-600">
                        {player.posicion === 'POR' ? 'Portero' : 
                         player.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
                        {player.equipo_real_nombre} • {formatValue(player.valor)} • {player.puntos_totales} pts
                      </div>
                      
                      {/* Información de procedencia */}
                      <div className={`text-xs mt-1 ${
                        esVentaUsuario 
                          ? 'text-purple-600 font-medium' 
                          : expirado 
                            ? 'text-red-600 font-bold' 
                            : 'text-green-600'
                      }`}>
                        {esVentaUsuario ? (
                          <>🏷️ <span className="font-medium">{player.procedencia}</span></>
                        ) : expirado ? (
                          <>❌ <span className="font-medium">Expirado - Ya no disponible</span></>
                        ) : (
                          <>🆓 <span className="font-medium">{player.procedencia} • Hasta: {calcularExpiracion(player.fecha_mercado)}</span></>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleFichar(player.id)}
                      disabled={expirado || totalJugadores >= maxJugadores || player.valor > presupuesto}
                      className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
                        expirado || totalJugadores >= maxJugadores || player.valor > presupuesto
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                      }`}
                      title={
                        expirado ? 'Jugador expirado' :
                        totalJugadores >= maxJugadores ? 'Plantilla completa' :
                        player.valor > presupuesto ? 'Presupuesto insuficiente' :
                        'Fichar jugador'
                      }
                    >
                      <Plus size={16} />
                      {expirado ? 'Expirado' : 
                       totalJugadores >= maxJugadores ? 'Plantilla llena' :
                       player.valor > presupuesto ? 'Sin fondos' :
                       'Fichar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Información del equipo */}
        {datosUsuario?.equipo && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-blue-800">Presupuesto disponible</h4>
                  <p className="text-blue-600 text-xl font-bold">{formatValue(presupuesto)}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-600">Jugadores</div>
                  <div className={`text-lg font-bold ${
                    totalJugadores >= maxJugadores ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {totalJugadores}/{maxJugadores}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-green-800">Tu equipo</h4>
                  <p className="text-green-600 font-medium">{datosUsuario.equipo.nombre}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-600">Manager</div>
                  <div className="text-lg font-bold text-green-600">{user?.username}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketScreen;