import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Printer, FileDown, Wallet, Truck, TrendingUp, ShieldCheck, ChevronRight, Table2,
} from 'lucide-react';
import {
  fetchHabitaciones, fetchReportePagos, fetchLogs, fetchReporteGanancias, fetchComparativaViajes,
  fetchReportePorEtiqueta, fetchReporteMovimientos,
} from '../../../utils/api';
import { divisaPrincipal } from '../../../utils/formatters';
import { exportarTablaExcel } from '../../../utils/exportExcel';
import { useGeneracionExcel } from '../../../hooks/useGeneracionExcel';
import { CATEGORIAS, REPORTES } from './definiciones';
import ReporteTabla from './ReporteTabla';
import { armarFilas } from './tablaReporte';
import { Hueso } from '../../common/Esqueleto';

const ICONOS = { cobranza: Wallet, logistica: Truck, viajes: TrendingUp, control: ShieldCheck };
const hoyISO = () => new Date().toISOString().slice(0, 10);
const inicioMesISO = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

/** Carga las fuentes de datos que pide el reporte, según los filtros. */
const cargarFuentes = async (reporte, filtros) => {
  const conFechas = reporte.filtros.includes('fechas');
  const cargas = {
    habitaciones: () => fetchHabitaciones(filtros.viajeId),
    pagos: () => fetchReportePagos({
      viajeId: filtros.viajeId || undefined,
      desde: conFechas ? filtros.desde : undefined,
      hasta: conFechas ? filtros.hasta : undefined,
    }),
    logs: async () => (await fetchLogs({
      ...reporte.logs, usuario: filtros.usuario, desde: filtros.desde, hasta: filtros.hasta, limit: 1000,
    })).logs,
    ganancias: () => fetchReporteGanancias(),
    comparativa: () => fetchComparativaViajes(),
    etiquetas: () => fetchReportePorEtiqueta(filtros.viajeId),
    movimientos: () => fetchReporteMovimientos({ viajeId: filtros.viajeId || undefined }),
  };
  const valores = await Promise.all(reporte.fuentes.map((f) => cargas[f]()));
  return Object.fromEntries(reporte.fuentes.map((f, i) => [f, valores[i]]));
};

const Catalogo = ({ onElegir }) => (
  <div className="space-y-7 animate-fade-in">
    {CATEGORIAS.map((cat, ci) => {
      const Icono = ICONOS[cat.id];
      return (
        <section key={cat.id}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="p-2 rounded-lg bg-teal-50"><Icono className="h-4 w-4 text-teal-700" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{cat.titulo}</h3>
              <p className="text-xs text-slate-500">{cat.descripcion}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {REPORTES.filter((r) => r.categoria === cat.id).map((r, i) => (
              <button key={r.id} type="button" onClick={() => onElegir(r)}
                className="group text-left rounded-xl p-4 border border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-100 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${ci * 60 + i * 35}ms` }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{r.titulo}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-700 shrink-0 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{r.descripcion}</p>
              </button>
            ))}
          </div>
        </section>
      );
    })}
  </div>
);

/** Pestaña "Tablas" de Reportes: catálogo de reportes imprimibles y exportables a Excel. */
const TabTablas = ({ viajes, viajeIdInicial }) => {
  const [reporte, setReporte] = useState(null);
  const [filtros, setFiltros] = useState(() => ({
    viajeId: viajeIdInicial || viajes.find((v) => v.estado !== 'cerrado')?.id || viajes[0]?.id || '',
    desde: inicioMesISO(),
    hasta: hoyISO(),
    usuario: '',
  }));
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState({ cargando: false, error: null });
  const [orden, setOrden] = useState({ clave: null, dir: 'desc' });
  const [usuarios, setUsuarios] = useState([]);
  const { generar, pantalla } = useGeneracionExcel();
  const ultimaCarga = useRef(0);

  const viaje = viajes.find((v) => String(v.id) === String(filtros.viajeId));
  const necesitaViaje = reporte?.filtros.includes('viaje');
  const divisa = viaje?.divisa || divisaPrincipal(viajes);

  // Cargar datos al elegir reporte o cambiar filtros (solo la respuesta más reciente se aplica)
  useEffect(() => {
    if (!reporte || (necesitaViaje && !filtros.viajeId)) return undefined;
    const id = ++ultimaCarga.current;
    const t = setTimeout(async () => {
      setEstado({ cargando: true, error: null });
      try {
        const d = await cargarFuentes(reporte, filtros);
        if (id === ultimaCarga.current) { setDatos(d); setEstado({ cargando: false, error: null }); }
      } catch (error) {
        if (id === ultimaCarga.current) setEstado({ cargando: false, error: error.message });
      }
    }, 0);
    return () => clearTimeout(t);
  }, [reporte, filtros, necesitaViaje]);

  // Lista de usuarios para el filtro (del registro de actividad)
  useEffect(() => {
    if (!reporte?.filtros.includes('usuario') || usuarios.length) return;
    fetchLogs({ limit: 1 }).then((d) => setUsuarios(d.usuarios || [])).catch(() => {});
  }, [reporte, usuarios.length]);

  const columnas = useMemo(() => {
    if (!reporte || !datos) return [];
    return typeof reporte.columnas === 'function' ? reporte.columnas(datos) : reporte.columnas;
  }, [reporte, datos]);
  const filas = useMemo(() => (reporte && datos ? reporte.construir(datos, filtros) : []), [reporte, datos, filtros]);

  const subtitulo = [
    viaje && (necesitaViaje || reporte?.filtros.includes('viajeOpcional')) && filtros.viajeId ? viaje.nombre : null,
    reporte?.filtros.includes('fechas') ? `Del ${filtros.desde} al ${filtros.hasta}` : null,
    filtros.usuario && reporte?.filtros.includes('usuario') ? `Usuario: ${filtros.usuario}` : null,
    `Generado el ${new Date().toLocaleDateString('es-DO', { dateStyle: 'long' })}`,
  ].filter(Boolean).join(' · ');

  const elegir = (r) => { setReporte(r); setDatos(null); setOrden({ clave: null, dir: 'desc' }); };
  const ordenar = (clave) => setOrden((o) => (o.clave !== clave ? { clave, dir: 'desc' } : o.dir === 'desc' ? { clave, dir: 'asc' } : { clave: null, dir: 'desc' }));

  const exportar = () => {
    const filasExport = armarFilas({ columnas, filas, agruparPor: reporte.agruparPor, orden });
    generar(() => exportarTablaExcel({
      titulo: reporte.titulo, subtitulo, columnas, filas: filasExport,
      nombre: `${reporte.titulo}${viaje && necesitaViaje ? ` - ${viaje.nombre}` : ''}`,
    }), { titulo: reporte.titulo, archivo: `${reporte.titulo}.xlsx` });
  };

  if (!reporte) return <Catalogo onElegir={elegir} />;

  const campo = 'input-dark text-sm';
  return (
    <div className="space-y-4 animate-fade-in">
      {pantalla}
      {/* Barra superior (no se imprime) */}
      <div className="flex flex-wrap items-center gap-2 sin-imprimir">
        <button type="button" onClick={() => setReporte(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-900 bg-slate-100 border border-slate-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Todos los reportes
        </button>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => window.print()} disabled={!filas.length}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button type="button" onClick={exportar} disabled={!filas.length}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-colors">
            <FileDown className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filtros (no se imprimen) */}
      {(reporte.filtros.length > 0) && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl p-3 border border-slate-200 bg-white sin-imprimir">
          {(necesitaViaje || reporte.filtros.includes('viajeOpcional')) && (
            <label className="flex flex-col gap-1 min-w-[14rem] flex-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Viaje</span>
              <select className={campo} value={filtros.viajeId}
                onChange={(e) => setFiltros((f) => ({ ...f, viajeId: e.target.value }))}>
                {!necesitaViaje && <option value="">Todos los viajes</option>}
                {viajes.map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.estado === 'cerrado' ? ' (cerrado)' : ''}</option>)}
              </select>
            </label>
          )}
          {reporte.filtros.includes('fechas') && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Desde</span>
                <input type="date" className={campo} value={filtros.desde} max={filtros.hasta}
                  onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Hasta</span>
                <input type="date" className={campo} value={filtros.hasta} min={filtros.desde}
                  onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))} />
              </label>
            </>
          )}
          {reporte.filtros.includes('usuario') && (
            <label className="flex flex-col gap-1 min-w-[10rem]">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Usuario</span>
              <select className={campo} value={filtros.usuario} onChange={(e) => setFiltros((f) => ({ ...f, usuario: e.target.value }))}>
                <option value="">Todos</option>
                {usuarios.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Zona imprimible */}
      <div className="reporte-imprimible">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 titulo-reporte">
            <Table2 className="h-5 w-5 text-teal-700 sin-imprimir" /> {reporte.titulo}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 subtitulo-reporte">{subtitulo}</p>
          {!estado.cargando && filas.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5 sin-imprimir">{filas.length} fila{filas.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {estado.error && <p className="text-sm text-red-700 py-8 text-center">No se pudo cargar el reporte: {estado.error}</p>}
        {estado.cargando && !datos && (
          <div className="space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <Hueso key={i} className="h-9" />)}</div>
        )}
        {datos && !estado.error && (
          <div className={estado.cargando ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            <ReporteTabla columnas={columnas} filas={filas} agruparPor={reporte.agruparPor}
              divisa={divisa} orden={orden} onOrdenar={ordenar} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TabTablas;
