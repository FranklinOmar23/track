import { useMemo } from 'react';
import Grafico from '../../common/Grafico';
import { formatoCompacto } from '../../../utils/formatters';
import { ChartPanel, EmptyChart } from '../ui';
import { heatColor } from '../datosReportes';

// Estados de pago de una habitación (mismos cortes que antes)
const ESTADOS = [
  { nombre: 'Sin pagos', color: '#ef4444', es: (pct) => pct <= 0 },
  { nombre: 'En progreso (<50%)', color: '#f59e0b', es: (pct) => pct > 0 && pct < 50 },
  { nombre: 'Avanzado (≥50%)', color: '#3b82f6', es: (pct) => pct >= 50 && pct < 100 },
  { nombre: 'Completado', color: '#059669', es: (pct) => pct >= 100 },
];

const TabMapaCalor = ({ datos, fmt, divisa }) => {
  const { heatmapMeses, heatmapRows, scatterData } = datos;
  const compacto = useMemo(() => formatoCompacto(divisa), [divisa]);
  const dispersion = useMemo(() => ESTADOS
    .map((e) => ({
      name: e.nombre, type: 'scatter', color: e.color,
      data: scatterData.filter((h) => e.es(h.pct)).map((h) => ({ x: h.x, y: h.y, label: h.name })),
      format: (v) => fmt(v),
    }))
    .filter((s) => s.data.length),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scatterData]);
  return (
    <div className="space-y-6 animate-fade-in">
      <ChartPanel title="Mapa de Calor — Actividad de Pagos" subtitle="Dinero cobrado por viaje en cada mes · más verde = más dinero recibido (top 10 viajes)" orbColor="#0d9488">
        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mb-4 text-[11px] text-slate-400">
          <span>Menos</span>
          {[10,30,55,75,92].map((v) => {
            const c = heatColor(v);
            return <div key={v} className="w-5 h-5 rounded" style={{ background: c.bg, border: '1px solid rgba(15,23,42,0.06)' }} />;
          })}
          <span>Más</span>
        </div>
        {heatmapRows.length === 0 ? <EmptyChart /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-medium pb-2 pr-4" />
                  {heatmapMeses.map((m) => (
                    <th key={m} className="text-center text-slate-500 font-semibold pb-2 px-1">{m}</th>
                  ))}
                  <th className="text-right text-slate-500 font-semibold pb-2 pl-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map(({ viaje, total, celdas }) => (
                  <tr key={viaje}>
                    <td className="text-slate-500 font-medium pr-4 py-1 text-[11px] max-w-[160px] truncate" title={viaje}>{viaje}</td>
                    {celdas.map(({ mes, total: monto, val }) => {
                      const c = heatColor(val);
                      return (
                        <td key={mes} className="px-1 py-1">
                          <div className="rounded-lg text-center py-2 px-1 font-semibold min-w-[56px] text-[11px] transition-all duration-200"
                            title={`${viaje} · ${mes}: ${fmt(monto)}`}
                            style={{ background: c.bg, color: c.text, border: '1px solid rgba(15,23,42,0.04)' }}>
                            {monto > 0 ? fmt(monto, true) : '—'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-right text-slate-700 font-semibold pl-3 tabular-nums">{fmt(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartPanel>

      <ChartPanel title="Análisis de habitaciones" subtitle="Cada punto es una habitación · horizontal: personas que tiene · vertical: cuánto han pagado · color: estado de pago">
        {scatterData.length === 0 ? <EmptyChart /> : (
          <Grafico type="scatter" height={280} series={dispersion} x={{ type: 'linear', label: 'Personas en la habitación' }}
            y={{ format: compacto, zero: true }} legend={{ show: true }} markers={{ size: 6 }}
            export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Análisis de habitaciones' }} />
        )}
      </ChartPanel>
    </div>
  );
};

export default TabMapaCalor;
