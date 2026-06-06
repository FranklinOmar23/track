import React, { useMemo } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';

const Header = ({ viaje, onBack }) => {
  const { state } = useHabitacionesContext();

  const viajeSeleccionado = useMemo(() => {
    return viaje || state?.viajes?.find(v => v.id === state?.selectedViajeId);
  }, [viaje, state?.viajes, state?.selectedViajeId]);

  return (
    <header className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.07] mb-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-white transition-colors text-xl p-1.5 rounded-lg hover:bg-white/5"
          >
            ←
          </button>
        )}
        <div>
          <h1 className="text-base font-semibold text-white">
            ResortMamaTingo — Control de pagos
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {viajeSeleccionado
              ? `Viaje: ${viajeSeleccionado.nombre}`
              : 'Selecciona o crea un viaje para comenzar'}
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
