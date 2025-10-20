// components/common/real-teams/TeamsTab.jsx
import React from 'react';
import { Shield } from 'lucide-react';

const TeamsTab = ({ equiposReales, onEquipoClick, getColorEquipo }) => {
  if (equiposReales.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="text-yellow-600" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay equipos registrados</h3>
        <p className="text-gray-500">
          No hay equipos reales disponibles en este momento
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {equiposReales.map((equipo, index) => (
        <div
          key={equipo.id}
          onClick={() => onEquipoClick(equipo)}
          className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border-2 border-transparent hover:border-green-300"
        >
          <div className={`bg-gradient-to-r ${getColorEquipo(index)} text-white p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{equipo.nombre}</h3>
                  <p className="text-sm opacity-80 mt-1">Ver plantilla</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamsTab;