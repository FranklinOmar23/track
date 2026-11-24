import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { Search, Plus, PieChart, X } from 'lucide-react';

const ESTADOS = [
  { valor: 'todos', label: 'Todas' },
  { valor: 'pendiente', label: 'Con saldo' },
  { valor: 'completo', label: 'Pagadas' },
  { valor: 'revision', label: 'En revisión' },
];

/** Barra de la tabla de habitaciones: búsqueda, filtro por estado, desglose y agregar habitación. */
const Toolbar = ({ onOpenAgregar, onOpenDesglose }) => {
  const { state, setFiltros, soloLectura } = useHabitacionesContext();
  const { busqueda, estado } = state.filtros;
  const enRevision = state.habitaciones.filter((h) => h.enRevision).length;

  return (
    <div className="flex flex-col xl:flex-row gap-3 p-4 sm:p-5 border-b border-slate-100">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setFiltros({ ...state.filtros, busqueda: e.target.value })}
          placeholder="Buscar habitación o persona..."
          aria-label="Buscar habitación o persona"
          className="campo-buscar pr-9"
        />
        {busqueda && (
          <button type="button" onClick={() => setFiltros({ ...state.filtros, busqueda: '' })}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Estado de pago como control segmentado */}
        <div className="segmentado shrink-0 overflow-x-auto" role="radiogroup" aria-label="Filtrar por estado de pago">
          {ESTADOS.map((op) => (
            <button key={op.valor} type="button" role="radio" aria-checked={estado === op.valor}
              onClick={() => setFiltros({ ...state.filtros, estado: op.valor })} className="flex-1 sm:flex-none">
              {op.label}
              {op.valor === 'revision' && enRevision > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {enRevision}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onOpenDesglose} className="btn btn-borde h-10 flex-1 sm:flex-none">
            <PieChart className="h-4 w-4" /> Desglose
          </button>
          {!soloLectura && (
            <button type="button" onClick={onOpenAgregar} className="btn btn-primario h-10 flex-1 sm:flex-none">
              <Plus className="h-4 w-4" /> Agregar habitación
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
