import React from 'react';
import { TrendingUp } from 'lucide-react';

const SaleConfirmationAnimation = ({ mostrarAnimacionVenta, jugadorVendido }) => {
  if (!mostrarAnimacionVenta || !jugadorVendido) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <p className="font-bold">¡Jugador Vendido!</p>
            <p className="text-sm opacity-90">
              {jugadorVendido.nombre} ha sido transferido
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleConfirmationAnimation;