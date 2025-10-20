// common/NavBar.jsx
import React, { useState, useEffect } from 'react';
import { LogOut, RefreshCw, Bell } from 'lucide-react';
import { contarNotificacionesNoLeidas } from '../../services/api';

const NavBar = ({ onNavigate, onRefresh, onLogout, currentScreen }) => {
  const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);

  const cargarContadorNoLeidas = async () => {
    try {
      const datos = await contarNotificacionesNoLeidas();
      setCantidadNoLeidas(datos.cantidad_no_leidas);
    } catch (error) {
      console.error('Error cargando contador de notificaciones:', error);
    }
  };

  useEffect(() => {
    cargarContadorNoLeidas();
    
    // Recargar contador cada 30 segundos
    const intervalo = setInterval(cargarContadorNoLeidas, 30000);
    
    // Escuchar eventos de actualización desde otras pantallas
    const manejarActualizacion = () => {
      cargarContadorNoLeidas();
    };
    
    window.addEventListener('notificacionesActualizadas', manejarActualizacion);
    
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('notificacionesActualizadas', manejarActualizacion);
    };
  }, []);

  const elementosNavegacion = [
    { clave: 'dashboard', etiqueta: ' Mi Equipo', icono: '🧤' },
    { clave: 'market', etiqueta: ' Mercado', icono: '💰' },
    { clave: 'movimientos-mercado', etiqueta: ' Movimientos', icono: '📊' },
    { clave: 'rankings', etiqueta: ' Clasificación', icono: '🏆' },
    { clave: 'calendar', etiqueta: ' Calendario', icono: '📅' },
    { clave: 'real-teams', etiqueta: ' Equipos Reales', icono: '🏃‍♂️' },
  ];

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">⚽ Fantasy Fútbol Sala</h1>
      </div>
      
      <div className="flex gap-6 items-center">
        {elementosNavegacion.map((item) => (
          <button 
            key={item.clave}
            onClick={() => onNavigate(item.clave)}
            className={`hover:text-gray-300 flex items-center gap-1 transition-colors relative ${
              currentScreen === item.clave ? 'text-yellow-400 font-semibold' : ''
            }`}
          >
            <span>{item.icono}</span>
            {item.etiqueta}
            
            {/* Badge para notificaciones no leídas en Movimientos */}
            {item.clave === 'movimientos-mercado' && cantidadNoLeidas > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center animate-pulse">
                {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
              </span>
            )}
          </button>
        ))}
        
        <div className="w-px h-6 bg-gray-600"></div>
        
        {/* Indicador de notificaciones global */}
        {cantidadNoLeidas > 0 && (
          <div className="flex items-center gap-2 text-yellow-300">
            <Bell size={16} />
            <span className="text-sm">
              {cantidadNoLeidas} {cantidadNoLeidas === 1 ? 'movimiento nuevo' : 'movimientos nuevos'}
            </span>
          </div>
        )}
        
        <button 
          onClick={onRefresh}
          className="hover:text-gray-300 flex items-center gap-1 transition-colors"
          title="Recargar datos"
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
        
        <button
          onClick={onLogout}
          className="cursor-pointer hover:text-gray-300 flex items-center gap-1 transition-colors"
        >
          <LogOut size={20} />
          Salir
        </button>
      </div>
    </div>
  );
};

export default NavBar;