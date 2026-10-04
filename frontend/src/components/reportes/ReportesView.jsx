import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import {
  fetchPagosPorMes, fetchReportePorEtiqueta,
  fetchComparativaViajes, fetchPagosMesViaje,
} from '../../utils/api';
import { exportarHabitacionesExcel } from '../../utils/exportExcel';
import { divisaPrincipal } from '../../utils/formatters';
import { construirDatosReportes, crearFmt } from './datosReportes';
import GananciasReporte from './GananciasReporte';
import { StatCard, Tab } from './ui';
import TabTendencias from './tabs/TabTendencias';
import TabMapaCalor from './tabs/TabMapaCalor';
import TabDistribucion from './tabs/TabDistribucion';
import TabRendimiento from './tabs/TabRendimiento';
import TabRankings from './tabs/TabRankings';
import { ArrowLeft, DollarSign, Building2, Users, TrendingUp, Printer, Flame, PieChart as PieIcon, Award, Trophy, Coins } from 'lucide-react';

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
  // Divisa del viaje filtrado, o la más usada si se ven todos
  const divisa = viajeId
    ? (viajes.find((v) => String(v.id) === String(viajeId))?.divisa || 'USD')
    : divisaPrincipal(viajes);
  const fmt = crearFmt(divisa);

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

  const datos = construirDatosReportes({
    pagosPorMes, porEtiqueta, comparativa, pagosMesViaje, habitaciones: state.habitaciones, viajeId,
  });
  const { totalRecaudado, totalHabs, totalPax, totalPorCobrar, tasaCobro } = datos;

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
          <Tab id="rankings"     label="Rankings"      icon={Trophy}     active={tab === 'rankings'}     onClick={setTab} />
          <Tab id="ganancias"    label="Ganancias"     icon={Coins}      active={tab === 'ganancias'}    onClick={setTab} />
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
            {tab === 'tendencias' && <TabTendencias datos={datos} fmt={fmt} />}

            {/* ── MAPA DE CALOR ─────────────────────────────────────────────── */}
            {tab === 'heatmap' && <TabMapaCalor datos={datos} fmt={fmt} />}

            {/* ── DISTRIBUCIÓN ──────────────────────────────────────────────── */}
            {tab === 'distribucion' && <TabDistribucion datos={datos} />}

            {/* ── RENDIMIENTO ───────────────────────────────────────────────── */}
            {tab === 'rendimiento' && <TabRendimiento datos={datos} fmt={fmt} handleExportExcel={handleExportExcel} />}

            {/* ── RANKINGS ──────────────────────────────────────────────────── */}
            {tab === 'ganancias' && <GananciasReporte viajeId={viajeId} />}

            {tab === 'rankings' && <TabRankings datos={datos} fmt={fmt} />}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportesView;
