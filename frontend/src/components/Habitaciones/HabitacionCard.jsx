import { useState } from 'react';
import { Tag, ChevronRight } from 'lucide-react';
import { useDivisa } from '../../hooks/useDivisa';

const COLORES_ETIQUETA = [
  { bg: 'bg-teal-900/40',   text: 'text-teal-400',   border: 'border-teal-600/40',   accent: '13,148,136'  },
  { bg: 'bg-violet-900/40', text: 'text-violet-400', border: 'border-violet-600/40', accent: '139,92,246'  },
  { bg: 'bg-amber-900/40',  text: 'text-amber-400',  border: 'border-amber-600/40',  accent: '245,158,11'  },
  { bg: 'bg-rose-900/40',   text: 'text-rose-400',   border: 'border-rose-600/40',   accent: '244,63,94'   },
  { bg: 'bg-cyan-900/40',   text: 'text-cyan-400',   border: 'border-cyan-600/40',   accent: '6,182,212'   },
  { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-600/40', accent: '249,115,22'  },
];

const getColorForEtiqueta = (etiqueta) => {
  if (!etiqueta) return null;
  let hash = 0;
  for (let i = 0; i < etiqueta.length; i++) {
    hash = etiqueta.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORES_ETIQUETA[Math.abs(hash) % COLORES_ETIQUETA.length];
};

const getPaymentColor = (porcentaje, isStack) => {
  if (isStack)         return { bar: '#225343', rgb: '16,185,129' };
  if (porcentaje <= 0) return { bar: '#f43f5e', rgb: '244,63,94'  };
  if (porcentaje < 30) return { bar: '#f59e0b', rgb: '245,158,11' };
  if (porcentaje < 100)return { bar: '#0d9488', rgb: '13,148,136' };
  return               { bar: '#10b981', rgb: '16,185,129' };
};

const STAGGER = ['stagger-0','stagger-1','stagger-2','stagger-3','stagger-4','stagger-5'];

export const HabitacionCard = ({ habitacion, onSelect, index = 0 }) => {
  const { fmt } = useDivisa();
  const [hovered, setHovered] = useState(false);

  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  const totalHabitacion = habitacion.total || 0;
  const pendiente  = totalHabitacion - totalPagado;
  const porcentaje = totalHabitacion > 0 ? (totalPagado / totalHabitacion) * 100 : 0;
  const isStack    = habitacion.stack;
  const hasPersonas = habitacion.personas && habitacion.personas.length > 0;
  const etiqueta    = habitacion.etiqueta || '';
  const colorTag    = getColorForEtiqueta(etiqueta);
  const payColor    = getPaymentColor(porcentaje, isStack);
  const stagger     = STAGGER[Math.min(index % 6, 5)];

  return (
    <div
      className={`relative rounded-xl overflow-hidden cursor-pointer animate-fade-in-up ${stagger}`}
      style={{
        backgroundColor: '#1a1f2e',
        border: `1px solid ${hovered ? `rgba(${payColor.rgb},0.38)` : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 220ms ease, transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 10px 32px -8px rgba(${payColor.rgb},0.22), 0 0 0 1px rgba(${payColor.rgb},0.08)`
          : 'none',
      }}
      onClick={() => onSelect && onSelect(habitacion)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: payColor.bar }}
      />

      {/* Corner glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${payColor.rgb},0.5), transparent 70%)`,
          filter: 'blur(20px)',
          opacity: hovered ? 0.5 : 0.1,
          transition: 'opacity 300ms ease',
        }}
      />

      <div className="relative p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-white text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.09)' }}
            >
              Hab. {habitacion.num}
            </span>
            <span className="text-xs text-gray-500 font-medium">{habitacion.tipo}</span>
            {isStack && (
              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 font-bold tracking-wide">
                STACK
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {etiqueta && colorTag && (
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorTag.bg} ${colorTag.text} ${colorTag.border}`}>
                <Tag className="h-2.5 w-2.5" />
                {etiqueta}
              </span>
            )}
            <ChevronRight
              className="h-4 w-4"
              style={{
                color: hovered ? payColor.bar : 'rgba(255,255,255,0.2)',
                transform: hovered ? 'translateX(2px)' : 'translateX(0)',
                transition: 'color 220ms ease, transform 220ms ease',
              }}
            />
          </div>
        </div>

        {/* Personas */}
        {hasPersonas && (
          <div className="mb-3 space-y-1.5">
            {habitacion.personas.slice(0, 3).map((persona, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                  style={{ background: `rgba(${payColor.rgb},0.28)` }}
                >
                  {persona.n?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-300 truncate">{persona.n}</span>
                {(persona.esNino || /\(\d+ años\)/.test(persona.n || '')) && (
                  <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 rounded-full shrink-0 border border-amber-500/20">niño</span>
                )}
              </div>
            ))}
            {habitacion.personas.length > 3 && (
              <p className="text-xs text-gray-600">+{habitacion.personas.length - 3} más</p>
            )}
          </div>
        )}

        {isStack && !hasPersonas && (
          <div className="mb-3 py-1">
            <span className="text-sm text-gray-600 italic">Sin asignar</span>
          </div>
        )}

        {/* Progress bar */}
        {totalHabitacion > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-600">Progreso</span>
              <span className="font-semibold tabular-nums" style={{ color: payColor.bar }}>
                {porcentaje.toFixed(0)}%
              </span>
            </div>
            <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(porcentaje, 100)}%`, background: payColor.bar }}
              />
            </div>
          </div>
        )}

        {/* Totals */}
        <div
          className="flex items-center gap-4 pt-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {totalPagado > 0 || pendiente > 0 ? (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-600 uppercase tracking-wide">Pagado</span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">{fmt(totalPagado)}</span>
              </div>
              {pendiente > 0 && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wide">Pendiente</span>
                  <span className="text-sm font-bold text-rose-400 tabular-nums">{fmt(pendiente)}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-600 italic">Sin pagos</span>
          )}
        </div>
      </div>
    </div>
  );
};
