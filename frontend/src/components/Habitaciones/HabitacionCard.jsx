import { memo } from 'react';
import { ChevronRight, Flag } from 'lucide-react';
import { useDivisa } from '../../hooks/useDivisa';
import { calcularTotalHabitacion, calcularTotalPagado } from '../../utils/calculos';
import { colorAvanceHabitacion } from '../../utils/viajeFechas';

/** Columnas de la tabla de habitaciones (encabezado y filas usan la misma rejilla). */
export const COLUMNAS_HAB = 'md:grid md:grid-cols-[92px_minmax(0,1fr)_104px_104px_150px_16px] md:items-center md:gap-4';

const esNino = (p) => p.esNino || /\(\d+ años?\)/.test(p.n || '');

/** Chip de un huésped: inicial + nombre (+ niño / stack). */
const Huesped = ({ persona, titular }) => (
  <span className="inline-flex items-center gap-1.5 max-w-full pl-1 pr-2.5 h-7 rounded-full border border-slate-200 bg-white text-[13px] text-slate-800"
    title={titular ? 'Titular de la habitación' : undefined}>
    <span className={`avatar ${titular ? 'avatar-titular' : ''}`}>{persona.n?.charAt(0).toUpperCase()}</span>
    <span className="truncate">{persona.n}</span>
    {persona.esStack && (
      <span className="text-[10px] font-semibold px-1.5 rounded-full bg-violet-50 text-violet-700 leading-4">stack</span>
    )}
    {esNino(persona) && (
      <span className="text-[10px] font-semibold px-1.5 rounded-full bg-amber-50 text-amber-800 leading-4">niño</span>
    )}
  </span>
);

// memo: al registrar un pago solo se vuelve a dibujar la fila de esa habitación
export const HabitacionFila = memo(function HabitacionFila({ habitacion, onSelect }) {
  const { fmt } = useDivisa();
  const pagado = calcularTotalPagado(habitacion);
  // Total real: cuota de adultos + niños que pagan (igual que el detalle de la habitación)
  const total = calcularTotalHabitacion(habitacion);
  const pendiente = Math.max(0, total - pagado);
  const pct = total > 0 ? Math.round((pagado / total) * 100) : (habitacion.stack ? 100 : 0);
  const personas = habitacion.personas.filter((p) => p.n);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(habitacion)}
      className={`w-full text-left px-4 sm:px-5 py-[18px] border-t border-slate-200/80 hover:bg-slate-50/80 transition-colors ${COLUMNAS_HAB} ${
        habitacion.enRevision ? 'bg-amber-50/40' : ''
      }`}
    >
      {/* Habitación */}
      <div className="flex items-center gap-2 md:block">
        <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">Hab. {habitacion.num}</p>
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          {habitacion.tipo}
          {habitacion.stack && <span className="text-[10px] font-semibold px-1.5 rounded-full bg-violet-50 text-violet-700">Stack</span>}
        </p>
        {habitacion.enRevision && (
          <span title={habitacion.revisionNota || 'En revisión'}
            className="md:mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <Flag className="h-2.5 w-2.5" /> Revisión
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-400 ml-auto md:hidden" />
      </div>

      {/* Huéspedes */}
      <div className="flex flex-wrap gap-2 mt-2.5 md:mt-0 min-w-0">
        {personas.map((p, i) => <Huesped key={p.id ?? i} persona={p} titular={i === 0} />)}
        {personas.length === 0 && <span className="text-sm text-slate-400 italic">Sin asignar</span>}
      </div>

      {/* Montos y avance (en móvil, en una línea) */}
      <p className="hidden md:block text-right text-sm font-semibold text-emerald-700 tabular-nums">{fmt(pagado)}</p>
      <p className="hidden md:block text-right text-sm font-semibold text-red-700 tabular-nums">{fmt(pendiente)}</p>
      <div className="flex items-center gap-3 mt-2.5 md:mt-0">
        <span className="md:hidden text-xs tabular-nums">
          <span className="font-semibold text-emerald-700">{fmt(pagado)}</span>
          <span className="text-slate-400"> · </span>
          <span className="font-semibold text-red-700">{fmt(pendiente)}</span>
        </span>
        <div className="barra flex-1 min-w-[60px]">
          <span style={{ width: `${Math.min(100, pct)}%`, background: colorAvanceHabitacion(pct) }} />
        </div>
        <span className="text-xs text-slate-600 tabular-nums w-9 text-right">{pct}%</span>
      </div>
      <ChevronRight className="hidden md:block h-4 w-4 text-slate-400" />
    </button>
  );
});
