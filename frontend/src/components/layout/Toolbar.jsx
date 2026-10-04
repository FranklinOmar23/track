import { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import ModalCompartir from '../Modals/ModalCompartir';
import { Search, Plus, Share2 } from 'lucide-react';

const Toolbar = ({ onOpenAgregar, onOpenDesglose }) => {
  const { state, setFiltros, crearViaje, seleccionarViaje, soloLectura } = useHabitacionesContext();
  const { busqueda, estado } = state.filtros;
  const [isAgregarViajeOpen, setIsAgregarViajeOpen] = useState(false);
  const [isCompartirOpen, setIsCompartirOpen] = useState(false);
  const handleSearchChange = (e) => {
    setFiltros({ ...state.filtros, busqueda: e.target.value });
  };

  const handleEstadoChange = (e) => {
    setFiltros({ ...state.filtros, estado: e.target.value });
  };

  const viajes = state?.viajes || [];
  const selectedViajeId = state?.selectedViajeId ?? '';
  const viajeActual = viajes.find(v => v.id === selectedViajeId);

  return (
    <div className="flex flex-col gap-2 mb-6">
      {/* Fila 1: Selector de viaje + botones */}
      <div className="flex gap-2">
        <select
          value={selectedViajeId || ''}
          onChange={(e) => {
            const id = e.target.value === '' ? null : e.target.value;
            seleccionarViaje(id);
          }}
          className="flex-1 min-w-0 border border-white/[0.07] rounded-lg px-3 py-2 bg-[#1a1f2e] text-gray-200 text-sm"
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
          className="shrink-0 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-gray-300 flex items-center gap-1 hover:bg-white/5 whitespace-nowrap"
        >
          + Viaje
        </button>

        {/* Botón COMPARTIR */}
        <button
          onClick={() => setIsCompartirOpen(true)}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm flex items-center gap-1 whitespace-nowrap ${
            selectedViajeId
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30'
              : 'bg-white/5 text-gray-600 border border-white/[0.05] cursor-not-allowed'
          }`}
          disabled={!selectedViajeId}
          title={!selectedViajeId ? 'Selecciona un viaje primero' : 'Compartir viaje'}
        >
          <Share2 className="h-4 w-4" />
          Compartir
        </button>
      </div>

      {/* Fila 2: Búsqueda + filtro de estado */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
          <input
            type="text"
            value={busqueda}
            onChange={handleSearchChange}
            placeholder="Buscar habitación o persona..."
            className="w-full pl-9 pr-3 py-2 border border-white/[0.07] rounded-lg bg-[#1a1f2e] text-gray-200 placeholder:text-gray-600 text-sm"
          />
        </div>

        <select
          value={estado}
          onChange={handleEstadoChange}
          className="shrink-0 border border-white/[0.07] rounded-lg px-3 py-2 bg-[#1a1f2e] text-gray-200 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Con saldo pendiente</option>
          <option value="completo">Pagados al 100%</option>
        </select>
      </div>

      {/* Fila 3: Botones de acción */}
      <div className="flex gap-2">
        {!soloLectura && (
          <button
            onClick={onOpenAgregar}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar habitación
          </button>
        )}

        <button
          onClick={onOpenDesglose}
          className="flex-1 border border-white/[0.07] rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/5 text-center transition-colors"
        >
          Desglose general
        </button>
      </div>

      {isCompartirOpen && (
        <ModalCompartir
          viajeId={selectedViajeId}
          viajeNombre={viajeActual?.nombre}
          onClose={() => setIsCompartirOpen(false)}
        />
      )}

      {isAgregarViajeOpen && (
        <ModalAgregarViaje
          open={isAgregarViajeOpen}
          onClose={() => setIsAgregarViajeOpen(false)}
          onCreate={crearViaje}
        />
      )}
    </div>
  );
};

export default Toolbar;