import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Landmark, Pencil, Trash2, Paperclip, ArrowDownLeft, ArrowUpRight, Wallet, Scale, Check, X, Info } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import { useAlCambiarRemoto } from '../../utils/enVivo';
import { fetchTransferencias, eliminarTransferencia, guardarSaldoBanco } from '../../utils/api';
import { formatCurrency, MESES } from '../../utils/formatters';
import { avisarError, avisarExito } from '../../utils/avisos';
import InputMonto from '../common/InputMonto';
import { Hueso } from '../common/Esqueleto';
import ModalTransferencia from './ModalTransferencia';
import { usePenalidades } from '../../hooks/usePenalidades';

const fechaCorta = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fechaHora = (f) => (f ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(f)) : '');
const etiquetaMes = (clave) => { const [a, m] = clave.split('-'); return `${MESES[Number(m) - 1]} ${a}`; };

/** Cifra de la cuenta. */
const Cifra = ({ icono: Icono, label, value, detalle, tono = 'neutro', destacado }) => {
  const color = { neutro: 'text-slate-900', verde: 'text-emerald-700', azul: 'text-indigo-700', marca: 'text-teal-800' }[tono];
  return (
    <div className={`rounded-[0.875rem] border p-4 sm:p-5 ${destacado ? 'border-teal-300 bg-[#eef7f5]' : 'tarjeta'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[13px] ${destacado ? 'text-teal-900 font-semibold' : 'text-slate-600'}`}>{label}</span>
        <Icono className={`h-4 w-4 ${destacado ? 'text-teal-700' : 'text-slate-400'}`} />
      </div>
      <p className={`mt-2 font-bold tabular-nums tracking-tight ${color}`} style={{ fontSize: 'clamp(1.25rem, 1rem + 0.7vw, 1.6rem)' }}>{value}</p>
      {detalle && <p className={`text-xs mt-1.5 ${destacado ? 'text-teal-900/80' : 'text-slate-500'}`}>{detalle}</p>}
    </div>
  );
};

/** Cuenta del viaje: lo cobrado, lo transferido al hotel y lo que debería haber en el banco. */
const CuentaViaje = ({ viaje }) => {
  const { state } = useHabitacionesContext();
  const { puede } = useAuthContext();
  const puedeEditar = puede('pagos');
  const divisa = viaje.divisa || 'USD';
  const fmt = (n) => formatCurrency(n, divisa);

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(undefined); // undefined: cerrado · null: nueva · objeto: editar
  const [borrandoId, setBorrandoId] = useState(null);
  const [confirmarId, setConfirmarId] = useState(null);
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [saldoTexto, setSaldoTexto] = useState('');
  const [agrupar, setAgrupar] = useState('mes');

  const cargar = useCallback(async () => {
    try {
      setDatos(await fetchTransferencias(viaje.id));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [viaje.id]);

  // Carga inicial (y al cambiar de viaje)
  useEffect(() => {
    let cancelado = false;
    fetchTransferencias(viaje.id)
      .then((d) => { if (!cancelado) { setDatos(d); setError(''); } })
      .catch((e) => { if (!cancelado) setError(e.message); });
    return () => { cancelado = true; };
  }, [viaje.id]);

  // Cambios de otra persona: recargar
  useAlCambiarRemoto(() => { cargar(); });

  // Cada pago como un movimiento de entrada con su fecha real
  const movimientos = useMemo(() => state.habitaciones.flatMap((h) => h.personas.flatMap((p) =>
    (p.pagos || []).map((pg) => ({
      fecha: pg.fechaRecibido ? String(pg.fechaRecibido).slice(0, 10) : null,
      monto: Number(pg.monto) || 0,
    })))), [state.habitaciones]);

  const transferencias = useMemo(() => datos?.transferencias || [], [datos]);
  const sinFecha = movimientos.filter((m) => !m.fecha).reduce((a, m) => ({ n: a.n + 1, total: a.total + m.monto }), { n: 0, total: 0 });
  const cobrado = movimientos.reduce((s, m) => s + m.monto, 0);
  const transferido = transferencias.reduce((s, t) => s + t.monto, 0);
  // Penalidades: van por fuera de los montos del viaje, pero su dinero sí entra (y sale) de esta cuenta
  const { resumen: penalidades } = usePenalidades(viaje.id);
  const enCuentaViaje = cobrado - transferido;
  const enCuenta = enCuentaViaje + penalidades.enCuenta;
  const saldoBanco = datos?.resumen?.saldoBanco ?? null;
  const diferencia = saldoBanco === null ? null : saldoBanco - enCuenta;

  // Lo que entró después del último corte (lo que "se coló" o aún no se ha enviado)
  const ultimoCorte = transferencias.reduce((max, t) => {
    const c = t.corte || t.fecha;
    return !max || c > max ? c : max;
  }, null);
  const despuesDelCorte = ultimoCorte ? movimientos.filter((m) => m.fecha && m.fecha > ultimoCorte).reduce((s, m) => s + m.monto, 0) : null;

  // Estado de cuenta: entradas (pagos por fecha real) y salidas (transferencias), con saldo acumulado
  const extracto = useMemo(() => {
    const clave = (iso) => (agrupar === 'mes' ? iso.slice(0, 7) : iso);
    const mapa = new Map();
    const fila = (k) => { if (!mapa.has(k)) mapa.set(k, { clave: k, entro: 0, salio: 0, pagos: 0, envios: 0 }); return mapa.get(k); };
    movimientos.forEach((m) => { const f = fila(m.fecha ? clave(m.fecha) : '0000'); f.entro += m.monto; f.pagos += 1; });
    transferencias.forEach((t) => { const f = fila(clave(t.fecha)); f.salio += t.monto; f.envios += 1; });
    const ordenadas = [...mapa.values()].sort((a, b) => a.clave.localeCompare(b.clave));
    return ordenadas.reduce((lista, f) => {
      const saldo = (lista[lista.length - 1]?.saldo || 0) + f.entro - f.salio;
      return [...lista, { ...f, saldo }];
    }, []).reverse();
  }, [movimientos, transferencias, agrupar]);

  const borrar = async (t) => {
    setBorrandoId(t.id);
    try {
      await eliminarTransferencia(t.id);
      avisarExito('Transferencia eliminada');
      setConfirmarId(null);
      await cargar();
    } catch (e) {
      avisarError(`No se pudo eliminar: ${e.message}`);
    } finally {
      setBorrandoId(null);
    }
  };

  const guardarSaldo = async (valor) => {
    try {
      const r = await guardarSaldoBanco(viaje.id, valor === '' ? null : Number(valor));
      setDatos((d) => ({ ...d, resumen: { ...d.resumen, ...r } }));
      setEditandoSaldo(false);
      avisarExito(valor === '' ? 'Saldo del banco borrado' : 'Saldo del banco anotado');
    } catch (e) {
      avisarError(`No se pudo guardar el saldo: ${e.message}`);
    }
  };

  if (error) return <p className="tarjeta p-6 text-sm text-red-700">No se pudo cargar la cuenta: {error}</p>;

  return (
    <div className="space-y-5 aparecer">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Cuenta y transferencias al hotel</h2>
          <p className="text-sm text-slate-500">Lo cobrado menos lo transferido es lo que debería haber en el banco para este viaje.</p>
        </div>
        {puedeEditar && (
          <button type="button" onClick={() => setModal(null)} className="btn btn-primario h-10 px-4 self-start sm:self-auto">
            <Send className="h-4 w-4" /> Registrar transferencia
          </button>
        )}
      </div>

      {/* Cifras */}
      {!datos ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="tarjeta p-5"><Hueso className="h-3.5 w-24" /><Hueso className="h-7 w-36 mt-3" /><Hueso className="h-2.5 w-28 mt-3" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Cifra icono={ArrowDownLeft} label="Cobrado" value={fmt(cobrado)} tono="verde" detalle={`${movimientos.length} pagos registrados`} />
          <Cifra icono={ArrowUpRight} label="Transferido al hotel" value={fmt(transferido)} tono="azul"
            detalle={transferencias.length ? `${transferencias.length} envío${transferencias.length !== 1 ? 's' : ''} · último ${fechaCorta(transferencias[0].fecha)}` : 'Aún no hay envíos'} />
          <Cifra icono={Wallet} label="En cuenta (sin enviar)" value={fmt(enCuenta)} tono="marca" destacado
            detalle={penalidades.cantidad > 0
              ? `${fmt(enCuentaViaje)} del viaje + ${fmt(penalidades.enCuenta)} de penalidades`
              : despuesDelCorte !== null ? `${fmt(despuesDelCorte)} entraron después del último corte (${fechaCorta(ultimoCorte)})` : 'Todo lo cobrado sigue en la cuenta'} />

          {/* Conciliación con el banco */}
          <div className="tarjeta p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-slate-600">Saldo del banco</span>
              <Landmark className="h-4 w-4 text-slate-400" />
            </div>
            {editandoSaldo ? (
              <div className="mt-2 space-y-2 aparecer">
                <InputMonto divisa={divisa} value={saldoTexto} onChange={setSaldoTexto} autoFocus placeholder="Lo que dice el banco"
                  onKeyDown={(e) => { if (e.key === 'Enter') guardarSaldo(saldoTexto); if (e.key === 'Escape') setEditandoSaldo(false); }} />
                <div className="flex gap-1.5">
                  <button type="button" className="btn btn-primario btn-sm flex-1" onClick={() => guardarSaldo(saldoTexto)}><Check className="h-3.5 w-3.5" /> Guardar</button>
                  <button type="button" className="btn btn-borde btn-sm" onClick={() => setEditandoSaldo(false)} aria-label="Cancelar"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ) : saldoBanco === null ? (
              <>
                <p className="mt-2 text-sm text-slate-500">Anota el saldo que ves en el banco para compararlo con el sistema.</p>
                {puedeEditar && (
                  <button type="button" className="btn btn-borde btn-sm mt-2.5" onClick={() => { setSaldoTexto(''); setEditandoSaldo(true); }}>
                    <Scale className="h-3.5 w-3.5" /> Anotar saldo
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 font-bold tabular-nums tracking-tight text-slate-900" style={{ fontSize: 'clamp(1.25rem, 1rem + 0.7vw, 1.6rem)' }}>{fmt(saldoBanco)}</p>
                <p className={`text-xs mt-1 font-semibold ${Math.abs(diferencia) < 1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {Math.abs(diferencia) < 1 ? '✓ Cuadra con el sistema' : `Diferencia: ${diferencia > 0 ? '+' : '−'}${fmt(Math.abs(diferencia))}`}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5" title={fechaHora(datos.resumen.saldoBancoAt)}>
                  {datos.resumen.saldoBancoPor} · {fechaCorta(datos.resumen.saldoBancoAt)}
                  {puedeEditar && (
                    <button type="button" className="ml-2 text-teal-700 font-semibold hover:underline"
                      onClick={() => { setSaldoTexto(String(saldoBanco)); setEditandoSaldo(true); }}>
                      Actualizar
                    </button>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {penalidades.cantidad > 0 && datos && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">Penalidades en la cuenta: {fmt(penalidades.enCuenta)}</span>
            {' '}— cobrado a clientes {fmt(penalidades.cobrado)}{penalidades.pagadoHotel > 0 && <> − pagado al hotel {fmt(penalidades.pagadoHotel)}</>}.
            {' '}No se suman al recaudado del viaje, pero sí al dinero que debería haber en el banco.
            {penalidades.porCobrar > 0 && <> Faltan {fmt(penalidades.porCobrar)} por cobrar.</>}
          </p>
        </div>
      )}

      {sinFecha.n > 0 && datos && (
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
          <p>
            <span className="font-semibold text-slate-900">{sinFecha.n} pago{sinFecha.n !== 1 ? 's' : ''} ({fmt(sinFecha.total)})</span> no
            tiene{sinFecha.n !== 1 ? 'n' : ''} el día en que llegó el dinero. Se cuentan como recibidos antes de cualquier transferencia.
            Para que el cálculo sea exacto, ábrelos desde la habitación y ponles la fecha.
          </p>
        </div>
      )}

      {diferencia !== null && Math.abs(diferencia) >= 1 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {diferencia < 0
              ? `En el banco hay ${fmt(-diferencia)} menos de lo esperado. Revisa si falta registrar una transferencia al hotel o si algún pago se anotó pero no llegó.`
              : `En el banco hay ${fmt(diferencia)} más de lo esperado. Puede haber un pago que llegó y no se registró, o una transferencia registrada que no salió.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Transferencias */}
        <div className="tarjeta overflow-hidden xl:col-span-3">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[15px] font-semibold text-slate-900">Transferencias al hotel</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cada envío con su fecha, lo que incluye y el voucher</p>
          </div>
          {!datos ? (
            <div className="px-5 pb-5 space-y-3">{[0, 1, 2].map((i) => <Hueso key={i} className="h-14" />)}</div>
          ) : transferencias.length === 0 ? (
            <div className="border-t border-slate-100 text-center py-12 px-6">
              <Send className="h-7 w-7 mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-900">Todavía no hay transferencias</p>
              <p className="text-xs text-slate-500 mt-1">Cuando envíes dinero al hotel, regístralo aquí con su voucher.</p>
            </div>
          ) : (
            transferencias.map((t) => (
              <div key={t.id} className="flex items-start gap-3.5 px-5 py-4 border-t border-slate-100">
                <span className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-[15px] font-bold text-slate-900 tabular-nums">{fmt(t.monto)}</p>
                    <p className="text-sm text-slate-600">{fechaCorta(t.fecha)}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.corte ? `Incluye lo cobrado hasta el ${fechaCorta(t.corte)}` : 'Sin fecha de corte'}
                    {t.referencia && <> · Ref. {t.referencia}</>}
                  </p>
                  {t.nota && <p className="text-xs text-slate-700 mt-1">{t.nota}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button type="button" onClick={() => setModal(t)}
                      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold ${
                        t.comprobantes > 0 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}>
                      <Paperclip className="h-3 w-3" />
                      {t.comprobantes > 0 ? `${t.comprobantes} voucher${t.comprobantes !== 1 ? 's' : ''}` : 'Sin voucher'}
                    </button>
                    {t.creadoPor && <span className="text-[11px] text-slate-400">por {t.creadoPor}</span>}
                  </div>
                  {confirmarId === t.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 aparecer">
                      <span className="text-xs text-red-800 font-semibold flex-1">¿Eliminar esta transferencia?</span>
                      <button type="button" className="btn btn-borde btn-sm" onClick={() => setConfirmarId(null)}>No</button>
                      <button type="button" className="btn btn-sm text-white bg-red-600 hover:bg-red-700" disabled={borrandoId === t.id} onClick={() => borrar(t)}>
                        {borrandoId === t.id ? 'Eliminando…' : 'Sí, eliminar'}
                      </button>
                    </div>
                  )}
                </div>
                {puedeEditar && confirmarId !== t.id && (
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setModal(t)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" aria-label="Editar transferencia"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setConfirmarId(t.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50" aria-label="Eliminar transferencia"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Estado de cuenta */}
        <div className="tarjeta overflow-hidden xl:col-span-2">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">Estado de cuenta</h3>
              <p className="text-xs text-slate-500 mt-0.5">Según la fecha real en que entró cada pago</p>
            </div>
            <div className="segmentado shrink-0" role="radiogroup" aria-label="Agrupar por">
              <button type="button" role="radio" aria-checked={agrupar === 'mes'} onClick={() => setAgrupar('mes')} className="!h-7 !text-xs">Mes</button>
              <button type="button" role="radio" aria-checked={agrupar === 'dia'} onClick={() => setAgrupar('dia')} className="!h-7 !text-xs">Día</button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto scroll-fino">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-y border-slate-100 text-left">
                  <th className="px-5 h-9 font-normal"><span className="tabla-th">{agrupar === 'mes' ? 'Mes' : 'Día'}</span></th>
                  <th className="px-3 h-9 font-normal text-right"><span className="tabla-th">Entró</span></th>
                  <th className="px-3 h-9 font-normal text-right"><span className="tabla-th">Salió</span></th>
                  <th className="px-5 h-9 font-normal text-right"><span className="tabla-th">Saldo</span></th>
                </tr>
              </thead>
              <tbody>
                {extracto.map((f) => (
                  <tr key={f.clave} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-5 py-2.5 text-slate-900 whitespace-nowrap">
                      {f.clave === '0000' ? 'Sin fecha' : agrupar === 'mes' ? etiquetaMes(f.clave) : fechaCorta(f.clave)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700" title={`${f.pagos} pago${f.pagos !== 1 ? 's' : ''}`}>
                      {f.entro ? `+${fmt(f.entro)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-indigo-700">{f.salio ? `−${fmt(f.salio)}` : '—'}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-900">{fmt(f.saldo)}</td>
                  </tr>
                ))}
                {extracto.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">Sin movimientos todavía</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal !== undefined && datos && (
        <ModalTransferencia
          viaje={viaje}
          transferencia={modal}
          movimientos={movimientos}
          transferencias={transferencias}
          onGuardado={() => { setModal(undefined); cargar(); }}
          onClose={() => { setModal(undefined); cargar(); }}
        />
      )}
    </div>
  );
};

export default CuentaViaje;
