import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { rutaViaje } from '../../utils/rutas';
import { useAuthContext } from '../../Context/AuthContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import ModalCompartir from '../Modals/ModalCompartir';
import Portal from '../common/Portal';
import { Search, Plus, Share2, PieChart, X } from 'lucide-react';
import SelectorViaje from './SelectorViaje';

const ESTADOS = [
  { valor: 'todos', label: 'Todas' },
  { valor: 'pendiente', label: 'Con saldo' },
  { valor: 'completo', label: 'Pagadas' },
  { valor: 'revision', label: 'En revisión' },
];

const botonSecundario = 'shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-3.5 h-10 text-sm font-medium border transition-colors whitespace-nowrap';

const Toolbar = ({ onOpenAgregar, onOpenDesglose }) => {
  const { state, setFiltros, crearViaje, soloLectura } = useHabitacionesContext();
  const navigate = useNavigate();
  const { puede } = useAuthContext();
  const { busqueda, estado } = state.filtros;
  const [isAgregarViajeOpen, setIsAgregarViajeOpen] = useState(false);
  const [isCompartirOpen, setIsCompartirOpen] = useState(false);

  const viajes = state?.viajes || [];
  const selectedViajeId = state?.selectedViajeId ?? '';
  const viajeActual = viajes.find((v) => v.id === selectedViajeId);
  const enRevision = state.habitaciones.filter((h) => h.enRevision).length;

  return (
    <div className="rounded-2xl p-3 sm:p-4 mb-6 border border-white/[0.07] flex flex-col gap-3 animate-fade-in-up"
      style={{ background: 'linear-gradient(180deg, #171c29 0%, #141824 100%)', animationDelay: '320ms' }}>

      {/* Fila 1: viaje + acciones del viaje */}
      <div className="flex flex-col sm:flex-row gap-2">
        <SelectorViaje
          viajes={viajes}
          valorId={selectedViajeId}
          onSeleccionar={(destino) => navigate(rutaViaje(destino))}
        />

        <div className="flex gap-2">
          {puede('crear_viajes') && (
          <button
            onClick={() => setIsAgregarViajeOpen(true)}
            className={`${botonSecundario} flex-1 sm:flex-none border-white/[0.08] text-gray-300 hover:bg-white/5`}
          >
            <Plus className="h-4 w-4" />
            Viaje
          </button>
          )}
          {puede('editar') && (
          <button
            onClick={() => setIsCompartirOpen(true)}
            disabled={!selectedViajeId}
            title={!selectedViajeId ? 'Selecciona un viaje primero' : 'Compartir viaje'}
            className={`${botonSecundario} flex-1 sm:flex-none border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
          )}
        </div>
      </div>

      <div className="h-px bg-white/[0.05]" />

      {/* Fila 2: búsqueda, estado y acciones de habitaciones */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setFiltros({ ...state.filtros, busqueda: e.target.value })}
            placeholder="Buscar habitación o persona..."
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#0f1117] border border-white/[0.08] text-gray-100 placeholder:text-gray-600 text-sm hover:border-white/20 focus:border-teal-500/50 focus:outline-none transition-colors"
          />
          {busqueda && (
            <button type="button" onClick={() => setFiltros({ ...state.filtros, busqueda: '' })}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Estado de pago como control segmentado */}
        <div className="flex h-10 p-1 rounded-xl bg-[#0f1117] border border-white/[0.08] shrink-0" role="radiogroup" aria-label="Filtrar por estado de pago">
          {ESTADOS.map((op) => (
            <button key={op.valor} type="button" role="radio" aria-checked={estado === op.valor}
              onClick={() => setFiltros({ ...state.filtros, estado: op.valor })}
              className={`flex-1 lg:flex-none px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                estado === op.valor ? 'bg-teal-500/20 text-teal-300' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {op.label}
              {op.valor === 'revision' && enRevision > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[10px] font-bold bg-amber-400 text-black">
                  {enRevision}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenDesglose}
            className={`${botonSecundario} flex-1 lg:flex-none border-white/[0.08] text-gray-300 hover:bg-white/5`}
          >
            <PieChart className="h-4 w-4" />
            Desglose
          </button>
          {!soloLectura && (
            <button
              onClick={onOpenAgregar}
              className="flex-1 lg:flex-none shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-4 h-10 text-sm font-semibold text-white transition-all whitespace-nowrap hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)', boxShadow: '0 4px 14px -4px rgba(13,148,136,0.55)' }}
            >
              <Plus className="h-4 w-4" />
              Agregar habitación
            </button>
          )}
        </div>
      </div>

      {/* En Portal: el panel tiene animación de entrada y no debe encerrar a los modales */}
      {isCompartirOpen && (
        <Portal>
          <ModalCompartir
            viajeId={selectedViajeId}
            viajeNombre={viajeActual?.nombre}
            onClose={() => setIsCompartirOpen(false)}
          />
        </Portal>
      )}

      {isAgregarViajeOpen && (
        <Portal>
          <ModalAgregarViaje
            open={isAgregarViajeOpen}
            onClose={() => setIsAgregarViajeOpen(false)}
            onCreate={crearViaje}
          />
        </Portal>
      )}
    </div>
  );
};

export default Toolbar;
