import { useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import Grafico from '../common/Grafico';
import { useTema } from '../../utils/tema';

const CATEGORIAS_DONA = ['Pagado', 'Pendiente'];
const COLORES_DONA = { claro: ['#059669', '#f4c7c3'], oscuro: ['#10b981', '#7f3b40'] };

/** Encabezado de tarjeta: título, subtítulo y algo opcional a la derecha. */
export const EncabezadoTarjeta = ({ titulo, subtitulo, children }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h3 className="text-[15px] font-semibold text-slate-900">{titulo}</h3>
      {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
    </div>
    {children}
  </div>
);

/** Barra pagado (verde) sobre pendiente (rosado). */
export const BarraPagadoPendiente = ({ pct, alto = 'h-2', retraso = 0 }) => (
  <div className={`${alto} rounded-full overflow-hidden`} style={{ background: 'var(--pendiente)' }}>
    <div className="h-full rounded-full" style={{
      background: 'var(--pagado)',
      width: `${Math.min(100, pct)}%`,
      '--pw': `${Math.min(100, pct)}%`,
      animation: `progressFill 0.9s ${retraso}s cubic-bezier(0.23,1,0.32,1) both`,
    }} />
  </div>
);

export const LeyendaPagado = () => (
  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600">
    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--pagado)' }} /> Pagado</span>
    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--pendiente)' }} /> Pendiente</span>
  </div>
);

/** Cobro por viaje: una barra por viaje (pagado / pendiente), ordenado por lo que falta cobrar. */
const CobroPorViaje = ({ viajes, divisa, onSelectViaje }) => {
  const ordenados = [...viajes].sort((a, b) => b.pendiente - a.pendiente);

  return (
    <div className="tarjeta p-5 sm:p-6 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
      <EncabezadoTarjeta titulo="Cobro por viaje" subtitulo="Ordenado por lo que falta cobrar">
        <LeyendaPagado />
      </EncabezadoTarjeta>

      <div className="mt-4 -mx-2">
        {ordenados.map((v, i) => (
          <button key={v.id} type="button" onClick={() => onSelectViaje(v)}
            className="w-full text-left rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm font-semibold text-slate-900 truncate">{v.nombre}</span>
              <span className="text-sm text-slate-500 shrink-0 tabular-nums">
                Faltan <span className="font-bold text-slate-900">{formatCurrency(v.pendiente, v.divisa || divisa)}</span>
              </span>
            </div>
            <BarraPagadoPendiente pct={v.pct} retraso={0.25 + i * 0.05} />
            <p className="text-right text-xs text-slate-600 mt-1.5 tabular-nums">{Math.round(v.pct)}%</p>
          </button>
        ))}
        {ordenados.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Sin viajes activos</p>}
      </div>
    </div>
  );
};

/** Dona de cobro global. */
const ResumenDona = ({ pagado, pendiente, divisa }) => {
  const fmt = (n) => formatCurrency(n, divisa);
  const total = pagado + pendiente;
  const pct = total > 0 ? Math.round((pagado / total) * 100) : 0;
  const tema = useTema();
  const series = useMemo(() => [{ name: 'Total por cobrar', data: [pagado, pendiente], format: (v) => formatCurrency(v, divisa) }],
    [pagado, pendiente, divisa]);

  return (
    <div className="tarjeta p-5 sm:p-6 animate-fade-in-up flex flex-col" style={{ animationDelay: '200ms' }}>
      <EncabezadoTarjeta titulo="Resumen general" subtitulo="Cuánto se ha cobrado del total">
        <span className="etiqueta-tipo bg-emerald-50 text-emerald-700 !text-xs !px-2.5 !py-0.5 tabular-nums">{pct}% cobrado</span>
      </EncabezadoTarjeta>

      <div className="my-3">
        <Grafico type="donut" height={220} categories={CATEGORIAS_DONA} colors={COLORES_DONA[tema]}
          series={series} legend={{ show: false }} donut={{ thickness: 0.34 }} export={false} />
      </div>

      <div className="space-y-2 mt-auto">
        {[['Pagado', pagado, 'var(--pagado)'], ['Pendiente', pendiente, 'var(--pendiente)']].map(([nombre, valor, color]) => (
          <div key={nombre} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} /> {nombre}
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">{fmt(valor)}</span>
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
