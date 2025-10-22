import { Search, RefreshCw, DollarSign } from 'lucide-react';

const MercadoTab = ({
  mercado,
  pujasRealizadas,
  datosUsuario,
  filtros,
  actualizarFiltro,
  limpiarFiltros,
  handlePujar,
  handleActualizar,
  onPlayerClick,
  loading,
  formatValue,
  formatNormalValue,
  calcularExpiracion,
  puedePujarPorJugador,
  getTextoBotonPuja,
  getTituloBotonPuja,
  esJugadorEnVentaPorMi,
  yaPujadoPorJugador
}) => {
  if (mercado.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-lg mb-2">No hay jugadores disponibles en el mercado</p>
        <p className="text-sm mb-4">
          {filtros.nombre || filtros.posicion
            ? 'Prueba a limpiar los filtros para ver más jugadores'
            : 'Vuelve más tarde para ver nuevas subastas'
          }
        </p>
        <button 
          onClick={handleActualizar}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            value={filtros.nombre}
            onChange={(e) => actualizarFiltro('nombre', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="Buscar jugador..."
          />
        </div>
        
        <select
          value={filtros.posicion}
          onChange={(e) => actualizarFiltro('posicion', e.target.value)}
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
            onClick={handleActualizar}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {mercado.map((player) => {
          const puedePujar = puedePujarPorJugador(player);
          const esMiJugador = esJugadorEnVentaPorMi(player);
          const yaPujado = yaPujadoPorJugador(player.id);
          const horasEnMercado = player.horas_en_mercado || 0;
          const recibiraOfertaMercado = player.recibira_oferta_mercado;

          // 🆕 Calcular precio mínimo para mostrar
          const precioMinimo = player.tipo === 'venta_usuario' && player.precio_venta 
            ? player.precio_venta 
            : (player.valor || 0) + 1;

          return (
            // 🆕 TODO EL CONTENEDOR ES CLICABLE
            <div 
              key={player.id} 
              className="flex items-center justify-between p-4 bg-gray-50 rounded border-2 border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer group"
              onClick={() => onPlayerClick(player)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs group-hover:scale-105 transition-transform">
                  {player.posicion}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium group-hover:text-blue-600 transition-colors">
                    {player.nombre}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.posicion === 'POR' ? 'Portero' : 
                    player.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
                    {player.equipo_real_nombre} • {formatValue(player.valor)} • {player.puntos_totales} pts
                  </div>
                  
                  <div className="text-xs mt-1 space-y-1">
                    <div className={`font-medium ${
                      esMiJugador ? 'text-purple-600' : 'text-green-600'
                    }`}>
                      {esMiJugador ? (
                        <>🏷️ En venta por ti</>
                      ) : player.vendedor && player.tipo === 'venta_usuario' ? (
                        <>👤 Venta por: {player.vendedor}</>
                      ) : (
                        <>🏟️ Agente libre • Renueva en: {player.tiempo_restante || calcularExpiracion(player.fecha_mercado)}</>
                      )}
                    </div>

                    {player.tipo === 'venta_usuario' && (
                      <div className="text-xs space-y-1">
                        {/* 🆕 Mostrar precio de venta establecido por el usuario */}
                        <div className="text-green-600 font-semibold">
                          💰 Precio mínimo: {formatNormalValue(precioMinimo)}
                        </div>
                        
                        {player.puja_actual && (
                          <div className="text-blue-600">
                            🏆 Puja actual: {formatNormalValue(player.puja_actual)} por {player.pujador_actual}
                          </div>
                        )}
                        {horasEnMercado >= 24 && (
                          <div className="text-green-600 font-semibold">
                            ✅ Recibirá oferta del mercado
                          </div>
                        )}
                        {horasEnMercado < 24 && (
                          <div className="text-gray-500">
                            ⏳ En mercado: {horasEnMercado}h/24h
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div 
                className="flex items-center gap-3"
                onClick={(e) => e.stopPropagation()} // 🆕 Evitar que el clic en los botones active el clic de la fila
              >
                {/* 🆕 Botón para ver estadísticas - Mejorado */}
                <button 
                  onClick={() => onPlayerClick(player)}
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
                  title="Ver estadísticas del jugador"
                >
                </button>

                {/* Botón de puja con precio mínimo */}
                <div className="flex flex-col items-end gap-2">
                  {/* 🆕 Mostrar precio mínimo a la izquierda del botón */}
                  <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    Mín: {formatNormalValue(precioMinimo)}
                  </div>
                  
                  <button 
                    onClick={() => handlePujar(player)}
                    disabled={!puedePujar}
                    className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
                      !puedePujar
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : yaPujado
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700 hover:scale-105'
                    }`}
                    title={getTituloBotonPuja(player)}
                  >
                    <DollarSign size={16} />
                    {getTextoBotonPuja(player)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MercadoTab;