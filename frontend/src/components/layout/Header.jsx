import React from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';

const Header = () => {
  const { state } = useHabitacionesContext();
  const viajes = state?.viajes || [];
  const selectedViajeId = state?.selectedViajeId ?? null;
  const viajeSeleccionado = viajes.find((viaje) => viaje.id === selectedViajeId);

  return (
    <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border-tertiary)', marginBottom: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>ResortMamaTingo — Control de pagos</h1>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          {viajeSeleccionado ? `Viaje seleccionado: ${viajeSeleccionado.nombre}` : 'Selecciona o crea un viaje para comenzar'}
        </p>
      </div>
    </header>
  );
};

export default Header;
