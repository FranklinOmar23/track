import { useMemo } from 'react';
import Grafico from '../../common/Grafico';
import { formatoCompacto } from '../../../utils/formatters';
import { FileDown } from 'lucide-react';
import { ChartPanel, EmptyChart } from '../ui';

const TabRendimiento = ({ datos, fmt, divisa, handleExportExcel }) => {
  const { rendimientoData } = datos;
  const compacto = useMemo(() => formatoCompacto(divisa), [divisa]);
  const categorias = useMemo(() => rendimientoData.map((r) => r.name), [rendimientoData]);
  const series = useMemo(() => [
    { name: 'Pagado', type: 'bar', color: '#059669', data: rendimientoData.map((r) => r.pagado), format: (v) => fmt(v) },
    { name: 'Pendiente', type: 'bar', color: '#f4a9a3', data: rendimientoData.map((r) => r.pendiente), format: (v) => fmt(v) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [rendimientoData]);
  return (
    <div className="space-y-6 animate-fade-in">
      <ChartPanel
        title="Rendimiento por Centro / Etiqueta"
        subtitle="Cobrado y pendiente de cada centro o grupo"
        orbColor="#f59e0b"
        action={
          <button
            onClick={handleExportExcel}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(16,185,129,0.1)',
              color: 'var(--pagado-texto)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <FileDown className="h-3.5 w-3.5" /> Excel
          </button>
        }
      >
        {rendimientoData.length === 0 ? <EmptyChart height={200} /> : (
          <Grafico type="bar" height={280} categories={categorias} series={series}
            y={{ format: compacto, zero: true }} bar={{ radius: 5, padding: 0.3 }} legend={{ show: true }} tooltip={{ header: '{x}' }}
            export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Rendimiento por centro' }} />
        )}
      </ChartPanel>

      {/* Tabla detalle */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--superficie)',
          border: '1px solid rgba(var(--tinta-rgb),0.07)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(var(--tinta-rgb),0.06)' }}>
          <h3 className="text-sm font-bold text-slate-900">Detalle por Centro</h3>
          <p className="text-xs text-slate-400 mt-0.5">Total = suma de lo que deben todas las habitaciones del centro · Pagado = lo recibido hasta ahora · Pendiente = lo que falta cobrar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(var(--tinta-rgb),0.02)', borderBottom: '1px solid rgba(var(--tinta-rgb),0.04)' }}>
                {['Centro', 'Habs.', 'Total', 'Pagado', 'Pendiente', 'Progreso'].map((h, i) => (
                  <th key={h} className={`py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest ${
                    i === 0 ? 'text-left px-6' : i === 1 ? 'text-center px-4' : i < 5 ? 'text-right px-4' : 'text-center px-4'
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rendimientoData.map((r, idx) => (
                <tr
                  key={r.fullName}
                  className="animate-fade-in-up transition-colors"
                  style={{
                    animationDelay: `${idx * 40}ms`,
                    borderBottom: '1px solid rgba(var(--tinta-rgb),0.03)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--tinta-rgb),0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(13,148,136,0.12)', color: 'var(--marca-texto)', border: '1px solid rgba(13,148,136,0.2)' }}>
                      {r.fullName}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5 text-slate-500 font-medium">{r.habitaciones}</td>
                  <td className="text-right px-4 py-3.5 text-slate-700 font-medium tabular-nums">{fmt(r.total)}</td>
                  <td className="text-right px-4 py-3.5 font-semibold tabular-nums" style={{ color: 'var(--pagado-texto)' }}>{fmt(r.pagado)}</td>
                  <td className="text-right px-4 py-3.5 font-semibold tabular-nums" style={{ color: 'var(--pendiente-texto)' }}>{fmt(r.pendiente)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5 justify-center">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--tinta-rgb),0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${r.porcentaje}%`,
                            background: r.porcentaje >= 100 ? '#10b981' : r.porcentaje >= 50 ? '#0d9488' : r.porcentaje > 0 ? '#f59e0b' : '#f43f5e',
                          }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-9 text-right"
                        style={{ color: r.porcentaje >= 100 ? '#047857' : r.porcentaje >= 50 ? '#0f766e' : r.porcentaje > 0 ? '#b45309' : '#b91c1c' }}>
                        {r.porcentaje}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {rendimientoData.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No hay datos de centros registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        {rendimientoData.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-end gap-6 text-xs"
            style={{ borderTop: '1px solid rgba(var(--tinta-rgb),0.05)', background: 'rgba(var(--tinta-rgb),0.02)' }}>
            <span className="text-slate-400">Total global:</span>
            <span className="text-slate-700 font-semibold tabular-nums">
              {fmt(rendimientoData.reduce((s, r) => s + r.total, 0))}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--pagado-texto)' }}>
              {fmt(rendimientoData.reduce((s, r) => s + r.pagado, 0))}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--pendiente-texto)' }}>
              {fmt(rendimientoData.reduce((s, r) => s + r.pendiente, 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabRendimiento;
