import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Filter, ShoppingCart, AlertCircle, Zap } from 'lucide-react';
import { getMercado } from '../../services/api';
import CountdownTimer from './CountdownTimer';
import ModalPujarOferta from './ModalPujarOferta';

const MarketScreen = ({ equipoActual, ligaActual, onUpdateEquipo }) => {
  const [pestañaActiva, setPestañaActiva] = useState('libres'); // 'libres' | 'en_venta'
  const [mercado, setMercado] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('');

  // Estado del modal
  const [modalPuja, setModalPuja] = useState({
    isOpen: false,
    jugador: null,
    tipo: null
  });

  useEffect(() => {
    cargarMercado();
    // Auto-refresh cada 60 segundos
    const interval = setInterval(cargarMercado, 60000);
    return () => clearInterval(interval);
  }, [equipoActual, ligaActual]);

  const cargarMercado = async () => {
    if (!equipoActual || !ligaActual) return;

    setLoading(true);
    setError('');

    try {
      const data = await getMercado(ligaActual.id);
      setMercado(data);
    } catch (err) {
      console.error('Error cargando mercado:', err);
      setError('Error al cargar el mercado. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Separar jugadores por tipo
  const jugadoresLibres = mercado.filter(j => !j.equipo || j.equipo === null);
  const jugadoresEnVenta = mercado.filter(j => j.equipo && j.en_venta);

  // Filtrar según pestaña activa
  const jugadoresActivos = pestañaActiva === 'libres' ? jugadoresLibres : jugadoresEnVenta;

  // Aplicar filtros
  const jugadoresFiltrados = jugadoresActivos.filter(j => {
    const matchNombre = j.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const matchPosicion = filtroPosicion === '' || j.posicion === filtroPosicion;
    return matchNombre && matchPosicion;
  });

  const handleAccionMercado = (jugador) => {
    if (!jugador.equipo || jugador.equipo === null) {
      // Jugador libre → PUJAR
      setModalPuja({ isOpen: true, jugador, tipo: 'puja' });
    } else {
      // Jugador en venta → HACER OFERTA
      setModalPuja({ isOpen: true, jugador, tipo: 'oferta' });
    }
  };

  const handleModalSuccess = async (response) => {
    const esPuja = response.tipo === 'puja';
    alert(`✅ ${response.mensaje || (esPuja ? 'Puja realizada' : 'Oferta enviada')}`);
    await cargarMercado();
    if (onUpdateEquipo) await onUpdateEquipo();
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <ShoppingCart size={32} className="text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Mercado de Fichajes</h1>
                <p className="text-gray-600 text-sm">
                  Presupuesto disponible: {formatValue(equipoActual?.presupuesto || 0)}
                </p>
              </div>
            </div>

            <button
              onClick={cargarMercado}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span>Refrescar</span>
            </button>
          </div>

          {/* Pestañas */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPestañaActiva('libres')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                pestañaActiva === 'libres'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Zap size={20} />
              <span>Jugadores Libres (Subastas)</span>
              <span className="bg-white bg-opacity-30 px-2 py-1 rounded-full text-sm">
                {jugadoresLibres.length}
              </span>
            </button>

            <button
              onClick={() => setPestañaActiva('en_venta')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                pestañaActiva === 'en_venta'
                  ? 'bg-yellow-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ShoppingCart size={20} />
              <span>En Venta por Usuarios</span>
              <span className="bg-white bg-opacity-30 px-2 py-1 rounded-full text-sm">
                {jugadoresEnVenta.length}
              </span>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="w-48">
              <div className="relative">
                <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filtroPosicion}
                  onChange={(e) => setFiltroPosicion(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="">Todas las posiciones</option>
                  <option value="POR">Porteros</option>
                  <option value="DEF">Defensas</option>
                  <option value="DEL">Delanteros</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-red-800 mb-1">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && mercado.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
              <p className="text-gray-600">Cargando jugadores...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Descripción de la pestaña */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-800 mb-2">
                {pestañaActiva === 'libres' ? '⚡ Subastas de Jugadores Libres' : '🏷️ Jugadores en Venta por Usuarios'}
              </h3>
              <p className="text-sm text-blue-700">
                {pestañaActiva === 'libres'
                  ? 'Estos jugadores están en subasta por 24 horas. Puja por ellos y, al finalizar el tiempo, el mejor postor se queda con el jugador automáticamente.'
                  : 'Estos jugadores pertenecen a otros equipos y están en venta. Haz una oferta y el dueño decidirá si aceptarla o rechazarla.'
                }
              </p>
            </div>

            {/* Lista de jugadores */}
            {jugadoresFiltrados.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <ShoppingCart size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-600 mb-2">
                  No hay jugadores disponibles
                </h3>
                <p className="text-gray-500">
                  {filtroNombre || filtroPosicion
                    ? 'Prueba con otros filtros.'
                    : pestañaActiva === 'libres'
                    ? 'No hay jugadores en subasta en este momento.'
                    : 'No hay jugadores en venta por otros usuarios.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Mostrando {jugadoresFiltrados.length} jugador{jugadoresFiltrados.length !== 1 ? 'es' : ''}
                </div>

                {jugadoresFiltrados.map(jugador => {
                  const esLibre = !jugador.equipo || jugador.equipo === null;

                  return (
                    <div
                      key={jugador.id}
                      className={`bg-white rounded-lg shadow-lg p-5 border-2 hover:shadow-xl transition-shadow ${
                        esLibre ? 'border-blue-300' : 'border-yellow-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Info jugador */}
                        <div className="flex-1">
                          {/* Badge tipo */}
                          <div className="mb-3">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm ${
                              esLibre
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {esLibre ? '⚡ SUBASTA' : '🏷️ EN VENTA'}
                            </span>
                          </div>

                          <h3 className="text-2xl font-bold text-gray-800 mb-2">{jugador.nombre}</h3>

                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="font-medium bg-gray-200 px-2 py-1 rounded">
                              {jugador.posicion}
                            </span>
                            <span>{jugador.equipo_real_nombre || 'Sin equipo'}</span>
                            <span className="font-bold">{jugador.puntos_totales} pts</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Valor:</span>
                              <span className="font-bold text-lg">{formatValue(jugador.valor)}</span>
                            </div>

                            {esLibre ? (
                              <>
                                {/* Info subasta */}
                                {jugador.fecha_mercado && (
                                  <div className="flex items-center gap-2">
                                    <CountdownTimer fechaMercado={jugador.fecha_mercado} />
                                  </div>
                                )}
                                {jugador.puja_actual && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-blue-600 font-medium">Puja actual:</span>
                                    <span className="font-bold text-blue-700 text-lg">
                                      {formatValue(jugador.puja_actual)}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {/* Info venta */}
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">Vendedor:</span>
                                  <span className="font-medium">{jugador.procedencia || 'Desconocido'}</span>
                                </div>
                                {jugador.precio_venta && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-yellow-600 font-medium">Precio pedido:</span>
                                    <span className="font-bold text-yellow-700 text-lg">
                                      {formatValue(jugador.precio_venta)}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Botón acción */}
                        <div className="ml-6">
                          <button
                            onClick={() => handleAccionMercado(jugador)}
                            className={`px-6 py-3 rounded-lg font-bold text-white transition-colors shadow-lg ${
                              esLibre
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-yellow-600 hover:bg-yellow-700'
                            }`}
                          >
                            {esLibre ? '💰 Pujar' : '💸 Hacer Oferta'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalPuja.isOpen && (
        <ModalPujarOferta
          isOpen={modalPuja.isOpen}
          jugador={modalPuja.jugador}
          tipo={modalPuja.tipo}
          presupuesto={equipoActual?.presupuesto || 0}
          equipoId={equipoActual?.id}
          onClose={() => setModalPuja({ isOpen: false, jugador: null, tipo: null })}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default MarketScreen;
