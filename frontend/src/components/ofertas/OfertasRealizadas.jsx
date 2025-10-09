import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import { getOfertasRealizadas, retirarOferta } from '../../services/api';
import OfertaCard from './OfertaCard';

const OfertasRealizadas = ({ equipoId }) => {
  const [ofertas, setOfertas] = useState([]);
  const [filtro, setFiltro] = useState('todas'); // 'todas' | 'pendiente' | 'aceptada' | 'rechazada' | 'retirada'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarOfertas = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getOfertasRealizadas(equipoId);
      setOfertas(data);
    } catch (err) {
      console.error('Error cargando ofertas:', err);
      setError('Error al cargar las ofertas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (equipoId) {
      cargarOfertas();
    }
  }, [equipoId]);

  const handleRetirar = async (ofertaId, jugadorNombre) => {
    const confirmar = window.confirm(
      `¿Retirar tu oferta por ${jugadorNombre}?\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      await retirarOferta(ofertaId);
      alert('✅ Oferta retirada exitosamente');
      await cargarOfertas();
    } catch (err) {
      alert(`❌ Error al retirar la oferta: ${err.message}`);
    }
  };

  // Filtrar ofertas
  const ofertasFiltradas = ofertas.filter(o => {
    if (filtro === 'todas') return true;
    return o.estado === filtro;
  });

  // Contar por estado
  const contadores = {
    todas: ofertas.length,
    pendiente: ofertas.filter(o => o.estado === 'pendiente').length,
    aceptada: ofertas.filter(o => o.estado === 'aceptada').length,
    rechazada: ofertas.filter(o => o.estado === 'rechazada').length,
    retirada: ofertas.filter(o => o.estado === 'retirada').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
          <p className="text-gray-600">Cargando ofertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <Send size={32} className="text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Ofertas Realizadas</h1>
                <p className="text-gray-600 text-sm">
                  Historial de todas tus ofertas
                </p>
              </div>
            </div>

            {/* Botón refrescar */}
            <button
              onClick={cargarOfertas}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw size={18} />
              <span>Refrescar</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrar:</span>

            {[
              { key: 'todas', label: 'Todas', color: 'bg-gray-200 hover:bg-gray-300' },
              { key: 'pendiente', label: 'Pendientes', color: 'bg-yellow-200 hover:bg-yellow-300' },
              { key: 'aceptada', label: 'Aceptadas', color: 'bg-green-200 hover:bg-green-300' },
              { key: 'rechazada', label: 'Rechazadas', color: 'bg-red-200 hover:bg-red-300' },
              { key: 'retirada', label: 'Retiradas', color: 'bg-gray-200 hover:bg-gray-300' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filtro === key
                    ? 'ring-2 ring-blue-500 ' + color
                    : color
                }`}
              >
                {label} ({contadores[key]})
              </button>
            ))}
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

        {/* Lista de ofertas */}
        {ofertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Send size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              {filtro === 'todas'
                ? 'No has realizado ofertas aún'
                : `No hay ofertas ${filtro === 'pendiente' ? 'pendientes' : filtro + 's'}`
              }
            </h3>
            <p className="text-gray-500">
              {filtro === 'todas'
                ? 'Cuando hagas ofertas por jugadores de otros equipos, aparecerán aquí.'
                : 'Prueba con otro filtro para ver más ofertas.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-2">
              Mostrando {ofertasFiltradas.length} de {ofertas.length} oferta{ofertas.length !== 1 ? 's' : ''}
            </div>

            {ofertasFiltradas.map(oferta => (
              <OfertaCard
                key={oferta.id}
                oferta={oferta}
                tipo="realizada"
                onRetirar={oferta.estado === 'pendiente' ? () => handleRetirar(oferta.id, oferta.jugador_nombre) : null}
              />
            ))}
          </div>
        )}

        {/* Info adicional */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-bold text-purple-800 mb-2">ℹ️ Información</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Puedes retirar ofertas pendientes en cualquier momento</li>
          <li>• Las ofertas aceptadas indican que conseguiste el jugador</li>
          <li>• Las ofertas rechazadas no afectan tu presupuesto</li>
          <li>• Las ofertas expiradas significan que el jugador ya no está disponible</li>
        </ul>
      </div>
    </div>
  );
};

export default OfertasRealizadas;
