import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';

const Toolbar = ({ onOpenAgregar, onOpenDesglose }) => {
  const { state, setFiltros, crearViaje, seleccionarViaje } = useHabitacionesContext();
  const { busqueda, estado } = state.filtros;
  const [isAgregarViajeOpen, setIsAgregarViajeOpen] = useState(false);

  const handleSearchChange = (event) => {
    setFiltros({ ...state.filtros, busqueda: event.target.value });
  };

  const handleEstadoChange = (event) => {
    setFiltros({ ...state.filtros, estado: event.target.value });
  };

  const viajes = state?.viajes || [];
  const selectedViajeId = state?.selectedViajeId ?? '';

  return (
    <section className="toolbar" aria-label="Controles de viaje, búsqueda y filtro" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
      <select
        value={selectedViajeId || ''}
        onChange={(event) => {
          const value = event.target.value;
          const viajeId = value === '' ? null : value;
          seleccionarViaje(viajeId);
        }}
        aria-label="Seleccionar viaje"
        style={{ minWidth: '200px', border: '1px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.95rem', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' }}
      >
        <option value="">Seleccionar viaje</option>
        {viajes.map((viaje) => (
          <option key={viaje.id} value={viaje.id}>{viaje.nombre}</option>
        ))}
      </select>
      <button className="button" type="button" onClick={() => setIsAgregarViajeOpen(true)} style={{ whiteSpace: 'nowrap' }}>
        + Nuevo viaje
      </button>
      <input
        type="text"
        value={busqueda}
        onChange={handleSearchChange}
        placeholder="Buscar habitación o persona..."
        aria-label="Buscar habitaciones y personas"
        style={{ flex: 1, minWidth: '180px', border: '1px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.95rem', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' }}
      />
      <select
        value={estado}
        onChange={handleEstadoChange}
        aria-label="Filtrar estado de pago"
        style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: '10px', padding: '0.65rem 0.75rem', fontSize: '0.95rem', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' }}
      >
        <option value="todos">Todos</option>
        <option value="pendiente">Con saldo pendiente</option>
        <option value="completo">Pagados al 100%</option>
      </select>
      <button className="button button-primary" type="button" onClick={onOpenAgregar} style={{ whiteSpace: 'nowrap' }}>
        + Agregar habitación
      </button>
      <button className="button" type="button" onClick={onOpenDesglose} style={{ whiteSpace: 'nowrap' }}>
        Desglose general
      </button>
      {isAgregarViajeOpen && (
        <ModalAgregarViaje
          open={isAgregarViajeOpen}
          onClose={() => setIsAgregarViajeOpen(false)}
          onCreate={(viaje) => {
            crearViaje(viaje);
            setIsAgregarViajeOpen(false);
          }}
        />
      )}
    </section>
  );
};

export default Toolbar;
