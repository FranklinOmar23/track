import { useMemo, useState } from 'react';
import { X, Save, Wand2, Send } from 'lucide-react';
import InputMonto from '../common/InputMonto';
import Comprobantes from '../common/Comprobantes';
import { crearTransferencia, editarTransferencia } from '../../utils/api';
import { subirPendientes } from '../../utils/comprobantes';
import { formatCurrency } from '../../utils/formatters';
import { avisarError, avisarExito } from '../../utils/avisos';

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fechaLarga = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Registrar o editar una transferencia al hotel.
 * Sugiere el monto: lo cobrado hasta la fecha de corte − lo que ya se transfirió (sin contar esta).
 */
const ModalTransferencia = ({ viaje, transferencia, movimientos, transferencias, onGuardado, onClose }) => {
  const editando = !!transferencia;
  const divisa = viaje.divisa || 'USD';
  const fmt = (n) => formatCurrency(n, divisa);

  const [fecha, setFecha] = useState(transferencia?.fecha || hoyISO());
  const [corte, setCorte] = useState(transferencia?.corte || transferencia?.fecha || hoyISO());
  const [monto, setMonto] = useState(transferencia ? String(transferencia.monto) : '');
  const [referencia, setReferencia] = useState(transferencia?.referencia || '');
  const [nota, setNota] = useState(transferencia?.nota || '');
  const [pendientes, setPendientes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  // Al registrar, el monto se llena solo con lo calculado hasta que el usuario escriba otro
  const [montoManual, setMontoManual] = useState(editando);

  // Cálculo automático con la fecha en que llegó cada pago
  const calculo = useMemo(() => {
    const suma = (lista) => lista.reduce((s, m) => s + m.monto, 0);
    const conFecha = movimientos.filter((m) => m.fecha && m.fecha <= corte);
    const sinFecha = movimientos.filter((m) => !m.fecha);
    const despues = movimientos.filter((m) => m.fecha && m.fecha > corte);
    const yaTransferido = transferencias.filter((t) => t.id !== transferencia?.id).reduce((s, t) => s + t.monto, 0);
    const cobrado = suma(conFecha) + suma(sinFecha);
    return {
      conFecha: { n: conFecha.length, total: suma(conFecha) },
      sinFecha: { n: sinFecha.length, total: suma(sinFecha) },
      despues: { n: despues.length, total: suma(despues) },
      cobrado,
      yaTransferido,
      sugerido: Math.max(0, Math.round((cobrado - yaTransferido) * 100) / 100),
    };
  }, [movimientos, transferencias, corte, transferencia]);

  const montoFinal = montoManual ? monto : (calculo.sugerido > 0 ? String(calculo.sugerido) : '');

  const guardar = async () => {
    const montoNum = Number(montoFinal);
    if (!(montoNum > 0)) { avisarError('Escribe el monto que se transfirió.'); return; }
    setGuardando(true);
    const datos = { viajeId: viaje.id, fecha, corte: corte || null, monto: montoNum, referencia, nota };
    try {
      const guardada = editando ? await editarTransferencia(transferencia.id, datos) : await crearTransferencia(datos);
      if (!editando && pendientes.length) {
        try {
          const subidos = await subirPendientes('transferencia', guardada.id, pendientes);
          guardada.comprobantes = subidos.length;
        } catch (e) {
          avisarError(`La transferencia se guardó, pero no se pudo subir el comprobante: ${e.message}`);
        }
      }
      avisarExito(editando ? 'Transferencia actualizada' : 'Transferencia registrada');
      onGuardado(guardada);
    } catch (e) {
      avisarError(`No se pudo guardar la transferencia: ${e.message}`);
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{editando ? 'Editar transferencia' : 'Registrar transferencia al hotel'}</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{viaje.nombre}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="modal-section-label" htmlFor="tr-fecha">Fecha de la transferencia</label>
                <input id="tr-fecha" type="date" className="input-dark" value={fecha}
                  onChange={(e) => { setFecha(e.target.value); if (!editando && corte === fecha) setCorte(e.target.value); }} />
              </div>
              <div>
                <label className="modal-section-label" htmlFor="tr-corte">Incluye lo cobrado hasta</label>
                <input id="tr-corte" type="date" className="input-dark" value={corte} onChange={(e) => setCorte(e.target.value)} />
              </div>
            </div>

            {/* Cálculo automático */}
            <div className="rounded-xl border border-teal-200 bg-[#eef7f5] p-4">
              <p className="text-xs font-semibold text-teal-900 uppercase tracking-wide">Calculado con los pagos</p>
              <div className="mt-2 space-y-1 text-sm tabular-nums">
                <div className="flex justify-between gap-3 text-slate-700">
                  <span>{calculo.conFecha.n} pago{calculo.conFecha.n !== 1 ? 's' : ''} recibido{calculo.conFecha.n !== 1 ? 's' : ''} hasta el {fechaLarga(corte)}</span>
                  <span>{fmt(calculo.conFecha.total)}</span>
                </div>
                {calculo.sinFecha.n > 0 && (
                  <div className="flex justify-between gap-3 text-slate-700" title="Pagos a los que no se les puso el día en que llegó el dinero">
                    <span>+ {calculo.sinFecha.n} pago{calculo.sinFecha.n !== 1 ? 's' : ''} sin fecha</span>
                    <span>{fmt(calculo.sinFecha.total)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 text-slate-700">
                  <span>− Ya transferido antes</span><span>{fmt(calculo.yaTransferido)}</span>
                </div>
                <div className="flex justify-between gap-3 pt-1.5 border-t border-teal-200 font-bold text-teal-900">
                  <span>Por enviar</span><span>{fmt(calculo.sugerido)}</span>
                </div>
              </div>
              {calculo.despues.n > 0 && (
                <p className="text-xs text-teal-900/80 mt-2">
                  No incluye {calculo.despues.n} pago{calculo.despues.n !== 1 ? 's' : ''} ({fmt(calculo.despues.total)}) que llegaron después del {fechaLarga(corte)}.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="modal-section-label !mb-0" htmlFor="tr-monto">Monto que se transfirió <span className="text-red-600">*</span></label>
                {montoManual ? (
                  <button type="button" onClick={() => setMontoManual(false)} disabled={calculo.sugerido <= 0}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline disabled:opacity-40">
                    <Wand2 className="h-3.5 w-3.5" /> Usar lo calculado
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700"><Wand2 className="h-3.5 w-3.5" /> Automático</span>
                )}
              </div>
              <InputMonto id="tr-monto" divisa={divisa} value={montoFinal} min="0.01"
                onChange={(v) => { setMonto(v); setMontoManual(true); }} />
              {montoManual && Number(montoFinal) > 0 && Math.abs(Number(montoFinal) - calculo.sugerido) >= 1 && (
                <p className="text-xs text-amber-700 mt-1.5">
                  {Number(montoFinal) > calculo.sugerido
                    ? `Es ${fmt(Number(montoFinal) - calculo.sugerido)} más que lo cobrado hasta esa fecha.`
                    : `Quedan ${fmt(calculo.sugerido - Number(montoFinal))} de ese periodo sin enviar.`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="modal-section-label" htmlFor="tr-ref">Referencia <span className="font-normal text-slate-400">(opcional)</span></label>
                <input id="tr-ref" className="input-dark" value={referencia} maxLength={100}
                  onChange={(e) => setReferencia(e.target.value)} placeholder="Nº de transferencia o banco" />
              </div>
              <div>
                <label className="modal-section-label" htmlFor="tr-nota">Nota <span className="font-normal text-slate-400">(opcional)</span></label>
                <input id="tr-nota" className="input-dark" value={nota} maxLength={255}
                  onChange={(e) => setNota(e.target.value)} placeholder="Ej: pago de julio + adelanto" />
              </div>
            </div>

            <Comprobantes
              entidad="transferencia"
              entidadId={transferencia?.id || null}
              titulo="Voucher de la transferencia"
              pendientes={pendientes}
              onPendientes={setPendientes}
            />
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="button" className="btn-modal-primary" onClick={guardar} disabled={guardando || !(Number(montoFinal) > 0)}>
              {editando ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar transferencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalTransferencia;
