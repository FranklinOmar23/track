import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PieChart, Pie, Cell, ScatterChart, Scatter,
} from 'recharts';
import {
  ArrowLeft, DollarSign, Building2, Users, TrendingUp,
  FileDown, Printer, BarChart2, Flame, PieChart as PieIcon, Award,
  ChevronRight,
} from 'lucide-react';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const DARK_TOOLTIP = {
  backgroundColor: '#1a1f2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

const fmt = (v, short = false) => {
  if (short && Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: 'DOP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);
};

const heatColor = (pct) => {
  if (pct === 0) return { bg: 'rgba(255,255,255,0.03)', text: '#374151' };
  if (pct < 30)  return { bg: 'rgba(13,148,136,0.15)',  text: '#5eead4' };
  if (pct < 50)  return { bg: 'rgba(13,148,136,0.3)',   text: '#2dd4bf' };
  if (pct < 70)  return { bg: 'rgba(13,148,136,0.5)',   text: '#99f6e4' };
  if (pct < 85)  return { bg: 'rgba(13,148,136,0.7)',   text: '#ccfbf1' };
  return           { bg: 'rgba(16,185,129,0.85)',        text: '#fff' };
};

const weekVal = (monthVal, mIdx, wIdx) => {
  const seed = ((mIdx * 13 + wIdx * 7 + mIdx) % 17);
  const variance = seed * 2.5 - 20;
  return Math.max(5, Math.min(100, Math.round(monthVal + variance)));
};

// ─── Count-up hook ─────────────────────────────────────────────────────────────
const useCountUp = (target, duration = 1300, enabled = true) => {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!enabled || !target) { setVal(0); return; }
    let startTs = null;
    const tick = (ts) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);
  return val;
};

// ─── Animated stat card ─────────────────────────────────────────────────────────
const StatCard = ({ label, value, displayValue, sub, icon: Icon, accentColor, accentRgb, index = 0, ready }) => {
  const animated = useCountUp(value, 1300, ready);
  const display = displayValue
    ? displayValue(animated)
    : typeof value === 'number' && value > 100
      ? fmt(animated)
      : animated;

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
const Tab = ({ id, label, icon: Icon, active, onClick }) => (
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
const ChartPanel = ({ title, subtitle, children, orbColor = '#0d9488', action }) => (
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

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyChart = ({ height = 224 }) => (
  <div className="flex flex-col items-center justify-center gap-3 text-gray-700"
    style={{ height }}>
    <BarChart2 className="h-10 w-10 opacity-30" />
    <p className="text-xs">Sin datos para mostrar</p>
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, formatter }) => {
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

// ─── Main ─────────────────────────────────────────────────────────────────────
const ReportesView = () => {
  const navigate = useNavigate();
  const { state } = useHabitacionesContext();
  const [tab, setTab]                     = useState('tendencias');
  const [viajeId, setViajeId]             = useState('');
  const [loading, setLoading]             = useState(true);
  const [pagosPorMes, setPagosPorMes]     = useState([]);
  const [porEtiqueta, setPorEtiqueta]     = useState([]);
  const [comparativa, setComparativa]     = useState([]);
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

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalRecaudado = comparativa.reduce((s, v) => s + (v.total_pagado || 0), 0);
  const totalHabs      = comparativa.reduce((s, v) => s + (v.habitaciones || 0), 0);
  const totalPax       = comparativa.reduce((s, v) => s + (v.personas || 0), 0);
  const totalPorCobrar = comparativa.reduce((s, v) => s + (v.total_por_cobrar || 0), 0);
  const tasaCobro      = totalPorCobrar > 0
    ? Number(((totalRecaudado / totalPorCobrar) * 100).toFixed(1)) : 0;

  // ── Tendencias ───────────────────────────────────────────────────────────────
  const tendenciasData = MESES.map((mes) => {
    const row = pagosPorMes.find((r) => r.mes === mes);
    const pagado = row ? Number(row.total) : 0;
    return { mes, pagado, pendiente: Math.max(0, totalPorCobrar / 12 - pagado) };
  }).filter((r) => r.pagado > 0 || r.pendiente > 0);

  const proyeccionData = MESES.map((mes, i) => {
    const actual = pagosPorMes.find((r) => r.mes === mes)?.total || null;
    const tendencia = actual !== null ? null : (() => {
      const last = pagosPorMes.slice(-1)[0]?.total || 0;
      const slope = pagosPorMes.length > 1
        ? (pagosPorMes[pagosPorMes.length - 1].total - pagosPorMes[0].total) / pagosPorMes.length
        : 0;
      return Math.max(0, last + slope * (i - (pagosPorMes.length - 1)));
    })();
    return { mes, actual: actual ? Number(actual) : null, tendencia };
  });

  // Comparativa de viajes para barchart
  const comparativaData = comparativa.slice(0, 8).map((v) => ({
    name: v.nombre.length > 12 ? v.nombre.slice(0, 12) + '…' : v.nombre,
    fullName: v.nombre,
    pagado: Number(v.total_pagado) || 0,
    pendiente: Number(v.pendiente) || 0,
    porcentaje: Number(v.porcentaje) || 0,
  }));

  // ── Heatmap ──────────────────────────────────────────────────────────────────
  const byMes = {};
  pagosMesViaje.forEach((r) => { byMes[r.mes] = (byMes[r.mes] || 0) + Number(r.total); });
  const maxMes = Math.max(...Object.values(byMes), 1);
  const mesesConDatos = MESES.filter((m) => byMes[m]);
  const heatmapMeses  = mesesConDatos.length > 0 ? mesesConDatos : MESES.slice(0, 6);
  const heatmapRows   = [1,2,3,4].map((semana) => ({
    semana: `Sem ${semana}`,
    celdas: heatmapMeses.map((mes, mIdx) => {
      const monthPct = byMes[mes] ? Math.round((byMes[mes] / maxMes) * 100) : 0;
      return { mes, val: weekVal(monthPct, mIdx, semana - 1) };
    }),
  }));

  // ── Scatter ──────────────────────────────────────────────────────────────────
  const scatterData = state.habitaciones.map((h) => ({
    x: h.personas.filter((p) => p.n).length,
    y: calcularTotalPagado(h),
    pct: calcularPorcentaje(h),
    name: `Hab ${h.num}`,
  }));

  // ── Distribución ─────────────────────────────────────────────────────────────
  const byTipo = {};
  state.habitaciones.forEach((h) => { const t = h.tipo || 'Otro'; byTipo[t] = (byTipo[t] || 0) + 1; });
  const TIPO_COLORS = ['#0d9488', '#8b5cf6', '#f97316', '#3b82f6', '#f43f5e'];
  const tipoData = Object.entries(byTipo).map(([name, value], i) => ({ name, value, color: TIPO_COLORS[i % TIPO_COLORS.length] }));

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
    { name: 'Sin pagos',      value: sinPagos,   color: '#f43f5e' },
    { name: 'Bajo (1–25%)',   value: bajo,       color: '#f97316' },
    { name: 'Medio (26–50%)', value: medio,      color: '#8b5cf6' },
    { name: 'Alto (51–99%)',  value: alto,       color: '#3b82f6' },
    { name: 'Completado',     value: completado, color: '#10b981' },
  ].filter((d) => d.value > 0);

  // ── Rendimiento ──────────────────────────────────────────────────────────────
  const rendimientoData = porEtiqueta.map((r) => ({
    name: r.etiqueta.length > 16 ? r.etiqueta.slice(0, 16) + '…' : r.etiqueta,
    fullName: r.etiqueta,
    pagado: Number(r.total_pagado) || 0,
    pendiente: Number(r.pendiente) || 0,
    total: Number(r.total_por_cobrar) || 0,
    habitaciones: r.habitaciones,
    personas: r.personas,
    porcentaje: Number(r.porcentaje) || 0,
  }));

  // ── Exports ──────────────────────────────────────────────────────────────────
  const handleExportPDF   = () => window.print();
  const handleExportExcel = () => {
    const viajeActual = viajes.find((v) => String(v.id) === String(viajeId));
    exportarHabitacionesExcel(state.habitaciones, viajeActual);
  };

  const ready = !loading;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="orb w-[500px] h-[500px]"
          style={{ top: '-150px', right: '-100px', background: '#0d9488', opacity: 0.04 }} />
        <div className="orb-reverse w-[400px] h-[400px]"
          style={{ bottom: '-100px', left: '-100px', background: '#8b5cf6', opacity: 0.04 }} />
        <div className="bg-dot-grid absolute inset-0" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="no-print flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9ca3af',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div>
              <h1 className="text-xl font-bold gradient-text">Reportes & Análisis</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Rendimiento financiero · {comparativa.length} viajes · {totalHabs} habitaciones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <select
              value={viajeId}
              onChange={(e) => setViajeId(e.target.value)}
              className="input-dark text-sm"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="">Todos los viajes</option>
              {viajes.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
            <button
              onClick={handleExportPDF}
              className="btn-modal-secondary flex items-center gap-1.5 text-sm"
              style={{ padding: '0.45rem 0.875rem' }}
            >
              <Printer className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Recaudado"
            value={totalRecaudado}
            displayValue={(v) => fmt(v)}
            icon={DollarSign}
            accentColor="#10b981"
            accentRgb="16,185,129"
            index={0}
            ready={ready}
          />
          <StatCard
            label="Habitaciones Activas"
            value={totalHabs}
            sub={`En ${comparativa.length} viaje${comparativa.length !== 1 ? 's' : ''}`}
            icon={Building2}
            accentColor="#3b82f6"
            accentRgb="59,130,246"
            index={1}
            ready={ready}
          />
          <StatCard
            label="Pasajeros"
            value={totalPax}
            sub={totalHabs > 0 ? `~${(totalPax / totalHabs).toFixed(1)} por habitación` : ''}
            icon={Users}
            accentColor="#8b5cf6"
            accentRgb="139,92,246"
            index={2}
            ready={ready}
          />
          <StatCard
            label="Tasa de Cobro"
            value={tasaCobro}
            displayValue={(v) => `${v}%`}
            sub={`De ${fmt(totalPorCobrar)} por cobrar`}
            icon={TrendingUp}
            accentColor={tasaCobro >= 50 ? '#10b981' : '#f59e0b'}
            accentRgb={tasaCobro >= 50 ? '16,185,129' : '245,158,11'}
            index={3}
            ready={ready}
          />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6 no-print overflow-x-auto pb-1">
          <Tab id="tendencias"   label="Tendencias"    icon={TrendingUp} active={tab === 'tendencias'}   onClick={setTab} />
          <Tab id="heatmap"      label="Mapa de Calor" icon={Flame}      active={tab === 'heatmap'}      onClick={setTab} />
          <Tab id="distribucion" label="Distribución"  icon={PieIcon}    active={tab === 'distribucion'} onClick={setTab} />
          <Tab id="rendimiento"  label="Rendimiento"   icon={Award}      active={tab === 'rendimiento'}  onClick={setTab} />
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0,1].map((i) => (
              <div key={i} className="rounded-2xl h-72 animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── TENDENCIAS ──────────────────────────────────────────────────── */}
            {tab === 'tendencias' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Evolución */}
                  <ChartPanel
                    title="Evolución de Recaudación"
                    subtitle="Dinero cobrado (verde) vs lo que falta por cobrar (rojo) en cada mes registrado"
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
                            <Area type="monotone" dataKey="pendiente" stroke="#f43f5e" fill="url(#gPendiente)" strokeWidth={2} name="Pendiente" isAnimationActive animationDuration={900} animationEasing="ease-out" />
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
            )}

            {/* ── MAPA DE CALOR ─────────────────────────────────────────────── */}
            {tab === 'heatmap' && (
              <div className="space-y-6 animate-fade-in">
                <ChartPanel title="Mapa de Calor — Actividad de Pagos" subtitle="Qué tan activo fue cada mes en cobros: más verde = más dinero recibido ese mes (semanas son estimadas)" orbColor="#0d9488">
                  {/* Legend */}
                  <div className="flex items-center justify-end gap-1.5 mb-4 text-[11px] text-gray-600">
                    <span>Menos</span>
                    {[10,30,55,75,92].map((v) => {
                      const c = heatColor(v);
                      return <div key={v} className="w-5 h-5 rounded" style={{ background: c.bg, border: '1px solid rgba(255,255,255,0.06)' }} />;
                    })}
                    <span>Más</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left text-gray-600 font-medium pb-2 pr-4 w-14" />
                          {heatmapMeses.map((m) => (
                            <th key={m} className="text-center text-gray-500 font-semibold pb-2 px-1">{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapRows.map(({ semana, celdas }) => (
                          <tr key={semana}>
                            <td className="text-gray-600 font-medium pr-4 py-1 text-[11px]">{semana}</td>
                            {celdas.map(({ mes, val }) => {
                              const c = heatColor(val);
                              return (
                                <td key={mes} className="px-1 py-1">
                                  <div className="rounded-lg text-center py-2 px-1 font-semibold min-w-[52px] text-[11px] transition-all duration-200"
                                    style={{ background: c.bg, color: c.text, border: '1px solid rgba(255,255,255,0.04)' }}>
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
            )}

            {/* ── DISTRIBUCIÓN ──────────────────────────────────────────────── */}
            {tab === 'distribucion' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                <ChartPanel title="Distribución por Tipo" subtitle="Cuántas habitaciones hay de cada tipo (Single, Doble, Triple) en el viaje seleccionado" orbColor="#0d9488">
                  {tipoData.length === 0 ? <EmptyChart /> : (
                    <>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={tipoData} cx="50%" cy="50%" innerRadius={52} outerRadius={82}
                              paddingAngle={4} dataKey="value" strokeWidth={0}
                              isAnimationActive animationDuration={800} animationEasing="ease-out"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}>
                              {tipoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip contentStyle={DARK_TOOLTIP} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {tipoData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name}: <span className="text-white font-semibold ml-0.5">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ChartPanel>

                <ChartPanel title="Estado de Pagos" subtitle="Cuántas habitaciones están en cada etapa: sin pago alguno, pagando parcialmente, o ya completas" orbColor="#8b5cf6">
                  {estadoData.length === 0 ? <EmptyChart /> : (
                    <>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={estadoData} cx="50%" cy="50%" outerRadius={82}
                              paddingAngle={3} dataKey="value" strokeWidth={0}
                              isAnimationActive animationDuration={800} animationEasing="ease-out"
                              label={({ name, value }) => `${value}`}
                              labelLine={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}>
                              {estadoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip contentStyle={DARK_TOOLTIP} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {estadoData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name}: <span className="text-white font-semibold ml-0.5">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ChartPanel>
              </div>
            )}

            {/* ── RENDIMIENTO ───────────────────────────────────────────────── */}
            {tab === 'rendimiento' && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportesView;
