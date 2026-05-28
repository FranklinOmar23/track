import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { Search, Plus } from 'lucide-react';

const Toolbar = ({ onOpenAgregar, onOpenDesglose }) => {
  const { state, setFiltros, crearViaje, seleccionarViaje } = useHabitacionesContext();
  const { busqueda, estado } = state.filtros;
  const [isAgregarViajeOpen, setIsAgregarViajeOpen] = useState(false);

  const handleSearchChange = (e) => {
    setFiltros({ ...state.filtros, busqueda: e.target.value });
  };

  const handleEstadoChange = (e) => {
    setFiltros({ ...state.filtros, estado: e.target.value });
  };

  const viajes = state?.viajes || [];
  const selectedViajeId = state?.selectedViajeId ?? '';

  return (
    <div className="flex flex-col gap-2 mb-6">

      {/* Fila 1: Selector de viaje + botón nuevo viaje */}
      <div className="flex gap-2">
        <select
          value={selectedViajeId || ''}
          onChange={(e) => {
            const id = e.target.value === '' ? null : e.target.value;
            seleccionarViaje(id);
          }}
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm"
        >
          <option value="">Seleccionar viaje</option>
          {viajes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={() => setIsAgregarViajeOpen(true)}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:bg-gray-50 whitespace-nowrap"
        >
          + Viaje
        </button>
      </div>

      {/* Fila 2: Búsqueda + filtro de estado */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={handleSearchChange}
            placeholder="Buscar habitación o persona..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
          />
        </div>

        <select
          value={estado}
          onChange={handleEstadoChange}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="completo">Pagados</option>
        </select>
      </div>

      {/* Fila 3: Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={onOpenAgregar}
          className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Agregar habitación
        </button>

        <button
          onClick={onOpenDesglose}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 text-center"
        >
          Desglose general
        </button>
      </div>

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
    </div>
  );
};

export default Toolbar;