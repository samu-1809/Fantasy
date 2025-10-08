import React from 'react';
import { LogOut, RefreshCw } from 'lucide-react';

const NavBar = ({ onNavigate, onRefresh, onLogout, currentScreen }) => {
  const navItems = [
    { key: 'dashboard', label: '🧤 Mi Equipo', icon: '🧤' },
    { key: 'market', label: '💰 Mercado', icon: '💰' },
    { key: 'rankings', label: '🏆 Clasificación', icon: '🏆' },
    { key: 'calendar', label: '📅 Calendario', icon: '📅' }
  ];

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">⚽ Fantasy Fútbol Sala</h1>
      </div>
      <div className="flex gap-6 items-center">
        {navItems.map((item) => (
          <button 
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`hover:text-gray-300 flex items-center gap-1 transition-colors ${
              currentScreen === item.key ? 'text-yellow-400 font-semibold' : ''
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
        
        <div className="w-px h-6 bg-gray-600"></div>
        
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