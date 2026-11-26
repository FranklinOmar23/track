import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, Plus, Pencil, Trash2, Paperclip, Receipt, HandCoins, Clock, Hotel } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import { useAlCambiarRemoto } from '../../utils/enVivo';
import { fetchPenalidades, eliminarPenalidad } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { avisarError, avisarExito } from '../../utils/avisos';
import { Hueso } from '../common/Esqueleto';
import Portal from '../common/Portal';
import ModalPenalidad from './ModalPenalidad';
import { etiquetaMotivo } from './motivos';
import { avisarPenalidadesCambiadas } from '../../hooks/usePenalidades';

const fechaCorta = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const Cifra = ({ icono: Icono, label, value, detalle, color = 'text-slate-900' }) => (
  <div className="tarjeta p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-slate-600">{label}</span>
      <Icono className="h-4 w-4 text-slate-400" />
    </div>
    <p className={`mt-2 font-bold tabular-nums tracking-tight ${color}`} style={{ fontSize: 'clamp(1.25rem, 1rem + 0.7vw, 1.6rem)' }}>{value}</p>
    {detalle && <p className="text-xs mt-1.5 text-slate-500">{detalle}</p>}
  </div>
);

const Chip = ({ clase, children }) => (
  <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold ${clase}`}>{children}</span>
);

/** Penalidades del hotel de un viaje. Van por fuera: no tocan los montos del viaje. */
const PenalidadesViaje = ({ viaje }) => {
  const { state } = useHabitacionesContext();
  const { puede } = useAuthContext();
  const puedeEditar = puede('pagos') && viaje.estado !== 'cerrado';
  const divisa = viaje.divisa || 'USD';
  const fmt = (n) => formatCurrency(n, divisa);

  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(undefined); // undefined: cerrado · null: nueva · objeto: editar
  const [confirmarId, setConfirmarId] = useState(null);
  const [borrandoId, setBorrandoId] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLista((await fetchPenalidades(viaje.id)).penalidades);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [viaje.id]);

  useEffect(() => {
    let cancelado = false;
    fetchPenalidades(viaje.id)
      .then((d) => { if (!cancelado) { setLista(d.penalidades); setError(''); } })
      .catch((e) => { if (!cancelado) setError(e.message); });
    return () => { cancelado = true; };
  }, [viaje.id]);

  // Cambios de otra persona: recargar
  useAlCambiarRemoto(() => { cargar(); });

  const borrar = async (p) => {
    setBorrandoId(p.id);
    try {
      await eliminarPenalidad(p.id);
      avisarExito('Penalidad eliminada');
      avisarPenalidadesCambiadas();
      setConfirmarId(null);
      await cargar();
    } catch (e) {
      avisarError(`No se pudo eliminar: ${e.message}`);
    } finally {
      setBorrandoId(null);
    }
  };

  if (error) return <p className="tarjeta p-6 text-sm text-red-700">No se pudieron cargar las penalidades: {error}</p>;

  const penalidades = lista || [];
  const total = penalidades.reduce((s, p) => s + p.monto, 0);
  const cobrado = penalidades.reduce((s, p) => s + Math.min(p.cobrado, p.monto), 0);
  const porCobrar = penalidades.reduce((s, p) => s + Math.max(0, p.monto - p.cobrado), 0);
  const sinPagarHotel = penalidades.filter((p) => !p.pagadaHotel);
  const porPagarHotel = sinPagarHotel.reduce((s, p) => s + p.monto, 0);

  return (
    <div className="space-y-5 aparecer">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Penalidades del hotel</h2>
          <p className="text-sm text-slate-500">Cargos por salirse del viaje. Van por fuera: no se suman a los montos ni al pendiente del viaje.</p>
        </div>
        {puedeEditar && (
          <button type="button" onClick={() => setModal(null)} className="btn btn-primario h-10 px-4 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Registrar penalidad
          </button>
        )}
      </div>

      {!lista ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="tarjeta p-5"><Hueso className="h-3.5 w-24" /><Hueso className="h-7 w-36 mt-3" /><Hueso className="h-2.5 w-28 mt-3" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Cifra icono={Receipt} label="Total en penalidades" value={fmt(total)}
            detalle={`${penalidades.length} penalidad${penalidades.length !== 1 ? 'es' : ''}`} />
          <Cifra icono={HandCoins} label="Cobrado a clientes" value={fmt(cobrado)} color="text-emerald-700" />
          <Cifra icono={Clock} label="Por cobrar a clientes" value={fmt(porCobrar)} color={porCobrar > 0 ? 'text-red-700' : 'text-slate-900'} />
          <Cifra icono={Hotel} label="Por pagar al hotel" value={fmt(porPagarHotel)} color={porPagarHotel > 0 ? 'text-amber-700' : 'text-slate-900'}
            detalle={sinPagarHotel.length ? `${sinPagarHotel.length} sin pagar al hotel` : penalidades.length ? 'Todas pagadas al hotel' : null} />
        </div>
      )}

      <div className="tarjeta overflow-hidden">
        {!lista ? (
          <div className="p-5 space-y-3">{[0, 1, 2].map((i) => <Hueso key={i} className="h-14" />)}</div>
        ) : penalidades.length === 0 ? (
          <div className="text-center py-12 px-6">
            <CircleAlert className="h-7 w-7 mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-900">No hay penalidades en este viaje</p>
            <p className="text-xs text-slate-500 mt-1">Si alguien se sale después de la fecha límite y el hotel cobra, regístralo aquí.</p>
          </div>
        ) : (
          penalidades.map((p, i) => {
            const falta = Math.max(0, p.monto - p.cobrado);
            return (
              <div key={p.id} className={`flex items-start gap-3.5 px-5 py-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <CircleAlert className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-[15px] font-semibold text-slate-900 truncate">
                      {p.personaNombre}
                      {p.habitacion && <span className="font-normal text-slate-500"> · Hab. {p.habitacion}</span>}
                      {p.personaEstado === 'eliminada' && (
                        <span className="ml-2 align-middle inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700">Eliminada del viaje</span>
                      )}
                    </p>
                    <p className="text-[15px] font-bold text-slate-900 tabular-nums">{fmt(p.monto)}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {etiquetaMotivo(p.motivo)} · {fechaCorta(p.fecha)}
                    {p.cobrado > 0 && <> · Cobrado {fmt(p.cobrado)}</>}
                    {falta > 0 && <> · <span className="text-red-700 font-semibold">Falta {fmt(falta)}</span></>}
                  </p>
                  {p.nota && <p className="text-xs text-slate-700 mt-1">{p.nota}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {falta === 0
                      ? <Chip clase="bg-emerald-50 text-emerald-700">Cobrada</Chip>
                      : p.cobrado > 0
                        ? <Chip clase="bg-amber-50 text-amber-800">Cobro parcial</Chip>
                        : <Chip clase="bg-red-50 text-red-700">Por cobrar</Chip>}
                    {p.pagadaHotel
                      ? <Chip clase="bg-indigo-50 text-indigo-700">Pagada al hotel</Chip>
                      : <Chip clase="bg-slate-100 text-slate-600">Sin pagar al hotel</Chip>}
                    <button type="button" onClick={() => setModal(p)} disabled={!puedeEditar}
                      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold ${
                        p.comprobantes > 0 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } disabled:pointer-events-none`}>
                      <Paperclip className="h-3 w-3" />
                      {p.comprobantes > 0 ? `${p.comprobantes} comprobante${p.comprobantes !== 1 ? 's' : ''}` : 'Sin comprobante'}
                    </button>
                    {p.creadoPor && <span className="text-[11px] text-slate-400">por {p.creadoPor}</span>}
                  </div>
                  {confirmarId === p.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 aparecer">
                      <span className="text-xs text-red-800 font-semibold flex-1">¿Eliminar esta penalidad?</span>
                      <button type="button" className="btn btn-borde btn-sm" onClick={() => setConfirmarId(null)}>No</button>
                      <button type="button" className="btn btn-sm text-white bg-red-600 hover:bg-red-700" disabled={borrandoId === p.id} onClick={() => borrar(p)}>
                        {borrandoId === p.id ? 'Eliminando…' : 'Sí, eliminar'}
                      </button>
                    </div>
                  )}
                </div>
                {puedeEditar && confirmarId !== p.id && (
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setModal(p)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" aria-label="Editar penalidad"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setConfirmarId(p.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50" aria-label="Eliminar penalidad"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {modal !== undefined && (
        <Portal>
          <ModalPenalidad
            viaje={viaje}
            penalidad={modal}
            habitaciones={state.habitaciones}
            onGuardado={() => { setModal(undefined); cargar(); avisarPenalidadesCambiadas(); }}
            onClose={() => { setModal(undefined); cargar(); }}
          />
        </Portal>
      )}
    </div>
  );
};

export default PenalidadesViaje;
