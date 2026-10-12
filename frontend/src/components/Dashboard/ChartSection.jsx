import { BarChart3, PieChart as PieChartIcon, ChevronRight, Building2, Bus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const tarjeta = 'relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-white/[0.07] animate-fade-in-up';
const fondo = { background: 'linear-gradient(135deg, #1a1f2e 0%, #1c2233 100%)' };

const colorProgreso = (pct) => (pct >= 75 ? '#10b981' : pct >= 40 ? '#0d9488' : pct > 0 ? '#f59e0b' : '#f43f5e');

/** Cobro por viaje: barras horizontales (pagado / pendiente) legibles aunque los montos sean muy distintos. */
const CobroPorViaje = ({ viajes, divisa, onSelectViaje }) => {
  const fmt = (n) => formatCurrency(n, divisa);
  const ordenados = [...viajes].sort((a, b) => b.pendiente - a.pendiente);
  const maximo = Math.max(1, ...ordenados.map((v) => v.total_por_cobrar));

  return (
    <div className={`${tarjeta} lg:col-span-2`} style={{ ...fondo, animationDelay: '280ms' }}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/12">
            <BarChart3 className="h-4 w-4 text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Cobro por viaje</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ordenado por lo que falta cobrar</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Pagado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40" /> Pendiente</span>
        </div>
      </div>

      <div className="space-y-1">
        {ordenados.map((v, i) => {
          const pct = v.total_por_cobrar > 0 ? (v.total_pagado / v.total_por_cobrar) * 100 : 0;
          // Ancho de la barra relativo al viaje más grande, con un mínimo para que los pequeños se vean
          const ancho = Math.max(8, (v.total_por_cobrar / maximo) * 100);
          const Icono = v.tipo === 'tour' ? Bus : Building2;
          return (
            <button key={v.id} type="button" onClick={() => onSelectViaje(v)}
              className="group w-full text-left rounded-xl px-3 py-2.5 hover:bg-white/[0.03] transition-colors animate-fade-in-up"
              style={{ animationDelay: `${320 + i * 50}ms` }}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="flex items-center gap-2 min-w-0">
                  <Icono className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-200 truncate">{v.nombre}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500 tabular-nums hidden md:inline">
                    {fmt(v.total_pagado)} <span className="text-gray-600">de</span> {fmt(v.total_por_cobrar)}
                  </span>
                  <span className="text-xs font-bold tabular-nums w-11 text-right" style={{ color: colorProgreso(pct) }}>
                    {Math.round(pct)}%
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-700 group-hover:text-gray-400 transition-colors" />
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full overflow-hidden bg-rose-500/30 transition-all duration-700" style={{ width: `${ancho}%` }}>
                  <div className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${pct}%`, '--pw': `${pct}%`, animation: `progressFill 0.9s ${0.4 + i * 0.05}s cubic-bezier(0.23,1,0.32,1) both` }} />
                </div>
              </div>
              <p className="text-[11px] text-rose-400/80 mt-1 tabular-nums md:hidden">
                Faltan {fmt(v.pendiente)}
              </p>
            </button>
          );
        })}
        {ordenados.length === 0 && <p className="text-sm text-gray-600 text-center py-10">Sin viajes activos</p>}
      </div>
    </div>
  );
};

/** Dona de cobro global. */
const ResumenDona = ({ pagado, pendiente, divisa }) => {
  const fmt = (n) => formatCurrency(n, divisa);
  const total = pagado + pendiente;
  const pct = total > 0 ? Math.round((pagado / total) * 100) : 0;
  const datos = [
    { name: 'Pagado', value: pagado, color: '#10b981' },
    { name: 'Pendiente', value: pendiente, color: '#f43f5e' },
  ];

  return (
    <div className={tarjeta} style={{ ...fondo, animationDelay: '340ms' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="p-2 rounded-lg bg-amber-500/12">
          <PieChartIcon className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Resumen general</h3>
          <p className="text-xs text-gray-500 mt-0.5">Cuánto se ha cobrado del total</p>
        </div>
      </div>

      {/* Dona en SVG puro: evita cargar la librería de gráficas en la pantalla principal */}
      <div className="h-52 relative flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full -rotate-90" role="img" aria-label={`${pct}% cobrado`}>
          <circle cx="60" cy="60" r="48" fill="none" stroke="#f43f5e" strokeWidth="14" opacity="0.9" />
          <circle cx="60" cy="60" r="48" fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="butt"
            pathLength="100" strokeDasharray={`${pct} 100`}
            style={{ animation: 'donaLlenado 1s 0.3s cubic-bezier(0.23,1,0.32,1) backwards', '--dona': pct }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-white tabular-nums">{pct}%</span>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider">cobrado</span>
        </div>
      </div>

      <div className="space-y-2 mt-2 pt-4 border-t border-white/[0.05]">
        {datos.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}
            </span>
            <span className="font-semibold text-gray-100 tabular-nums">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Gráficas del dashboard: cobro por viaje (2/3) y resumen en dona (1/3). */
export const ChartSection = ({ viajes, divisa, totales, onSelectViaje }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <CobroPorViaje viajes={viajes} divisa={divisa} onSelectViaje={onSelectViaje} />
    <ResumenDona pagado={totales.pagado} pendiente={totales.pendiente} divisa={divisa} />
  </div>
);
