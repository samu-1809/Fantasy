import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Trophy, Euro } from 'lucide-react';
import { getEquipoById } from '../../services/api';
import FieldView from '../dashboard/FieldView';

const TeamDetailScreen = ({ equipoId, onBack }) => {
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para la alineación visual
  const [portero_titular, setPorteroTitular] = useState(null);
  const [defensas_titulares, setDefensasTitulares] = useState([]);
  const [delanteros_titulares, setDelanterosTitulares] = useState([]);
  const [banquillo, setBanquillo] = useState([]);

  useEffect(() => {
    const cargarDatosEquipo = async () => {
      try {
        console.log('🔄 Cargando datos para equipoId:', equipoId);
        setLoading(true);
        setError(null);
        
        if (!equipoId) {
          console.log('❌ No hay equipoId proporcionado');
          return;
        }
        
        // Usar la función que obtiene equipos por ID
        const equipoData = await getEquipoById(equipoId);
        console.log('📊 Datos del equipo recibidos:', equipoData);
        
        if (!equipoData) {
          throw new Error(`No se encontró el equipo con ID: ${equipoId}`);
        }
        
        setEquipo(equipoData);
        
      } catch (err) {
        console.error('❌ Error cargando datos del equipo:', err);
        setError('Error al cargar los datos del equipo: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (equipoId) {
      cargarDatosEquipo();
    }
  }, [equipoId]);

  // Determinar alineación cuando cambia el equipo
  useEffect(() => {
    if (equipo) {
      determinarAlineacionVisual();
    }
  }, [equipo]);

  const determinarAlineacionVisual = () => {
    if (!equipo) return;

    // Usamos los arrays separados que vienen del backend
    const jugadoresCampo = equipo.jugadores_campo || [];
    const jugadoresBanquillo = equipo.jugadores_banquillo || [];

    console.log('🏆 Determinando alineación visual desde datos del equipo:', {
      equipoId: equipo.id,
      nombre: equipo.nombre,
      total: equipo.jugadores.length,
      campo: jugadoresCampo.length,
      banquillo: jugadoresBanquillo.length,
      puntosTotalesEquipo: equipo.puntos_totales
    });

    // Separar por posición en el campo
    const portero = jugadoresCampo.find(j => j.posicion === 'POR');
    const defensas = jugadoresCampo.filter(j => j.posicion === 'DEF');
    const delanteros = jugadoresCampo.filter(j => j.posicion === 'DEL');

    setPorteroTitular(portero || null);
    setDefensasTitulares(defensas);
    setDelanterosTitulares(delanteros);
    setBanquillo(jugadoresBanquillo);
  };

  // Calcular puntos totales sumando todos los jugadores
  const calcularPuntosTotales = () => {
    if (!equipo) return 0;
    
    if (equipo.puntos_totales && equipo.puntos_totales > 0) {
      return equipo.puntos_totales;
    }
    
    // Si no hay puntos_totales en el equipo, calcular sumando jugadores
    if (equipo.jugadores && equipo.jugadores.length > 0) {
      const puntos = equipo.jugadores.reduce((total, jugador) => {
        return total + (jugador.puntos_totales || 0);
      }, 0);
      console.log('🧮 Puntos calculados sumando jugadores:', puntos);
      return puntos;
    }
    
    return 0;
  };

  // Funciones para el FieldView (solo visual, no interactivas)
  const handlePlayerClick = (player) => {
    console.log('Jugador clickeado (solo visual):', player.nombre);
  };

  const handleSellPlayer = (player) => {
    console.log('Venta no permitida en vista de detalle');
  };

  const getPlayerState = (player) => {
    return 'normal';
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Cargando equipo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={onBack}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Volver
        </button>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          No se encontró el equipo
        </div>
        <button
          onClick={onBack}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const puntosTotales = calcularPuntosTotales();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {/* Header con botón volver */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver a Clasificación
          </button>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{puntosTotales} pts</div>
            <div className="text-gray-600">Puntos totales</div>
          </div>
        </div>

        {/* Información del equipo */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{equipo.nombre}</h1>
              <p className="text-gray-600 mt-1">Manager: {equipo.usuario_username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Euro size={20} className="text-blue-600" />
                <span className="font-semibold text-blue-800">Presupuesto</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatValue(equipo.presupuesto)}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-green-600" />
                <span className="font-semibold text-green-800">Plantilla</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {equipo.jugadores.length}/13
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={20} className="text-purple-600" />
                <span className="font-semibold text-purple-800">Puntos Totales</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {puntosTotales}
              </div>
            </div>
          </div>
        </div>

        {/* Campo de fútbol visual usando FieldView */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Alineación del Equipo
          </h2>
          
          <FieldView
            portero_titular={portero_titular}
            defensas_titulares={defensas_titulares}
            delanteros_titulares={delanteros_titulares}
            banquillo={banquillo}
            onPlayerClick={handlePlayerClick}
            onSellPlayer={handleSellPlayer}
            getPlayerState={getPlayerState}
            modoCambio={false}
          />
        </div>
      </div>
    </div>
  );
};

export default TeamDetailScreen;