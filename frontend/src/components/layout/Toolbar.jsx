import React from 'react';
import { useHabitacionesContext } from '../../context/HabitacionesContext';

const Toolbar = ({ onOpenAgregar }) => {
  const { state, setFiltros } = useHabitacionesContext();
  const { busqueda, estado } = state.filtros;

  const handleSearchChange = (event) => {
    setFiltros({ ...state.filtros, busqueda: event.target.value });
  };

  const handleEstadoChange = (event) => {
    setFiltros({ ...state.filtros, estado: event.target.value });
  };

  return (
    <section className="toolbar" aria-label="Controles de búsqueda y filtro" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
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
    </section>
  );
};

export default Toolbar;
