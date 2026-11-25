import { useState } from 'react';
import { Tag } from 'lucide-react';
import { useDivisa } from '../../hooks/useDivisa';
import { calcularTotalHabitacion, calcularTotalPagado, calcularEstadisticas, filtrarHabitaciones } from '../../utils/calculos';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { HabitacionFila, COLUMNAS_HAB } from './HabitacionCard';
import ModalDetallesHabitacion from '../Modals/ModalDetallesHabitacion';

const LIMITE_INICIAL = 60;

const ordenarHabitaciones = (habs) => [...habs].sort((a, b) => {
  if (!!a.stack !== !!b.stack) return a.stack ? -1 : 1;
  return String(a.num).localeCompare(String(b.num), undefined, { numeric: true, sensitivity: 'base' });
});

/** Botón de filtro por centro / etiqueta. */
const ChipCentro = ({ activo, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={activo}
    className={`h-7 px-3 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
      activo ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
    }`}>
    {children}
  </button>
);

/** Fila de grupo: nombre del centro y sus totales. */
const EncabezadoGrupo = ({ nombre, habs, fmt }) => {
  const total = habs.reduce((s, h) => s + calcularTotalHabitacion(h), 0);
  const pagado = habs.reduce((s, h) => s + calcularTotalPagado(h), 0);
  const pct = total > 0 ? Math.round((pagado / total) * 100) : 0;
  // Pendiente por habitación (lo pagado de más en una no descuenta la deuda de otra), igual que el Excel
  const pendiente = calcularEstadisticas(habs).pendiente;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 sm:px-5 py-2.5 border-t border-slate-100"
      style={{ background: 'var(--grupo-fondo)' }}>
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-teal-700" />
        <span className="text-[13px] font-semibold text-slate-900">{nombre}</span>
        <span className="text-xs text-slate-500">{habs.length} hab.</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-600 tabular-nums">
        <span>Recaudado <span className="font-semibold text-emerald-700">{fmt(pagado)}</span></span>
        <span>Pendiente <span className="font-semibold text-red-700">{fmt(pendiente)}</span></span>
        <span className="font-bold text-teal-700">{pct}%</span>
      </div>
    </div>
  );
};

const HabitacionesList = () => {
  const { fmt } = useDivisa();
  const { state } = useHabitacionesContext();
  const { habitaciones, filtros } = state;
  const [selectedHabitacion, setSelectedHabitacion] = useState(null);
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('todas');
  const [verTodas, setVerTodas] = useState(false);

  const etiquetasUnicas = [...new Set(habitaciones.map((h) => h.etiqueta || '').filter(Boolean))].sort();
  const sinEtiqueta = habitaciones.filter((h) => !h.etiqueta).length;

  // Búsqueda y estado (pendiente / completo / en revisión) con la misma lógica de totales que el resto de la app
  const filtradas = filtrarHabitaciones(habitaciones, filtros).filter((hab) =>
    etiquetaFiltro === 'todas' ? true : etiquetaFiltro === '__sin__' ? !hab.etiqueta : hab.etiqueta === etiquetaFiltro
  );

  const grupos = {};
  filtradas.forEach((hab) => {
    const clave = hab.etiqueta || '__sin__';
    (grupos[clave] ||= []).push(hab);
  });
  Object.keys(grupos).forEach((c) => { grupos[c] = ordenarHabitaciones(grupos[c]); });
  const claves = [...etiquetasUnicas.filter((e) => grupos[e]), ...(grupos.__sin__ ? ['__sin__'] : [])];
  // Sin centros definidos no hace falta la fila de grupo
  const mostrarGrupos = etiquetasUnicas.length > 0;

  // Con muchas habitaciones se dibujan las primeras y el resto bajo demanda
  const limite = verTodas ? Infinity : LIMITE_INICIAL;
  const bloques = [];
  claves.reduce((usadas, clave) => {
    const visibles = grupos[clave].slice(0, Math.max(0, limite - usadas));
    if (visibles.length) bloques.push({ clave, habs: grupos[clave], visibles });
    return usadas + visibles.length;
  }, 0);
  const mostradas = Math.min(filtradas.length, limite);

  return (
    <>
      {/* Filtro por centro */}
      {etiquetasUnicas.length > 0 && (
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 overflow-x-auto">
          <span className="text-xs text-slate-500 shrink-0">Centro:</span>
          <ChipCentro activo={etiquetaFiltro === 'todas'} onClick={() => setEtiquetaFiltro('todas')}>
            Todas ({habitaciones.length})
          </ChipCentro>
          {etiquetasUnicas.map((e) => (
            <ChipCentro key={e} activo={etiquetaFiltro === e} onClick={() => setEtiquetaFiltro(etiquetaFiltro === e ? 'todas' : e)}>
              {e} ({habitaciones.filter((h) => h.etiqueta === e).length})
            </ChipCentro>
          ))}
          {sinEtiqueta > 0 && (
            <ChipCentro activo={etiquetaFiltro === '__sin__'} onClick={() => setEtiquetaFiltro(etiquetaFiltro === '__sin__' ? 'todas' : '__sin__')}>
              Sin centro ({sinEtiqueta})
            </ChipCentro>
          )}
        </div>
      )}

      {/* Encabezado de columnas */}
      <div className={`hidden md:grid px-4 sm:px-5 h-10 border-t border-slate-100 bg-slate-50/70 ${COLUMNAS_HAB}`}>
        <span className="tabla-th">Hab.</span>
        <span className="tabla-th">Huéspedes</span>
        <span className="tabla-th text-right">Pagado</span>
        <span className="tabla-th text-right">Pendiente</span>
        <span className="tabla-th">Progreso</span>
        <span />
      </div>

      {claves.length === 0 ? (
        <div className="border-t border-slate-100 text-center py-14 px-6">
          <p className="text-slate-900 font-semibold">
            {habitaciones.length ? 'No hay habitaciones que coincidan.' : 'Este viaje aún no tiene habitaciones.'}
          </p>
          {habitaciones.length > 0 && <p className="text-sm text-slate-500 mt-1">Prueba con otra búsqueda o filtro.</p>}
        </div>
      ) : (
        bloques.map(({ clave, habs, visibles }) => (
          <div key={clave}>
            {mostrarGrupos && <EncabezadoGrupo nombre={clave === '__sin__' ? 'Sin centro' : clave} habs={habs} fmt={fmt} />}
            {visibles.map((h) => <HabitacionFila key={h.id} habitacion={h} onSelect={setSelectedHabitacion} />)}
          </div>
        ))
      )}

      {/* Pie */}
      {filtradas.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500">
          <span>Mostrando {mostradas} de {habitaciones.length} habitaciones</span>
          {mostradas < filtradas.length && (
            <button type="button" onClick={() => setVerTodas(true)} className="btn btn-borde btn-sm">
              Mostrar todas ({filtradas.length})
            </button>
          )}
        </div>
      )}

      {selectedHabitacion && (
        <ModalDetallesHabitacion habitacion={selectedHabitacion} onClose={() => setSelectedHabitacion(null)} />
      )}
    </>
  );
};

export default HabitacionesList;
