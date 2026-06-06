import React from 'react';
import { Users, Tag } from 'lucide-react';
import { useDivisa } from '../../hooks/useDivisa';

const COLORES_ETIQUETA = [
  { bg: 'bg-teal-900/40',   text: 'text-teal-400',   border: 'border-teal-600/40' },
  { bg: 'bg-violet-900/40', text: 'text-violet-400', border: 'border-violet-600/40' },
  { bg: 'bg-amber-900/40',  text: 'text-amber-400',  border: 'border-amber-600/40' },
  { bg: 'bg-rose-900/40',   text: 'text-rose-400',   border: 'border-rose-600/40' },
  { bg: 'bg-cyan-900/40',   text: 'text-cyan-400',   border: 'border-cyan-600/40' },
  { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-600/40' },
];

const getColorForEtiqueta = (etiqueta) => {
  if (!etiqueta) return null;
  let hash = 0;
  for (let i = 0; i < etiqueta.length; i++) {
    hash = etiqueta.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORES_ETIQUETA[Math.abs(hash) % COLORES_ETIQUETA.length];
};

const getAccentClass = (porcentaje, isStack) => {
  if (isStack) return 'bg-emerald-500';
  if (porcentaje === 0) return 'bg-red-500';
  if (porcentaje < 30) return 'bg-amber-400';
  return 'bg-blue-500';
};

const getProgressBarClass = (porcentaje, isStack) => {
  if (isStack) return 'bg-emerald-500';
  if (porcentaje === 0) return 'bg-red-500';
  if (porcentaje < 30) return 'bg-amber-400';
  return 'bg-blue-500';
};

export const HabitacionCard = ({ habitacion, onSelect }) => {
  const { fmt } = useDivisa();
  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  const totalHabitacion = habitacion.total || 0;
  const pendiente = totalHabitacion - totalPagado;
  const porcentaje = totalHabitacion > 0 ? (totalPagado / totalHabitacion) * 100 : 0;
  const isStack = habitacion.stack;
  const hasPersonas = habitacion.personas && habitacion.personas.length > 0;
  const etiqueta = habitacion.etiqueta || '';
  const colorEtiqueta = getColorForEtiqueta(etiqueta);
  const accentClass = getAccentClass(porcentaje, isStack);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer bg-[#1a1f2e] border border-white/[0.07] hover:border-white/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 group"
      onClick={() => onSelect && onSelect(habitacion)}
    >
      {/* Borde de color izquierdo por % de pago */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentClass}`} />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/10 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
              Hab. {habitacion.num}
            </span>
            <span className="text-xs text-gray-500 font-medium">{habitacion.tipo}</span>
            {isStack && (
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                STACK
              </span>
            )}
          </div>
          {etiqueta && colorEtiqueta && (
            <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${colorEtiqueta.bg} ${colorEtiqueta.text} ${colorEtiqueta.border} shrink-0 ml-1`}>
              <Tag className="h-2.5 w-2.5" />
              {etiqueta}
            </span>
          )}
        </div>

        {/* Personas */}
        {hasPersonas && (
          <div className="mb-3 space-y-1.5">
            {habitacion.personas.map((persona, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Users className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-sm text-gray-300">{persona.n}</span>
              </div>
            ))}
          </div>
        )}

        {isStack && !hasPersonas && (
          <div className="mb-3 py-2">
            <span className="text-sm text-gray-600 italic">Sin asignar</span>
          </div>
        )}

        {/* Barra de progreso */}
        {totalHabitacion > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1.5">
              <span>Progreso de pago</span>
              <span>{porcentaje.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarClass(porcentaje, isStack)}`}
                style={{ width: `${Math.min(porcentaje, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Totales */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-4">
            {totalPagado > 0 || pendiente > 0 ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wide">Pagado</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {fmt(totalPagado)}
                  </span>
                </div>
                {pendiente > 0 && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wide">Pendiente</span>
                    <span className="text-sm font-bold text-red-400">
                      {fmt(pendiente)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-600">Sin pagos</span>
            )}
          </div>
          <svg className="h-4 w-4 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};