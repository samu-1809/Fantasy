import React, { useState, useEffect } from 'react';
import { RefreshCw, Mail, AlertCircle } from 'lucide-react';
import { getOfertasRecibidas, aceptarOferta, rechazarOferta } from '../../services/api';
import OfertaCard from './OfertaCard';

const OfertasRecibidas = ({ equipoId, onUpdateEquipo }) => {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const cargarOfertas = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const data = await getOfertasRecibidas(equipoId);
      setOfertas(data);
    } catch (err) {
      console.error('Error cargando ofertas:', err);
      setError('Error al cargar las ofertas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (equipoId) {
      cargarOfertas();

      // Auto-refresh cada 30 segundos
      const interval = setInterval(() => {
        cargarOfertas(true);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [equipoId]);

  const handleAceptar = async (ofertaId, jugadorNombre) => {
    const confirmar = window.confirm(
      `¿Estás seguro de aceptar esta oferta?\n\n` +
      `El jugador ${jugadorNombre} será transferido y recibirás el dinero.\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      const response = await aceptarOferta(ofertaId);
      alert(`✅ ${response.mensaje || 'Oferta aceptada exitosamente'}`);

      // Recargar ofertas y actualizar equipo
      await cargarOfertas();
      if (onUpdateEquipo) await onUpdateEquipo();
    } catch (err) {
      alert(`❌ Error al aceptar la oferta: ${err.message}`);
    }
  };

  const handleRechazar = async (ofertaId, jugadorNombre) => {
    const confirmar = window.confirm(
      `¿Rechazar la oferta por ${jugadorNombre}?\n\n` +
      `El jugador permanecerá en tu equipo.`
    );

    if (!confirmar) return;

    try {
      await rechazarOferta(ofertaId);
      alert('✅ Oferta rechazada');
      await cargarOfertas();
    } catch (err) {
      alert(`❌ Error al rechazar la oferta: ${err.message}`);
    }
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
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Mail size={32} className="text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Ofertas Recibidas</h1>
                <p className="text-gray-600 text-sm">
                  {ofertas.length === 0
                    ? 'No tienes ofertas pendientes'
                    : `${ofertas.length} oferta${ofertas.length > 1 ? 's' : ''} pendiente${ofertas.length > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>

            {/* Botón refrescar */}
            <button
              onClick={() => cargarOfertas(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span>Refrescar</span>
            </button>
          </div>

          {/* Indicador de auto-refresh */}
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Actualización automática cada 30 segundos</span>
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
        {ofertas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Mail size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              No hay ofertas pendientes
            </h3>
            <p className="text-gray-500">
              Cuando otros equipos hagan ofertas por tus jugadores en venta, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ofertas.map(oferta => (
              <OfertaCard
                key={oferta.id}
                oferta={oferta}
                tipo="recibida"
                onAceptar={() => handleAceptar(oferta.id, oferta.jugador_nombre)}
                onRechazar={() => handleRechazar(oferta.id, oferta.jugador_nombre)}
              />
            ))}
          </div>
        )}

        {/* Info adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-800 mb-2">ℹ️ Información</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Al aceptar una oferta, el jugador será transferido automáticamente</li>
          <li>• El dinero se acreditará a tu presupuesto inmediatamente</li>
          <li>• Las ofertas rechazadas no se pueden recuperar</li>
          <li>• El ofertante puede retirar su oferta en cualquier momento</li>
        </ul>
      </div>
    </div>
  );
};

export default OfertasRecibidas;
