import { useState, useEffect, useMemo } from 'react';
import Grafico from '../common/Grafico';
import { TrendingUp, Wallet, Hourglass, Percent, FileDown, AlertCircle, Lock } from 'lucide-react';
import { fetchReporteGanancias } from '../../utils/api';
import { formatCurrency, formatoCompacto } from '../../utils/formatters';
import { exportarGananciasExcel } from '../../utils/exportExcel';
import { ChartPanel } from './ui';
import { useGeneracionExcel } from '../../hooks/useGeneracionExcel';
import { EsqueletoMontos, EsqueletoGrafico } from '../common/Esqueleto';

const COLOR_ESTIMADA = '#a7d9c6';
const COLOR_COBRADA  = '#059669';
const COLOR_RESORT   = '#0f766e';
const COLOR_TOUR     = '#6366f1';

const Kpi = ({ label, value, sub, icon: Icon, color }) => (
  <div className="rounded-2xl p-5"
    style={{ background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)', border: '1px solid rgba(15,23,42,0.07)' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</span>
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
    <p className="text-2xl font-bold tabular-nums truncate" style={{ color }}>{value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
  </div>
);

const describirMargen = (v, fmt) =>
  v.ganancia_tipo === 'porcentaje' ? `${v.ganancia_valor}% del total`
    : v.ganancia_tipo === 'por_persona' ? `${fmt(v.ganancia_valor)} × ${v.pax} pax`
      : 'Sin configurar';

const recortar = (s, n = 14) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Reporte de ganancias por viaje. Agrupa por divisa porque no se pueden sumar USD con DOP. */
const GananciasReporte = ({ viajeId }) => {
  const { generar, pantalla } = useGeneracionExcel();
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
    return (
      <div className="space-y-6">
        <EsqueletoMontos />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EsqueletoGrafico className="lg:col-span-2" />
          <EsqueletoGrafico tipo="dona" alto={200} />
        </div>
      </div>
    );
  }
  if (error) {
    return <p className="text-center text-red-700 py-12">Error cargando ganancias: {error}</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pantalla}
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        {[['todos', 'Todos'], ['activo', 'Activos'], ['cerrado', 'Cerrados']].map(([valor, label]) => (
          <button key={valor} type="button" onClick={() => setEstado(valor)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              estado === valor
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100'
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
        <Kpi label="Ganancia cobrada" value={fmt(totalCobrada)} icon={Wallet} color="#0f766e"
          sub={totalEstimada > 0 ? `${Math.round((totalCobrada / totalEstimada) * 100)}% de la estimada` : ''} />
        <Kpi label="Por cobrar" value={fmt(Math.max(0, totalEstimada - totalCobrada))} icon={Hourglass} color="#f59e0b"
          sub="Ganancia aún no cobrada" />
        <Kpi label="Margen promedio" value={`${margenProm.toFixed(1)}%`} icon={Percent} color="#6d28d9"
          sub={`Sobre ${fmt(totalBase)} vendidos`} />
      </div>

      {sinConfigurar.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs text-amber-700 bg-amber-50 border border-amber-200">
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
          <ChartPanel title="Ganancia por viaje" subtitle="Estimada vs. cobrada · top 10">
            {barras.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-20">Sin viajes con margen configurado</p>
            ) : (
              <Grafico type="bar" height={280}
                categories={barras.map((b) => b.completo)}
                series={[
                  { name: 'Estimada', type: 'bar', color: COLOR_ESTIMADA, data: barras.map((b) => b.Estimada), format: (n) => fmt(n) },
                  { name: 'Cobrada', type: 'bar', color: COLOR_COBRADA, data: barras.map((b) => b.Cobrada), format: (n) => fmt(n) },
                ]}
                y={{ format: formatoCompacto(divisa), zero: true }} bar={{ radius: 5, padding: 0.3 }}
                legend={{ show: true }} tooltip={{ header: '{x}' }}
                export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Ganancia por viaje' }} />
            )}
          </ChartPanel>
        </div>

        <ChartPanel title="Resorts vs. Tours" subtitle="Ganancia estimada por tipo de viaje">
          {totalEstimada === 0 ? (
            <p className="text-center text-xs text-slate-400 py-20">Sin datos</p>
          ) : (
            <>
              <Grafico type="donut" height={220}
                categories={porTipo.map((t) => t.name)}
                colors={porTipo.map((t) => t.color)}
                series={[{ name: 'Ganancia estimada', data: porTipo.map((t) => t.value), format: (n) => fmt(n) }]}
                legend={{ show: false }} donut={{ thickness: 0.36 }}
                export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Ganancia por tipo de viaje' }} />
              <div className="space-y-2 mt-2">
                {porTipo.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">{fmt(t.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartPanel>
      </div>

      {/* Tabla detalle */}
      <ChartPanel
        title="Detalle por viaje"
        subtitle={`${filtrados.length} viaje${filtrados.length !== 1 ? 's' : ''} · ${viajeId ? 'viaje seleccionado' : divisa}`}
        action={
          <button type="button" onClick={() => generar(() => exportarGananciasExcel(filtrados), { titulo: 'reporte de ganancias', archivo: 'reporte-ganancias.xlsx' })}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> Excel
          </button>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
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
                  <tr key={v.id} className={`border-b border-slate-200 ${sinMargen ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-3">
                      <span className="text-slate-900 font-medium">{v.nombre}</span>
                      <span className="ml-2 text-[10px] text-slate-500">{v.tipo === 'tour' ? 'Tour' : 'Resort'}</span>
                      {v.estado === 'cerrado' && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-700">
                          <Lock className="h-2.5 w-2.5" /> Cerrado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500 hidden md:table-cell">{describirMargen(v, f)}</td>
                    <td className="px-3 py-3 text-right text-slate-700 tabular-nums hidden sm:table-cell">{f(v.total_por_cobrar)}</td>
                    <td className="px-3 py-3 text-right text-slate-500 tabular-nums hidden lg:table-cell">{f(v.total_pagado)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{sinMargen ? '—' : f(v.ganancia_estimada)}</td>
                    <td className="px-3 py-3 text-right text-teal-700 tabular-nums hidden sm:table-cell">{sinMargen ? '—' : f(v.ganancia_cobrada)}</td>
                    <td className="px-6 py-3 text-right text-slate-500 tabular-nums hidden md:table-cell">{sinMargen ? '—' : `${v.margen}%`}</td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-400 text-xs py-10">No hay viajes con estos filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    </div>
  );
};

export default GananciasReporte;
