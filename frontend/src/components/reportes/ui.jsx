// Componentes visuales compartidos por las pestañas de Reportes
import { useCountUp } from '../../hooks/useCountUp';
import { DARK_TOOLTIP } from './datosReportes';
import { BarChart2 } from 'lucide-react';

// ─── Tarjeta de cifra (con conteo animado) ─────────────────────────────────────
export const StatCard = ({ label, value, displayValue, sub, accentColor, index = 0, ready }) => {
  const animated = Math.round(useCountUp(value, 1100, ready));
  const display = displayValue ? displayValue(animated) : animated;

  return (
    <div className="tarjeta p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
      <p className="text-[13px] text-slate-600">{label}</p>
      <p className="mt-2 font-bold tabular-nums tracking-tight leading-tight"
        style={{ color: accentColor || 'var(--tinta)', fontSize: 'clamp(1.35rem, 1.05rem + 0.75vw, 1.7rem)' }}>
        {display}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
};

// ─── Pestaña (subrayada) ─────────────────────────────────────────────────────────
export const Tab = ({ id, label, active, onClick }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={() => onClick(id)}
    className={`relative h-10 px-3 text-sm whitespace-nowrap transition-colors ${
      active ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'
    }`}
  >
    {label}
    {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full" style={{ background: 'var(--marca)' }} />}
  </button>
);

// ─── Panel de gráfica ─────────────────────────────────────────────────────────
export const ChartPanel = ({ title, subtitle, children, action }) => (
  <div className="tarjeta p-5 sm:p-6 animate-fade-in-up">
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-5">{subtitle}</p>}
    {!subtitle && <div className="mb-4" />}
    {children}
  </div>
);

// ─── Ranking ─────────────────────────────────────────────────────────────────
const MEDALLA = [
  { bg: '#fdf0d5', text: '#92400e' },
  { bg: '#eef2f6', text: '#475569' },
  { bg: '#fbe9dc', text: '#9a3412' },
];

export const RankingList = ({ title, subtitle, items, orbColor = '#0f766e', valueFmt, action }) => {
  const max = items.length ? Math.max(...items.map((i) => i.value)) : 0;
  return (
    <ChartPanel title={title} subtitle={subtitle} action={action}>
      {items.length === 0 ? <EmptyChart height={160} /> : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.label} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                style={idx < 3 ? { background: MEDALLA[idx].bg, color: MEDALLA[idx].text } : { background: '#f1f5f9', color: '#64748b' }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 text-sm mb-1">
                  <span className="text-slate-800 font-medium truncate">{it.label}</span>
                  <span className="font-semibold tabular-nums shrink-0" style={{ color: orbColor }}>{valueFmt(it.value)}</span>
                </div>
                <div className="barra">
                  <span className="transition-all duration-500"
                    style={{ width: `${max > 0 ? (it.value / max) * 100 : 0}%`, background: orbColor }} />
                </div>
                {it.sub && <p className="text-[11px] text-slate-500 mt-1">{it.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
};

// ─── Sin datos ──────────────────────────────────────────────────────────────
export const EmptyChart = ({ height = 224 }) => (
  <div className="flex flex-col items-center justify-center gap-3 text-slate-400" style={{ height }}>
    <BarChart2 className="h-10 w-10 opacity-40" />
    <p className="text-xs">Sin datos para mostrar</p>
  </div>
);

// ─── Tooltip de las gráficas ────────────────────────────────────────────────
export const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={DARK_TOOLTIP} className="px-3 py-2.5 min-w-[140px]">
      {label && <p className="text-[11px] text-slate-500 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="text-slate-900 font-semibold ml-auto pl-2">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};
