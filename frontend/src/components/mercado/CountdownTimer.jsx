import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ fechaMercado }) => {
  const [tiempoRestante, setTiempoRestante] = useState(null);

  useEffect(() => {
    const calcularTiempo = () => {
      if (!fechaMercado) {
        setTiempoRestante({ expirado: true });
        return;
      }

      const expiracion = new Date(fechaMercado).getTime() + (24 * 60 * 60 * 1000);
      const ahora = Date.now();
      const diff = expiracion - ahora;

      if (diff <= 0) {
        setTiempoRestante({ expirado: true });
        return;
      }

      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTiempoRestante({ horas, minutos, expirado: false });
    };

    calcularTiempo();
    const interval = setInterval(calcularTiempo, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [fechaMercado]);

  if (!tiempoRestante) {
    return <span className="text-gray-500">Cargando...</span>;
  }

  if (tiempoRestante.expirado) {
    return (
      <span className="text-red-600 font-bold">
        ❌ Expirado
      </span>
    );
  }

  const { horas, minutos } = tiempoRestante;

  // Determinar color según tiempo restante
  let colorClass = 'text-green-600';
  if (horas < 6) {
    colorClass = 'text-red-600';
  } else if (horas < 12) {
    colorClass = 'text-yellow-600';
  }

  return (
    <span className={`${colorClass} font-medium`}>
      ⏱️ Expira en: {horas}h {minutos}m
    </span>
  );
};

export default CountdownTimer;
