import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartPanel, EmptyChart, CustomTooltip } from '../ui';

const TabTendencias = ({ datos, fmt }) => {
  const { tendenciasData, proyeccionData, comparativaData } = datos;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución */}
        <ChartPanel
          title="Evolución de Recaudación"
          subtitle="Dinero cobrado en cada mes (verde) y total acumulado (morado)"
          orbColor="#0d9488"
        >
          {tendenciasData.length === 0 ? <EmptyChart /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tendenciasData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gPagado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gPendiente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => fmt(v, true)} width={44} />
                  <Tooltip content={<CustomTooltip formatter={(v) => fmt(v)} />} />
                  <Area type="monotone" dataKey="pagado"    stroke="#0d9488" fill="url(#gPagado)"    strokeWidth={2} name="Pagado"    isAnimationActive animationDuration={900} animationEasing="ease-out" />
                  <Area type="monotone" dataKey="acumulado" stroke="#6366f1" fill="url(#gPendiente)" strokeWidth={2} name="Acumulado" isAnimationActive animationDuration={900} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Pagado
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Pendiente
            </div>
          </div>
        </ChartPanel>

        {/* Proyección */}
        <ChartPanel
          title="Proyección de Cobro"
          subtitle="Línea sólida = cobros reales · Línea punteada = estimación si el ritmo continúa igual"
          orbColor="#6366f1"
        >
          {proyeccionData.every((d) => !d.actual && !d.tendencia) ? <EmptyChart /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={proyeccionData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => fmt(v, true)} width={44} />
                  <Tooltip content={<CustomTooltip formatter={(v) => v ? fmt(v) : '—'} />} />
                  <Line type="monotone" dataKey="actual"    stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 0 }} name="Real"      connectNulls={false} isAnimationActive animationDuration={900} />
                  <Line type="monotone" dataKey="tendencia" stroke="#6366f1" strokeWidth={2}   strokeDasharray="6 4" dot={false} name="Proyección" connectNulls isAnimationActive animationDuration={900} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Real
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2.5 h-[2px] bg-indigo-400 self-center" style={{ borderTop: '2px dashed #6366f1' }} /> Proyección
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* Comparativa de viajes */}
      {comparativaData.length > 0 && (
        <ChartPanel
          title="Comparativa entre Viajes"
          subtitle="Cuánto se ha cobrado (verde) y cuánto falta (rojo) en cada viaje — útil para ver cuál va mejor"
          orbColor="#f97316"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativaData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => fmt(v, true)} width={44} />
                <Tooltip content={<CustomTooltip formatter={(v) => fmt(v)} />} />
                <Bar dataKey="pagado"    fill="#0d9488" radius={[5,5,0,0]} name="Pagado"    isAnimationActive animationDuration={700} animationEasing="ease-out" />
                <Bar dataKey="pendiente" fill="#f43f5e" radius={[5,5,0,0]} name="Pendiente" isAnimationActive animationDuration={700} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded bg-teal-500" /> Pagado</div>
            <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded bg-rose-500" /> Pendiente</div>
          </div>
        </ChartPanel>
      )}
    </div>
  );
};

export default TabTendencias;
