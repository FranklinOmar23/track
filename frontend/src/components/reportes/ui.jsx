// Componentes visuales compartidos por las pestañas de Reportes
import { useCountUp } from '../../hooks/useCountUp';
import { DARK_TOOLTIP } from './datosReportes';
import { BarChart2 } from 'lucide-react';

// ─── Animated stat card ─────────────────────────────────────────────────────────
export const StatCard = ({ label, value, displayValue, sub, icon: Icon, accentColor, accentRgb, index = 0, ready }) => {
  const animated = Math.round(useCountUp(value, 1300, ready));
  const display = displayValue ? displayValue(animated) : animated;

  return (
    <div
      className="animate-fade-in-up relative rounded-2xl overflow-hidden"
      style={{
        animationDelay: `${index * 70}ms`,
        background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* colored top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      {/* subtle corner glow */}
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none rounded-full"
        style={{ background: `radial-gradient(circle, rgba(${accentRgb},0.12) 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
          <div className="p-2 rounded-xl" style={{ background: `rgba(${accentRgb},0.12)` }}>
            <Icon className="h-4 w-4" style={{ color: accentColor }} />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tabular-nums tracking-tight" style={{ color: accentColor }}>
          {display}
        </p>
        {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Tab button ─────────────────────────────────────────────────────────────────
export const Tab = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200"
    style={active ? {
      background: 'linear-gradient(135deg, rgba(13,148,136,0.25), rgba(8,145,178,0.15))',
      color: '#2dd4bf',
      border: '1px solid rgba(13,148,136,0.35)',
      boxShadow: '0 0 16px rgba(13,148,136,0.12)',
    } : {
      color: '#6b7280',
      border: '1px solid transparent',
    }}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

// ─── Chart panel wrapper ─────────────────────────────────────────────────────────
export const ChartPanel = ({ title, subtitle, children, orbColor = '#0d9488', action }) => (
  <div
    className="relative rounded-2xl overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
    }}
  >
    <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none rounded-full"
      style={{ background: `radial-gradient(circle, ${orbColor}18 0%, transparent 65%)`, transform: 'translate(40%, -40%)' }} />
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {action}
      </div>
      {subtitle && <p className="text-xs text-gray-600 mb-5">{subtitle}</p>}
      {children}
    </div>
  </div>
);

// ─── Ranking list ─────────────────────────────────────────────────────────────
const MEDAL_COLOR = ['#fbbf24', '#cbd5e1', '#d97706'];

export const RankingList = ({ title, subtitle, items, orbColor = '#0d9488', valueFmt, action }) => {
  const max = items.length ? Math.max(...items.map((i) => i.value)) : 0;
  return (
    <ChartPanel title={title} subtitle={subtitle} orbColor={orbColor} action={action}>
      {items.length === 0 ? <EmptyChart height={160} /> : (
        <div className="space-y-2.5">
          {items.map((it, idx) => (
            <div key={it.label} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                style={{
                  background: idx < 3 ? `${MEDAL_COLOR[idx]}26` : 'rgba(255,255,255,0.06)',
                  color: idx < 3 ? MEDAL_COLOR[idx] : '#6b7280',
                  border: `1px solid ${idx < 3 ? `${MEDAL_COLOR[idx]}55` : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 text-sm mb-1">
                  <span className="text-gray-200 font-medium truncate">{it.label}</span>
                  <span className="font-bold tabular-nums shrink-0" style={{ color: orbColor }}>{valueFmt(it.value)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${max > 0 ? (it.value / max) * 100 : 0}%`, background: orbColor }} />
                </div>
                {it.sub && <p className="text-[10px] text-gray-600 mt-1">{it.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
export const EmptyChart = ({ height = 224 }) => (
  <div className="flex flex-col items-center justify-center gap-3 text-gray-700"
    style={{ height }}>
    <BarChart2 className="h-10 w-10 opacity-30" />
    <p className="text-xs">Sin datos para mostrar</p>
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
export const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={DARK_TOOLTIP} className="px-3 py-2.5 min-w-[140px]">
      {label && <p className="text-[11px] text-gray-500 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-semibold ml-auto pl-2">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};
