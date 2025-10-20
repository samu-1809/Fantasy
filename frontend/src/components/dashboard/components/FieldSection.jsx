import React from 'react';
import { Target, RefreshCw } from 'lucide-react';

const FieldSection = ({ 
  children, 
  titularesCount, 
  totalCount, 
  onRefresh 
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-full p-2">
            <Target className="text-white" size={24} />
          </div>
          Alineación Actual
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {titularesCount} titulares • {totalCount} total
          </div>
          <button
            onClick={onRefresh}
            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
            title="Actualizar alineación"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

export default FieldSection;