import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const DARK_TOOLTIP = {
  backgroundColor: '#12151f',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: '#e2e8f0',
  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.6)',
  padding: '10px 14px',
  fontSize: '13px',
};

const fmt = (value) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: 'DOP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value || 0);

const CustomBarShape = (props) => {
  const { fill, x, y, width, height } = props;
  if (!height || height <= 0) return null;
  return (
    <rect
      x={x} y={y} width={width} height={height}
      fill={fill} rx={4} ry={4}
    />
  );
};

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={DARK_TOOLTIP}>
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-white font-semibold text-sm">{fmt(p.value)}</span>
          <span className="text-gray-500 text-xs">{p.name}</span>
        </div>
      ))}
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={DARK_TOOLTIP}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: p.payload.color }} />
        <span className="text-gray-300 text-sm">{p.name}</span>
      </div>
      <p className="text-white font-bold mt-1">{fmt(p.value)}</p>
    </div>
  );
};

export const ChartSection = ({ viajes }) => {
  const [barHovered, setBarHovered] = useState(false);
  const [pieHovered, setPieHovered] = useState(false);

  const barData = viajes.map((v) => ({
    nombre:    v.nombre.length > 12 ? v.nombre.substring(0, 12) + '…' : v.nombre,
    pagado:    v.total_pagado || 0,
    pendiente: v.pendiente    || 0,
  }));

  const totalPagado    = viajes.reduce((acc, v) => acc + (v.total_pagado || 0), 0);
  const totalPendiente = viajes.reduce((acc, v) => acc + (v.pendiente    || 0), 0);
  const totalGlobal    = totalPagado + totalPendiente;
  const pct = totalGlobal > 0 ? Math.round((totalPagado / totalGlobal) * 100) : 0;

  const pieData = [
    { name: 'Pagado',    value: totalPagado,    color: '#0d9488' },
    { name: 'Pendiente', value: totalPendiente, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const cardBase = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1a1f2e',
    borderRadius: '0.75rem',
    border: '1px solid',
    padding: '1.5rem',
    transition: 'border-color 250ms ease, box-shadow 250ms ease',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Bar Chart ── */}
      <div
        className="animate-fade-in-up stagger-1"
        style={{
          ...cardBase,
          borderColor: barHovered ? 'rgba(13,148,136,0.35)' : 'rgba(255,255,255,0.07)',
          boxShadow: barHovered ? '0 8px 32px -8px rgba(13,148,136,0.15)' : 'none',
        }}
        onMouseEnter={() => setBarHovered(true)}
        onMouseLeave={() => setBarHovered(false)}
      >
        {/* Teal orb decoration */}
        <div
          className="orb w-40 h-40"
          style={{ top: '-40px', right: '-40px', background: '#0d9488', opacity: barHovered ? 0.22 : 0.12 }}
        />

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-lg bg-teal-500/12 icon-glow-teal">
              <BarChart3 className="h-4 w-4 text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Recaudación por Viaje</h3>
              <p className="text-xs text-gray-600 mt-0.5">Pagado vs Pendiente</p>
            </div>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4} barCategoryGap="38%">
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={42}
                />
                <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
                <Bar dataKey="pagado"    name="Pagado"    fill="#0d9488" radius={[4,4,0,0]} shape={<CustomBarShape />} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                <Bar dataKey="pendiente" name="Pendiente" fill="#f43f5e" radius={[4,4,0,0]} shape={<CustomBarShape />} isAnimationActive animationDuration={900} animationEasing="ease-out" animationBegin={150} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-2">
              <div className="legend-dot legend-dot-teal" />
              <span className="text-sm text-gray-400">Pagado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="legend-dot" style={{ background: '#f43f5e', animation: 'pulseGlowCyan 2s ease-in-out infinite' }} />
              <span className="text-sm text-gray-400">Pendiente</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pie Chart ── */}
      <div
        className="animate-fade-in-up stagger-2"
        style={{
          ...cardBase,
          borderColor: pieHovered ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.07)',
          boxShadow: pieHovered ? '0 8px 32px -8px rgba(245,158,11,0.15)' : 'none',
        }}
        onMouseEnter={() => setPieHovered(true)}
        onMouseLeave={() => setPieHovered(false)}
      >
        {/* Amber orb decoration */}
        <div
          className="orb orb-reverse w-44 h-44"
          style={{ bottom: '-40px', left: '-40px', background: '#f59e0b', opacity: pieHovered ? 0.18 : 0.08 }}
        />
        {/* Rose orb */}
        <div
          className="orb w-28 h-28"
          style={{ top: '10px', right: '10px', background: '#f43f5e', opacity: 0.06, animationDelay: '2s' }}
        />

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-lg bg-amber-500/12 icon-glow-amber">
              <PieChartIcon className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Resumen General</h3>
              <p className="text-xs text-gray-600 mt-0.5">Distribución global de pagos</p>
            </div>
          </div>

          <div className="h-52 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={58} outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive
                  animationDuration={950}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-white tabular-nums">{pct}%</span>
              <span className="text-xs text-gray-500 mt-0.5 font-medium tracking-wide uppercase">pagado</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-2">
              <div className="legend-dot legend-dot-teal" />
              <span className="text-sm text-gray-400">
                Pagado <span className="text-gray-600 text-xs">({fmt(totalPagado)})</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="legend-dot" style={{ background: '#f43f5e' }} />
              <span className="text-sm text-gray-400">
                Pendiente <span className="text-gray-600 text-xs">({fmt(totalPendiente)})</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
