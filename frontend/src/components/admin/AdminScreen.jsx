// AdminScreen.jsx
import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Calendar, Edit, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import JornadasPanel from './JornadasPanel';
import ResultadosPanel from './ResultadosPanel';
import PuntuacionesPanel from './PuntuacionesPanel';

const AdminScreen = ({ datosUsuario, setCurrentScreen, cargarDatosIniciales }) => {
  const [vista, setVista] = useState('jornadas');
  const { logout } = useAuth();

  // 🆕 Debug para ver la estructura de datosUsuario
  useEffect(() => {
    console.log('=== DEBUG AdminScreen ===');
    console.log('datosUsuario:', datosUsuario);
    console.log('¿Es admin?:', datosUsuario?.es_admin);
    console.log('Jugadores:', datosUsuario?.jugadores?.length);
    console.log('Equipos realesssssss:', datosUsuario?.equipos_reales?.length);
  }, [datosUsuario]);

  const jugadoresList = datosUsuario?.jugadores || [];
  const equiposRealesList = datosUsuario?.equipos_reales || [];
  console.log('Jugadores:', jugadoresList);
  console.log('Equipos:', equiposRealesList);

  const handleLogout = () => {
    logout();
    setCurrentScreen('login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar principal */}
      <div className="bg-yellow-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings size={28} />
            <h1 className="text-xl font-bold">Panel de Administración</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center gap-2 transition-colors"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 bg-yellow-50 p-6 rounded-lg shadow border-2 border-yellow-400">
          <h2 className="text-2xl font-bold mb-2">Panel de Administración</h2>
          <p className="text-sm text-gray-600">Gestiona jornadas, partidos, puntuaciones y jugadores</p>
          
          {/* Información del admin */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-semibold text-gray-700">Jugadores en sistema</div>
              <div className="text-lg font-bold text-blue-600">{jugadoresList.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-semibold text-gray-700">Equipos reales</div>
              <div className="text-lg font-bold text-green-600">{equiposRealesList.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-semibold text-gray-700">Jornada actual</div>
              <div className="text-lg font-bold text-purple-600">{datosUsuario?.ligaActual?.jornada_actual || 1}</div>
            </div>
          </div>
        </div>

        {/* Barra interna para cambiar de vista */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setVista('jornadas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium border-b-4 transition-all ${
              vista === 'jornadas'
                ? 'bg-white border-yellow-500 text-yellow-700 shadow-sm'
                : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Calendar size={18} /> Calendario
          </button>
          <button
            onClick={() => setVista('resultados')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium border-b-4 transition-all ${
              vista === 'resultados'
                ? 'bg-white border-yellow-500 text-yellow-700 shadow-sm'
                : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Edit size={18} /> Resultados
          </button>
          <button
            onClick={() => setVista('puntuaciones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium border-b-4 transition-all ${
              vista === 'puntuaciones'
                ? 'bg-white border-yellow-500 text-yellow-700 shadow-sm'
                : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Star size={18} /> Puntuaciones
          </button>
        </div>

        {/* Contenido dinámico según la vista */}
        <div className="min-h-[500px]">
          {vista === 'jornadas' ? (
            <JornadasPanel />
          ) : vista === 'resultados' ? (
            <ResultadosPanel />
          ) : (
            <PuntuacionesPanel 
              jugadores={jugadoresList}
              equiposReales={equiposRealesList}
              onAsignarPuntosSuccess={cargarDatosIniciales}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;