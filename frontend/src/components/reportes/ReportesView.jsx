import { useState, useEffect, useCallback } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import {
  fetchPagosPorMes, fetchReportePorEtiqueta,
  fetchComparativaViajes, fetchPagosMesViaje, fetchHabitaciones,
} from '../../utils/api';
import { exportarHabitacionesExcel } from '../../utils/exportExcel';
import { divisaPrincipal } from '../../utils/formatters';
import { construirDatosReportes, crearFmt } from './datosReportes';
import GananciasReporte from './GananciasReporte';
import TabTablas from './tablas/TabTablas';
import { StatCard, Tab } from './ui';
import TabTendencias from './tabs/TabTendencias';
import TabMapaCalor from './tabs/TabMapaCalor';
import TabDistribucion from './tabs/TabDistribucion';
import TabRendimiento from './tabs/TabRendimiento';
import TabRankings from './tabs/TabRankings';
import { Download } from 'lucide-react';
import { useGeneracionExcel } from '../../hooks/useGeneracionExcel';

// ─── Main ─────────────────────────────────────────────────────────────────────
const ReportesView = () => {
  const { state } = useHabitacionesContext();
  const { generar, pantalla } = useGeneracionExcel();
  const [tab, setTab]                     = useState('tendencias');
  const [viajeId, setViajeId]             = useState('');
  const [loading, setLoading]             = useState(true);
  const [pagosPorMes, setPagosPorMes]     = useState([]);
  const [porEtiqueta, setPorEtiqueta]     = useState([]);
  const [comparativa, setComparativa]     = useState([]);
  const [pagosMesViaje, setPagosMesViaje] = useState([]);
  // Habitaciones del filtro de Reportes (no las del último viaje abierto en la app)
  const [habitaciones, setHabitaciones]   = useState([]);

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
      const [pxm, pet, comp, pmv, habs] = await Promise.all([
        fetchPagosPorMes(vid),
        fetchReportePorEtiqueta(vid),
        fetchComparativaViajes(),
        fetchPagosMesViaje(),
        fetchHabitaciones(vid),
      ]);
      setPagosPorMes(pxm);
      setPorEtiqueta(pet);
      setComparativa(comp);
      setPagosMesViaje(pmv);
      setHabitaciones(habs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [viajeId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const datos = construirDatosReportes({
    pagosPorMes, porEtiqueta, comparativa, pagosMesViaje, habitaciones, viajeId,
  });
  const { totalRecaudado, totalHabs, totalPax, totalPorCobrar, tasaCobro } = datos;

  // ── Exports ──────────────────────────────────────────────────────────────────
  const handleExportPDF   = () => window.print();
  const handleExportExcel = () => {
    const viajeActual = viajes.find((v) => String(v.id) === String(viajeId));
    generar(() => exportarHabitacionesExcel(habitaciones, viajeActual), {
      titulo: 'lista de pasajeros',
      archivo: `${viajeActual?.nombre ? `${viajeActual.nombre} - ` : ''}pasajeros.xlsx`,
    });
  };

  const ready = !loading;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {pantalla}

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Reportes y análisis</h1>
          <p className="subtitulo-pagina">
            Rendimiento financiero · {comparativa.length} viajes · {totalHabs} habitaciones
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <select
            value={viajeId}
            onChange={(e) => setViajeId(e.target.value)}
            aria-label="Filtrar por viaje"
            className="input-dark !h-10 !py-0 !text-sm !w-auto min-w-[170px]"
          >
            <option value="">Todos los viajes</option>
            {viajes.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
          <button type="button" onClick={handleExportPDF} className="btn btn-borde h-10">
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* ── Cifras ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total recaudado" value={totalRecaudado} displayValue={(v) => fmt(v)}
          sub={viajeId ? 'Viaje seleccionado' : 'Todos los viajes'} accentColor="#047857" index={0} ready={ready} />
        <StatCard label="Habitaciones activas" value={totalHabs}
          sub={`En ${comparativa.length} viaje${comparativa.length !== 1 ? 's' : ''}`} index={1} ready={ready} />
        <StatCard label="Pasajeros" value={totalPax}
          sub={totalHabs > 0 ? `~${(totalPax / totalHabs).toFixed(1)} por habitación` : ''} index={2} ready={ready} />
        <StatCard label="Tasa de cobro" value={tasaCobro} displayValue={(v) => `${v}%`}
          sub={`De ${fmt(totalPorCobrar)} por cobrar`} index={3} ready={ready} />
      </div>

      {/* ── Pestañas ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200 no-print overflow-x-auto" role="tablist">
        <Tab id="tendencias"   label="Tendencias"    active={tab === 'tendencias'}   onClick={setTab} />
        <Tab id="heatmap"      label="Mapa de calor" active={tab === 'heatmap'}      onClick={setTab} />
        <Tab id="distribucion" label="Distribución"  active={tab === 'distribucion'} onClick={setTab} />
        <Tab id="rendimiento"  label="Rendimiento"   active={tab === 'rendimiento'}  onClick={setTab} />
        <Tab id="rankings"     label="Rankings"      active={tab === 'rankings'}     onClick={setTab} />
        <Tab id="ganancias"    label="Ganancias"     active={tab === 'ganancias'}    onClick={setTab} />
        <Tab id="tablas"       label="Tablas"        active={tab === 'tablas'}       onClick={setTab} />
      </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0,1].map((i) => <div key={i} className="tarjeta h-72 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── TENDENCIAS ──────────────────────────────────────────────────── */}
            {tab === 'tendencias' && <TabTendencias datos={datos} fmt={fmt} divisa={divisa} />}

            {/* ── MAPA DE CALOR ─────────────────────────────────────────────── */}
            {tab === 'heatmap' && <TabMapaCalor datos={datos} fmt={fmt} divisa={divisa} />}

            {/* ── DISTRIBUCIÓN ──────────────────────────────────────────────── */}
            {tab === 'distribucion' && <TabDistribucion datos={datos} />}

            {/* ── RENDIMIENTO ───────────────────────────────────────────────── */}
            {tab === 'rendimiento' && <TabRendimiento datos={datos} fmt={fmt} divisa={divisa} handleExportExcel={handleExportExcel} />}

            {/* ── RANKINGS ──────────────────────────────────────────────────── */}
            {tab === 'ganancias' && <GananciasReporte viajeId={viajeId} />}

            {tab === 'tablas' && <TabTablas viajes={viajes} viajeIdInicial={viajeId} />}

            {tab === 'rankings' && <TabRankings datos={datos} fmt={fmt} />}
          </>
        )}
    </div>
  );
};

export default ReportesView;
