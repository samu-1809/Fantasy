import React from 'react';
import { AlertCircle } from 'lucide-react';

const EmptyTeamMessage = () => {
  return (
    <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
      <AlertCircle className="mx-auto mb-4 text-gray-400" size={64} />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">Equipo Vacío</h3>
      <p className="text-gray-500 max-w-md mx-auto">
        No hay jugadores en tu equipo. Ve al mercado para fichar jugadores y construir tu plantilla.
      </p>
    </div>
  );
};

export default EmptyTeamMessage;