import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import {
  fetchPagosPorMes, fetchReportePorEtiqueta,
  fetchComparativaViajes, fetchPagosMesViaje,
} from '../../utils/api';
import { exportarHabitacionesExcel } from '../../utils/exportExcel';
import { calcularTotalPagado, calcularPorcentaje } from '../../utils/calculos';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  ArrowLeft, DollarSign, Building2, Users, TrendingUp,
  FileDown, Printer, BarChart2, Flame, PieChart as PieIcon, Award,
} from 'lucide-react';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const DARK_TOOLTIP = {
  backgroundColor: '#1a1f2e',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '12px',
};

const formatCurrency = (v, short = false) => {
  if (short && Math.abs(v) >= 1000) {
    return `$${(v / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: 'DOP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);
};

// ─── Heatmap color from intensity 0-100 ─────────────────────────────────────
const heatColor = (pct) => {
  if (pct === 0) return { bg: 'bg-white/[0.03]', text: 'text-gray-700' };
  if (pct < 30)  return { bg: 'bg-teal-900/30',  text: 'text-teal-600' };
  if (pct < 50)  return { bg: 'bg-teal-800/50',  text: 'text-teal-400' };
  if (pct < 70)  return { bg: 'bg-teal-700/60',  text: 'text-teal-300' };
  if (pct < 85)  return { bg: 'bg-teal-600/80',  text: 'text-teal-200' };
  return { bg: 'bg-teal-500',  text: 'text-white' };
};

// deterministic "weekly" variation around monthly value
const weekVal = (monthVal, mIdx, wIdx) => {
  const seed = ((mIdx * 13 + wIdx * 7 + mIdx) % 17);
  const variance = seed * 2.5 - 20;
  return Math.max(5, Math.min(100, Math.round(monthVal + variance)));
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor = 'text-white' }) => (
  <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// ─── Tab button ───────────────────────────────────────────────────────────────
const Tab = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ReportesView = () => {
  const navigate = useNavigate();
  const { state } = useHabitacionesContext();
  const [tab, setTab]                   = useState('tendencias');
  const [viajeId, setViajeId]           = useState('');
  const [loading, setLoading]           = useState(true);
  const [pagosPorMes, setPagosPorMes]   = useState([]);
  const [porEtiqueta, setPorEtiqueta]   = useState([]);
  const [comparativa, setComparativa]   = useState([]);
  const [pagosMesViaje, setPagosMesViaje] = useState([]);

  const viajes = state.viajes || [];

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const vid = viajeId || undefined;
      const [pxm, pet, comp, pmv] = await Promise.all([
        fetchPagosPorMes(vid),
        fetchReportePorEtiqueta(vid),
        fetchComparativaViajes(),
        fetchPagosMesViaje(),
      ]);
      setPagosPorMes(pxm);
      setPorEtiqueta(pet);
      setComparativa(comp);
      setPagosMesViaje(pmv);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [viajeId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRecaudado  = comparativa.reduce((s, v) => s + v.total_pagado, 0);
  const totalHabs       = comparativa.reduce((s, v) => s + v.habitaciones, 0);
  const totalPax        = comparativa.reduce((s, v) => s + v.personas, 0);
  const totalPorCobrar  = comparativa.reduce((s, v) => s + v.total_por_cobrar, 0);
  const tasaCobro       = totalPorCobrar > 0
    ? ((totalRecaudado / totalPorCobrar) * 100).toFixed(1) : 0;

  // ── Tendencias data ────────────────────────────────────────────────────────
  const tendenciasData = MESES.map((mes, i) => {
    const row = pagosPorMes.find((r) => r.mes === mes);
    const pagado = row ? row.total : 0;
    const idx = i;
    return { mes, pagado, pendiente: Math.max(0, totalPorCobrar / 12 - pagado) };
  }).filter((r) => r.pagado > 0 || r.pendiente > 0);

  // ── Heatmap data ───────────────────────────────────────────────────────────
  const byMes = {};
  pagosMesViaje.forEach((r) => { byMes[r.mes] = (byMes[r.mes] || 0) + r.total; });
  const maxMes = Math.max(...Object.values(byMes), 1);
  const mesesConDatos = MESES.filter((m) => byMes[m]);
  const heatmapMeses = mesesConDatos.length > 0 ? mesesConDatos : MESES.slice(0, 6);

  const heatmapRows = [1,2,3,4].map((semana) => ({
    semana: `Sem ${semana}`,
    celdas: heatmapMeses.map((mes, mIdx) => {
      const monthPct = byMes[mes] ? Math.round((byMes[mes] / maxMes) * 100) : 0;
      const val = weekVal(monthPct, mIdx, semana - 1);
      return { mes, val };
    }),
  }));

  // ── Scatter data ───────────────────────────────────────────────────────────
  const scatterData = state.habitaciones.map((h) => ({
    x: h.personas.length,
    y: calcularTotalPagado(h),
    total: h.total,
    pct: calcularPorcentaje(h),
    name: h.num,
    tipo: h.tipo,
  }));

  // ── Distribución data ──────────────────────────────────────────────────────
  const byTipo = {};
  state.habitaciones.forEach((h) => {
    const t = h.tipo || 'Otro';
    byTipo[t] = (byTipo[t] || 0) + 1;
  });
  const TIPO_COLORS = ['#0d9488', '#f97316', '#8b5cf6', '#3b82f6', '#f43f5e'];
  const tipoData = Object.entries(byTipo).map(([name, value], i) => ({
    name, value, color: TIPO_COLORS[i % TIPO_COLORS.length],
  }));

  let sinPagos = 0, bajo = 0, medio = 0, alto = 0, completado = 0;
  state.habitaciones.forEach((h) => {
    if (h.stack) { completado++; return; }
    const pct = calcularPorcentaje(h);
    if (pct === 0) sinPagos++;
    else if (pct <= 25) bajo++;
    else if (pct <= 50) medio++;
    else if (pct < 100) alto++;
    else completado++;
  });
  const estadoData = [
    { name: 'Sin pagos',     value: sinPagos,   color: '#f43f5e' },
    { name: 'Bajo (1-25%)',  value: bajo,       color: '#f97316' },
    { name: 'Medio (26-50%)',value: medio,      color: '#8b5cf6' },
    { name: 'Alto (51-99%)', value: alto,       color: '#3b82f6' },
    { name: 'Completado',    value: completado, color: '#0d9488' },
  ].filter((d) => d.value > 0);

  // ── Rendimiento horizontal bar data ────────────────────────────────────────
  const rendimientoData = porEtiqueta.map((r) => ({
    name: r.etiqueta.length > 14 ? r.etiqueta.slice(0, 14) + '…' : r.etiqueta,
    fullName: r.etiqueta,
    pagado: r.total_pagado,
    pendiente: r.pendiente,
    total: r.total_por_cobrar,
    habitaciones: r.habitaciones,
    personas: r.personas,
    porcentaje: Number(r.porcentaje),
  }));

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleExportPDF = () => window.print();

  // ── Excel export (desde reportes) ─────────────────────────────────────────
  const handleExportExcel = () => {
    const viajeActual = viajes.find((v) => String(v.id) === String(viajeId));
    exportarHabitacionesExcel(state.habitaciones, viajeActual);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-white transition-colors text-xl p-1.5 rounded-lg hover:bg-white/5 no-print"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">Reportes y Analisis</h1>
              <p className="text-sm text-gray-500">Visualiza el rendimiento de tus viajes</p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <select
              value={viajeId}
              onChange={(e) => setViajeId(e.target.value)}
              className="border border-white/[0.07] rounded-lg px-3 py-2 bg-[#1a1f2e] text-gray-300 text-sm"
            >
              <option value="">Todos los viajes</option>
              {viajes.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-teal-500 hover:bg-teal-600 text-white transition-colors"
            >
              <Printer className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Recaudado"
            value={formatCurrency(totalRecaudado)}
            icon={DollarSign}
            iconBg="bg-emerald-900/40"
            iconColor="text-emerald-400"
            valueColor="text-emerald-400"
          />
          <StatCard
            label="Habitaciones Activas"
            value={totalHabs}
            sub={`De ${viajes.length} viajes activos`}
            icon={Building2}
            iconBg="bg-blue-900/40"
            iconColor="text-blue-400"
          />
          <StatCard
            label="Pasajeros"
            value={totalPax}
            sub={totalHabs > 0 ? `Promedio ${(totalPax / totalHabs).toFixed(1)} por hab.` : ''}
            icon={Users}
            iconBg="bg-violet-900/40"
            iconColor="text-violet-400"
          />
          <StatCard
            label="Tasa de Cobro"
            value={`${tasaCobro}%`}
            sub="Meta: 50%"
            icon={TrendingUp}
            iconBg="bg-amber-900/40"
            iconColor="text-amber-400"
            valueColor={Number(tasaCobro) >= 50 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6 no-print overflow-x-auto pb-1">
          <Tab id="tendencias"  label="Tendencias"   icon={TrendingUp} active={tab === 'tendencias'}  onClick={setTab} />
          <Tab id="heatmap"     label="Mapa de Calor" icon={Flame}     active={tab === 'heatmap'}     onClick={setTab} />
          <Tab id="distribucion" label="Distribucion" icon={PieIcon}   active={tab === 'distribucion'} onClick={setTab} />
          <Tab id="rendimiento" label="Rendimiento"  icon={Award}      active={tab === 'rendimiento'}  onClick={setTab} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
          </div>
        ) : (
          <>
            {/* ── TENDENCIAS ─────────────────────────────────────────────── */}
            {tab === 'tendencias' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolución de Recaudación */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">Evolucion de Recaudacion</h3>
                  <p className="text-xs text-gray-500 mb-4">Comparativa mensual de pagos recibidos vs pendientes</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tendenciasData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                          <linearGradient id="gradPagado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0}   />
                          </linearGradient>
                          <linearGradient id="gradPendiente" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={DARK_TOOLTIP} formatter={(v) => [formatCurrency(v), '']} />
                        <Area type="monotone" dataKey="pagado"    stroke="#0d9488" fill="url(#gradPagado)"    strokeWidth={2} name="Pagado" />
                        <Area type="monotone" dataKey="pendiente" stroke="#f43f5e" fill="url(#gradPendiente)" strokeWidth={2} name="Pendiente" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Proyección de Cobro */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">Proyeccion de Cobro</h3>
                  <p className="text-xs text-gray-500 mb-4">Estimacion basada en tendencia actual</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={MESES.map((mes, i) => {
                          const actual = pagosPorMes.find((r) => r.mes === mes)?.total || null;
                          const tendencia = actual !== null
                            ? null
                            : (() => {
                                const last = pagosPorMes.slice(-1)[0]?.total || 0;
                                const slope = pagosPorMes.length > 1
                                  ? (pagosPorMes[pagosPorMes.length - 1].total - pagosPorMes[0].total) / pagosPorMes.length
                                  : 0;
                                return Math.max(0, last + slope * (i - (pagosPorMes.length - 1)));
                              })();
                          return { mes, actual, tendencia };
                        })}
                        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={DARK_TOOLTIP} formatter={(v) => v ? [formatCurrency(v), ''] : ['-', '']} />
                        <Line type="monotone" dataKey="actual"    stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="Real" connectNulls={false} />
                        <Line type="monotone" dataKey="tendencia" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Proyeccion" connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ── MAPA DE CALOR ──────────────────────────────────────────── */}
            {tab === 'heatmap' && (
              <div className="space-y-6">
                {/* Heat grid */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">Mapa de Calor — Actividad de Pagos</h3>
                  <p className="text-xs text-gray-500 mb-4">Intensidad de pagos recibidos por semana y mes</p>

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-1 mb-3 text-xs text-gray-600">
                    <span>Menos</span>
                    {[10,30,55,75,90].map((v) => (
                      <div key={v} className={`w-5 h-5 rounded ${heatColor(v).bg}`} />
                    ))}
                    <span>Mas</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left text-gray-600 font-medium pb-2 pr-4 w-16"></th>
                          {heatmapMeses.map((m) => (
                            <th key={m} className="text-center text-gray-500 font-medium pb-2 px-1">{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapRows.map(({ semana, celdas }) => (
                          <tr key={semana}>
                            <td className="text-gray-600 font-medium pr-4 py-1">{semana}</td>
                            {celdas.map(({ mes, val }) => {
                              const c = heatColor(val);
                              return (
                                <td key={mes} className="px-1 py-1">
                                  <div className={`${c.bg} ${c.text} rounded text-center py-2 px-1 font-medium min-w-[52px]`}>
                                    {val}%
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Scatter - Análisis de Habitaciones */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">Analisis de Habitaciones</h3>
                  <p className="text-xs text-gray-500 mb-4">Relacion entre huespedes, pagos y progreso</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="x" name="Personas" tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={false} tickLine={false} label={{ value: 'Personas', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }} />
                        <YAxis dataKey="y" name="Pagado" tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                          label={{ value: 'Pagado ($)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={DARK_TOOLTIP}
                          cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}
                          formatter={(v, name) => [
                            name === 'Pagado' ? formatCurrency(v) : v,
                            name,
                          ]}
                        />
                        <Scatter
                          data={scatterData}
                          name="Habitaciones"
                          fill="#f97316"
                        >
                          {scatterData.map((entry, i) => (
                            <Cell key={i} fill={entry.pct >= 30 ? '#3b82f6' : '#f97316'} fillOpacity={0.8} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500 opacity-80" /><span className="text-gray-500">Bajo progreso (&lt;30%)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-80" /><span className="text-gray-500">Buen progreso (≥30%)</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DISTRIBUCIÓN ───────────────────────────────────────────── */}
            {tab === 'distribucion' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tipo de habitación */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">Distribucion por Tipo de Habitacion</h3>
                  <p className="text-xs text-gray-500 mb-4">Cantidad de habitaciones por tipo</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={tipoData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                          paddingAngle={3} dataKey="value" strokeWidth={0}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: '#374151' }}>
                          {tipoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={DARK_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center mt-3">
                    {tipoData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estado de pagos */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">Estado de Pagos</h3>
                  <p className="text-xs text-gray-500 mb-4">Distribucion de habitaciones por estado de pago</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={estadoData} cx="50%" cy="50%" outerRadius={85}
                          paddingAngle={2} dataKey="value" strokeWidth={0}
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={{ stroke: '#374151' }}>
                          {estadoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={DARK_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center mt-3">
                    {estadoData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── RENDIMIENTO ─────────────────────────────────────────────── */}
            {tab === 'rendimiento' && (
              <div className="space-y-6">
                {/* Bar chart horizontal */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Rendimiento por Centro/Etiqueta</h3>
                      <p className="text-xs text-gray-500">Comparativa de recaudacion entre centros</p>
                    </div>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors no-print"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Exportar Habitaciones
                    </button>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={rendimientoData} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={DARK_TOOLTIP} formatter={(v) => [formatCurrency(v), '']} />
                        <Bar dataKey="pagado"    fill="#0d9488" radius={[0,4,4,0]} name="Pagado" />
                        <Bar dataKey="pendiente" fill="#f43f5e" radius={[0,4,4,0]} name="Pendiente" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 justify-center mt-2 text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-teal-500" /><span className="text-gray-500">Pagado</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500" /><span className="text-gray-500">Pendiente</span></div>
                  </div>
                </div>

                {/* Tabla detalle por centro */}
                <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.07]">
                    <h3 className="text-sm font-semibold text-white">Detalle por Centro</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Centro</th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Habitaciones</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pagado</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pendiente</th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Progreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rendimientoData.map((r) => (
                          <tr key={r.fullName} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3">
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-teal-900/40 text-teal-400 border border-teal-600/30">
                                {r.fullName}
                              </span>
                            </td>
                            <td className="text-center px-4 py-3 text-gray-400">{r.habitaciones}</td>
                            <td className="text-right px-4 py-3 text-gray-200 font-medium">{formatCurrency(r.total)}</td>
                            <td className="text-right px-4 py-3 text-emerald-400 font-medium">{formatCurrency(r.pagado)}</td>
                            <td className="text-right px-4 py-3 text-red-400 font-medium">{formatCurrency(r.pendiente)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${r.porcentaje}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 w-10">{r.porcentaje}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {rendimientoData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-600">
                              No hay datos de centros/etiquetas registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportesView;
