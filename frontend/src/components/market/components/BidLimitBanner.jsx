import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const BidLimitBanner = ({ pujasActivas, ofertasActivas, espaciosDisponibles, totalJugadores, maxJugadores }) => {
  const totalActivas = pujasActivas + ofertasActivas;
  const espaciosOcupados = 11 - espaciosDisponibles;
  const porcentajeUsado = (totalActivas / espaciosDisponibles) * 100;

  // Determinar color y mensaje
  let bgColor = 'bg-blue-50 border-blue-200';
  let textColor = 'text-blue-800';
  let Icon = Info;

  if (totalActivas >= espaciosDisponibles) {
    bgColor = 'bg-red-50 border-red-200';
    textColor = 'text-red-800';
    Icon = AlertCircle;
  } else if (porcentajeUsado >= 75) {
    bgColor = 'bg-yellow-50 border-yellow-200';
    textColor = 'text-yellow-800';
    Icon = AlertCircle;
  } else if (totalActivas > 0) {
    bgColor = 'bg-green-50 border-green-200';
    textColor = 'text-green-800';
    Icon = CheckCircle;
  }

  return (
    <div className={`${bgColor} border-2 rounded-xl p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={textColor} size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${textColor}`}>
              Límite de Pujas/Ofertas Activas
            </h3>
            <div className={`text-lg font-bold ${textColor}`}>
              {totalActivas} / {espaciosDisponibles}
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                totalActivas >= espaciosDisponibles
                  ? 'bg-red-500'
                  : porcentajeUsado >= 75
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (totalActivas / espaciosDisponibles) * 100)}%` }}
            />
          </div>

          <div className={`text-sm ${textColor}`}>
            <p>
              <strong>Jugadores actuales:</strong> {totalJugadores}/{maxJugadores}
              {' • '}
              <strong>Espacios disponibles:</strong> {espaciosDisponibles}
            </p>
            <p className="mt-1">
              <strong>Pujas activas:</strong> {pujasActivas}
              {' • '}
              <strong>Ofertas activas:</strong> {ofertasActivas}
            </p>

            {totalActivas >= espaciosDisponibles ? (
              <p className="mt-2 font-semibold">
                ⚠️ Has alcanzado el límite máximo. Debes ganar una puja/oferta o retirarla antes de hacer más.
              </p>
            ) : (
              <p className="mt-2">
                ℹ️ Puedes hacer {espaciosDisponibles - totalActivas} pujas/ofertas más.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidLimitBanner;
