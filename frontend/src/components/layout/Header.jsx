import React, { useMemo } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';

const Header = ({ viaje, onBack }) => {
  const { state } = useHabitacionesContext();
  
  // Memoizar el valor para evitar re-renders
  const viajeSeleccionado = useMemo(() => {
    return viaje || state?.viajes?.find(v => v.id === state?.selectedViajeId);
  }, [viaje, state?.viajes, state?.selectedViajeId]);

  return (
    <header className="header" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      gap: '1rem', 
      paddingBottom: '1rem', 
      borderBottom: '1px solid var(--color-border-tertiary)', 
      marginBottom: '1.5rem' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            ←
          </button>
        )}
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            ResortMamaTingo — Control de pagos
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            {viajeSeleccionado ? `Viaje: ${viajeSeleccionado.nombre}` : 'Selecciona o crea un viaje para comenzar'}
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;