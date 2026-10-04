import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts';
import { ChartPanel, EmptyChart } from '../ui';
import { DARK_TOOLTIP, heatColor } from '../datosReportes';

const TabMapaCalor = ({ datos, fmt }) => {
  const { heatmapMeses, heatmapRows, scatterData } = datos;
  return (
    <div className="space-y-6 animate-fade-in">
      <ChartPanel title="Mapa de Calor — Actividad de Pagos" subtitle="Dinero cobrado por viaje en cada mes · más verde = más dinero recibido (top 10 viajes)" orbColor="#0d9488">
        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mb-4 text-[11px] text-gray-600">
          <span>Menos</span>
          {[10,30,55,75,92].map((v) => {
            const c = heatColor(v);
            return <div key={v} className="w-5 h-5 rounded" style={{ background: c.bg, border: '1px solid rgba(255,255,255,0.06)' }} />;
          })}
          <span>Más</span>
        </div>
        {heatmapRows.length === 0 ? <EmptyChart /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-gray-600 font-medium pb-2 pr-4" />
                  {heatmapMeses.map((m) => (
                    <th key={m} className="text-center text-gray-500 font-semibold pb-2 px-1">{m}</th>
                  ))}
                  <th className="text-right text-gray-500 font-semibold pb-2 pl-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map(({ viaje, total, celdas }) => (
                  <tr key={viaje}>
                    <td className="text-gray-400 font-medium pr-4 py-1 text-[11px] max-w-[160px] truncate" title={viaje}>{viaje}</td>
                    {celdas.map(({ mes, total: monto, val }) => {
                      const c = heatColor(val);
                      return (
                        <td key={mes} className="px-1 py-1">
                          <div className="rounded-lg text-center py-2 px-1 font-semibold min-w-[56px] text-[11px] transition-all duration-200"
                            title={`${viaje} · ${mes}: ${fmt(monto)}`}
                            style={{ background: c.bg, color: c.text, border: '1px solid rgba(255,255,255,0.04)' }}>
                            {monto > 0 ? fmt(monto, true) : '—'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-right text-gray-300 font-semibold pl-3 tabular-nums">{fmt(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartPanel>

      <ChartPanel title="Análisis de Habitaciones" subtitle="Cada punto = una habitación · Eje X: personas que tiene · Eje Y: cuánto han pagado · Color = estado de pago" orbColor="#f97316">
        {scatterData.length === 0 ? <EmptyChart /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="x" name="Personas" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false}
                  label={{ value: 'Personas en habitación', position: 'insideBottom', offset: -12, fill: '#4b5563', fontSize: 11 }} />
                <YAxis dataKey="y" name="Pagado" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => fmt(v, true)} width={44} />
                <Tooltip
                  contentStyle={DARK_TOOLTIP}
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.08)' }}
                  formatter={(v, name) => [name === 'Pagado' ? fmt(v) : v, name]}
                />
                <Scatter data={scatterData} name="Habitaciones">
                  {scatterData.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.pct >= 100 ? '#10b981' : entry.pct >= 50 ? '#3b82f6' : entry.pct > 0 ? '#f97316' : '#f43f5e'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex flex-wrap gap-4 mt-3">
          {[
            { color: '#f43f5e', label: 'Sin pagos' },
            { color: '#f97316', label: 'En progreso (<50%)' },
            { color: '#3b82f6', label: 'Avanzado (≥50%)' },
            { color: '#10b981', label: 'Completado' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color, opacity: 0.85 }} />
              {l.label}
            </div>
          ))}
        </div>
      </ChartPanel>
    </div>
  );
};

export default TabMapaCalor;
