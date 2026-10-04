import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Wallet, Hourglass, Percent, FileDown, AlertCircle, Lock } from 'lucide-react';
import { fetchReporteGanancias } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { exportarGananciasExcel } from '../../utils/exportExcel';

const DARK_TOOLTIP = {
  backgroundColor: '#1a1f2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
};

const COLOR_ESTIMADA = '#10b981';
const COLOR_COBRADA  = '#0d9488';
const COLOR_RESORT   = '#14b8a6';
const COLOR_TOUR     = '#06b6d4';

const Panel = ({ title, subtitle, action, children }) => (
  <div
    className="relative rounded-2xl overflow-hidden p-6"
    style={{
      background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
    }}
  >
    <div className="flex items-start justify-between gap-3 mb-1">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {action}
    </div>
    {subtitle && <p className="text-xs text-gray-600 mb-5">{subtitle}</p>}
    {children}
  </div>
);

const Kpi = ({ label, value, sub, icon: Icon, color }) => (
  <div className="rounded-2xl p-5"
    style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{label}</span>
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
    <p className="text-2xl font-bold tabular-nums truncate" style={{ color }}>{value}</p>
    {sub && <p className="text-xs text-gray-600 mt-1 truncate">{sub}</p>}
  </div>
);

const describirMargen = (v, fmt) =>
  v.ganancia_tipo === 'porcentaje' ? `${v.ganancia_valor}% del total`
    : v.ganancia_tipo === 'por_persona' ? `${fmt(v.ganancia_valor)} × ${v.pax} pax`
      : 'Sin configurar';

const recortar = (s, n = 14) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Reporte de ganancias por viaje. Agrupa por divisa porque no se pueden sumar USD con DOP. */
const GananciasReporte = ({ viajeId }) => {
  const [datos, setDatos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [estado, setEstado]     = useState('todos');
  const [divisaSel, setDivisaSel] = useState('');

  useEffect(() => {
    let cancelado = false;
    fetchReporteGanancias()
      .then((rows) => { if (!cancelado) setDatos(rows); })
      .catch((err) => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  // Divisas disponibles, la más usada primero
  const divisas = useMemo(() => {
    const conteo = {};
    datos.forEach((v) => { conteo[v.divisa] = (conteo[v.divisa] || 0) + 1; });
    return Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]);
  }, [datos]);

  const divisa = divisaSel || divisas[0] || 'USD';
  const fmt = (n) => formatCurrency(n, divisa);

  const filtrados = datos.filter((v) =>
    (!viajeId || String(v.id) === String(viajeId)) &&
    (viajeId || v.divisa === divisa) &&
    (estado === 'todos' || (estado === 'cerrado' ? v.estado === 'cerrado' : v.estado !== 'cerrado'))
  );
  const configurados   = filtrados.filter((v) => v.ganancia_tipo !== 'ninguna');
  const sinConfigurar  = filtrados.filter((v) => v.ganancia_tipo === 'ninguna');

  const totalEstimada = configurados.reduce((s, v) => s + v.ganancia_estimada, 0);
  const totalCobrada  = configurados.reduce((s, v) => s + v.ganancia_cobrada, 0);
  const totalBase     = configurados.reduce((s, v) => s + v.total_por_cobrar, 0);
  const margenProm    = totalBase > 0 ? (totalEstimada / totalBase) * 100 : 0;

  const barras = [...configurados]
    .sort((a, b) => b.ganancia_estimada - a.ganancia_estimada)
    .slice(0, 10)
    .map((v) => ({ nombre: recortar(v.nombre), completo: v.nombre, Estimada: v.ganancia_estimada, Cobrada: v.ganancia_cobrada }));

  const porTipo = ['resort', 'tour'].map((t) => ({
    name: t === 'tour' ? 'Tours' : 'Resorts',
    value: configurados.filter((v) => v.tipo === t).reduce((s, v) => s + v.ganancia_estimada, 0),
    color: t === 'tour' ? COLOR_TOUR : COLOR_RESORT,
  }));

  if (loading) {
    return <div className="rounded-2xl h-72 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />;
  }
  if (error) {
    return <p className="text-center text-rose-400 py-12">Error cargando ganancias: {error}</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        {[['todos', 'Todos'], ['activo', 'Activos'], ['cerrado', 'Cerrados']].map(([valor, label]) => (
          <button key={valor} type="button" onClick={() => setEstado(valor)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              estado === valor
                ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
                : 'bg-white/5 text-gray-400 border-white/[0.07] hover:bg-white/10'
            }`}>
            {label}
          </button>
        ))}
        {!viajeId && divisas.length > 1 && (
          <select value={divisa} onChange={(e) => setDivisaSel(e.target.value)}
            className="input-dark text-xs ml-auto" style={{ width: 'auto' }}
            title="Las ganancias se muestran por divisa">
            {divisas.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Ganancia estimada" value={fmt(totalEstimada)} icon={TrendingUp} color={COLOR_ESTIMADA}
          sub={`${configurados.length} viaje${configurados.length !== 1 ? 's' : ''} con margen`} />
        <Kpi label="Ganancia cobrada" value={fmt(totalCobrada)} icon={Wallet} color="#2dd4bf"
          sub={totalEstimada > 0 ? `${Math.round((totalCobrada / totalEstimada) * 100)}% de la estimada` : ''} />
        <Kpi label="Por cobrar" value={fmt(Math.max(0, totalEstimada - totalCobrada))} icon={Hourglass} color="#f59e0b"
          sub="Ganancia aún no cobrada" />
        <Kpi label="Margen promedio" value={`${margenProm.toFixed(1)}%`} icon={Percent} color="#a78bfa"
          sub={`Sobre ${fmt(totalBase)} vendidos`} />
      </div>

      {sinConfigurar.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {sinConfigurar.length} viaje{sinConfigurar.length !== 1 ? 's' : ''} sin margen configurado
            ({sinConfigurar.slice(0, 3).map((v) => v.nombre).join(', ')}{sinConfigurar.length > 3 ? '…' : ''}).
            Configúralo en "Editar viaje" para incluirlo en el reporte.
          </span>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel title="Ganancia por viaje" subtitle="Estimada vs. cobrada · top 10">
            {barras.length === 0 ? (
              <p className="text-center text-xs text-gray-600 py-20">Sin viajes con margen configurado</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barras} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={70}
                    tickFormatter={(n) => fmt(n)} />
                  <Tooltip contentStyle={DARK_TOOLTIP} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={(n) => fmt(n)}
                    labelFormatter={(_, p) => p?.[0]?.payload?.completo || ''} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                  <Bar dataKey="Estimada" fill={COLOR_ESTIMADA} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cobrada" fill={COLOR_COBRADA} radius={[4, 4, 0, 0]} fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        <Panel title="Resorts vs. Tours" subtitle="Ganancia estimada por tipo de viaje">
          {totalEstimada === 0 ? (
            <p className="text-center text-xs text-gray-600 py-20">Sin datos</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={porTipo} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none">
                    {porTipo.map((t) => <Cell key={t.name} fill={t.color} />)}
                  </Pie>
                  <Tooltip contentStyle={DARK_TOOLTIP} formatter={(n) => fmt(n)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {porTipo.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
                    </span>
                    <span className="font-semibold text-white tabular-nums">{fmt(t.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Tabla detalle */}
      <Panel
        title="Detalle por viaje"
        subtitle={`${filtrados.length} viaje${filtrados.length !== 1 ? 's' : ''} · ${viajeId ? 'viaje seleccionado' : divisa}`}
        action={
          <button type="button" onClick={() => exportarGananciasExcel(filtrados)}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> Excel
          </button>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-white/[0.06]">
                <th className="text-left font-semibold px-6 py-2">Viaje</th>
                <th className="text-left font-semibold px-3 py-2 hidden md:table-cell">Margen</th>
                <th className="text-right font-semibold px-3 py-2 hidden sm:table-cell">Vendido</th>
                <th className="text-right font-semibold px-3 py-2 hidden lg:table-cell">Cobrado</th>
                <th className="text-right font-semibold px-3 py-2">Ganancia est.</th>
                <th className="text-right font-semibold px-3 py-2 hidden sm:table-cell">Cobrada</th>
                <th className="text-right font-semibold px-6 py-2 hidden md:table-cell">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {[...configurados, ...sinConfigurar].map((v) => {
                const f = (n) => formatCurrency(n, v.divisa);
                const sinMargen = v.ganancia_tipo === 'ninguna';
                return (
                  <tr key={v.id} className={`border-b border-white/[0.04] ${sinMargen ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-3">
                      <span className="text-white font-medium">{v.nombre}</span>
                      <span className="ml-2 text-[10px] text-gray-500">{v.tipo === 'tour' ? 'Tour' : 'Resort'}</span>
                      {v.estado === 'cerrado' && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                          <Lock className="h-2.5 w-2.5" /> Cerrado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-400 hidden md:table-cell">{describirMargen(v, f)}</td>
                    <td className="px-3 py-3 text-right text-gray-300 tabular-nums hidden sm:table-cell">{f(v.total_por_cobrar)}</td>
                    <td className="px-3 py-3 text-right text-gray-400 tabular-nums hidden lg:table-cell">{f(v.total_pagado)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-400 tabular-nums">{sinMargen ? '—' : f(v.ganancia_estimada)}</td>
                    <td className="px-3 py-3 text-right text-teal-300 tabular-nums hidden sm:table-cell">{sinMargen ? '—' : f(v.ganancia_cobrada)}</td>
                    <td className="px-6 py-3 text-right text-gray-400 tabular-nums hidden md:table-cell">{sinMargen ? '—' : `${v.margen}%`}</td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-600 text-xs py-10">No hay viajes con estos filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default GananciasReporte;
