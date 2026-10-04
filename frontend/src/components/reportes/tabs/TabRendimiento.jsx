import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown } from 'lucide-react';
import { ChartPanel, EmptyChart, CustomTooltip } from '../ui';

const TabRendimiento = ({ datos, fmt, handleExportExcel }) => {
  const { rendimientoData } = datos;
  return (
    <div className="space-y-6 animate-fade-in">
      <ChartPanel
        title="Rendimiento por Centro / Etiqueta"
        subtitle="Comparativa de cobros por cada centro o grupo — barras verdes = cobrado, rojas = pendiente"
        orbColor="#f59e0b"
        action={
          <button
            onClick={handleExportExcel}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(16,185,129,0.1)',
              color: '#34d399',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <FileDown className="h-3.5 w-3.5" /> Excel
          </button>
        }
      >
        {rendimientoData.length === 0 ? <EmptyChart height={200} /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={rendimientoData} margin={{ top: 5, right: 24, bottom: 0, left: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => fmt(v, true)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip formatter={(v) => fmt(v)} />} />
                <Bar dataKey="pagado"    fill="#0d9488" radius={[0,5,5,0]} name="Pagado"    isAnimationActive animationDuration={700} animationEasing="ease-out" />
                <Bar dataKey="pendiente" fill="#f43f5e" radius={[0,5,5,0]} name="Pendiente" isAnimationActive animationDuration={700} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex gap-5 mt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded bg-teal-500" /> Pagado</div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded bg-rose-500" /> Pendiente</div>
        </div>
      </ChartPanel>

      {/* Tabla detalle */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-bold text-white">Detalle por Centro</h3>
          <p className="text-xs text-gray-600 mt-0.5">Total = suma de lo que deben todas las habitaciones del centro · Pagado = lo recibido hasta ahora · Pendiente = lo que falta cobrar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Centro', 'Habs.', 'Total', 'Pagado', 'Pendiente', 'Progreso'].map((h, i) => (
                  <th key={h} className={`py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-widest ${
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
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(13,148,136,0.12)', color: '#5eead4', border: '1px solid rgba(13,148,136,0.2)' }}>
                      {r.fullName}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5 text-gray-400 font-medium">{r.habitaciones}</td>
                  <td className="text-right px-4 py-3.5 text-gray-300 font-medium tabular-nums">{fmt(r.total)}</td>
                  <td className="text-right px-4 py-3.5 font-semibold tabular-nums" style={{ color: '#34d399' }}>{fmt(r.pagado)}</td>
                  <td className="text-right px-4 py-3.5 font-semibold tabular-nums" style={{ color: '#fb7185' }}>{fmt(r.pendiente)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5 justify-center">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${r.porcentaje}%`,
                            background: r.porcentaje >= 100 ? '#10b981' : r.porcentaje >= 50 ? '#0d9488' : r.porcentaje > 0 ? '#f59e0b' : '#f43f5e',
                          }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-9 text-right"
                        style={{ color: r.porcentaje >= 100 ? '#34d399' : r.porcentaje >= 50 ? '#2dd4bf' : r.porcentaje > 0 ? '#fbbf24' : '#fb7185' }}>
                        {r.porcentaje}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {rendimientoData.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-700">
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
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-gray-600">Total global:</span>
            <span className="text-gray-300 font-semibold tabular-nums">
              {fmt(rendimientoData.reduce((s, r) => s + r.total, 0))}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: '#34d399' }}>
              {fmt(rendimientoData.reduce((s, r) => s + r.pagado, 0))}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: '#fb7185' }}>
              {fmt(rendimientoData.reduce((s, r) => s + r.pendiente, 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabRendimiento;
