import { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { MESES } from '../../utils/formatters';
import { calcularPendientePersona } from '../../utils/calculos';
import { X, Trash2, Save } from 'lucide-react';
import InputMonto from '../common/InputMonto';
import Comprobantes from '../common/Comprobantes';
import { useDivisa } from '../../hooks/useDivisa';
import { avisarError } from '../../utils/avisos';
import { subirPendientes } from '../../utils/comprobantes';

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => isoDe(new Date());
const ayerISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoDe(d); };

const ModalRegistrarPago = ({ habId, persona, pago = null, onClose }) => {
  const { state, registrarPago, actualizarPago, eliminarPago, contarComprobantesPago } = useHabitacionesContext();
  const { divisa } = useDivisa();
  const habitacion = state.habitaciones.find((hab) => hab.id === habId);
  const ahora = new Date();

  // Valores iniciales: los del pago al editar; al registrar, el mes actual y lo que le falta a la persona
  const [mes, setMes] = useState(pago?.mes || MESES[ahora.getMonth()]);
  const [anio, setAnio] = useState(pago?.anio || ahora.getFullYear());
  const [monto, setMonto] = useState(() => {
    if (pago) return pago.monto;
    if (habitacion && !habitacion.stack) return Math.round(calcularPendientePersona(habitacion, persona)) || '';
    return '';
  });
  // Opcional: día en que llegó la transferencia o el efectivo (vacío = no se sabe)
  const [fechaRecibido, setFechaRecibido] = useState(pago?.fechaRecibido ? String(pago.fechaRecibido).slice(0, 10) : '');
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const handleSubmit = async () => {
    const montoNum = parseFloat(monto);
    if (!mes || !(montoNum > 0)) {
      avisarError('El monto debe ser mayor que 0.');
      return;
    }
    setLoading(true);
    const pagoData = { mes, anio: Number(anio), monto: montoNum, fechaRecibido: fechaRecibido || null };
    try {
      if (pago?.id) {
        await actualizarPago(persona.id, pago.id, pagoData);
      } else {
        const creado = await registrarPago(persona.id, pagoData);
        if (creado?.id && pendientes.length) {
          try {
            const subidos = await subirPendientes('pago', creado.id, pendientes);
            contarComprobantesPago(persona.id, creado.id, subidos.length);
          } catch (e) {
            avisarError(`El pago se guardó, pero no se pudo subir el comprobante: ${e.message}`);
          }
        }
      }
      onClose();
    } catch (error) {
      console.error('Error guardando pago:', error);
      avisarError(`Error al guardar el pago: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pago?.id) return;
    if (!confirmarBorrar) { setConfirmarBorrar(true); return; }
    setLoading(true);
    try {
      await eliminarPago(persona.id, pago.id);
      onClose();
    } catch (error) {
      console.error('Error eliminando pago:', error);
      avisarError(`Error al eliminar el pago: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const anios = [...new Set([Number(anio), ...[-1, 0, 1].map((d) => ahora.getFullYear() + d)])].sort();

  return (
    <div className="modal-overlay-dark" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal-card-dark w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900">{pago ? 'Editar pago' : 'Registrar pago'}</h3>
              <p className="text-sm text-slate-500 truncate">{persona.n}{habitacion ? ` · Hab. ${habitacion.num}` : ''}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="modal-section-label" htmlFor="pago-monto">Monto</label>
              <InputMonto id="pago-monto" divisa={divisa} value={monto} onChange={setMonto} min="0.01" disabled={loading} autoFocus={!pago} />
            </div>

            <div>
              <span className="modal-section-label">Cuota a la que corresponde</span>
              <div className="grid grid-cols-2 gap-3">
                <select className="input-dark" value={mes} aria-label="Mes de la cuota" onChange={(e) => setMes(e.target.value)} disabled={loading}>
                  {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="input-dark" value={anio} aria-label="Año de la cuota" onChange={(e) => setAnio(Number(e.target.value))} disabled={loading}>
                  {anios.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="modal-section-label" htmlFor="pago-fecha">
                Día en que llegó el dinero <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <input id="pago-fecha" type="date" className="input-dark flex-1 min-w-[160px]" value={fechaRecibido} max={hoyISO()}
                  onChange={(e) => setFechaRecibido(e.target.value)} disabled={loading} />
                <div className="segmentado shrink-0" role="radiogroup" aria-label="Atajos de fecha">
                  <button type="button" role="radio" aria-checked={fechaRecibido === hoyISO()} onClick={() => setFechaRecibido(hoyISO())} disabled={loading}>Hoy</button>
                  <button type="button" role="radio" aria-checked={fechaRecibido === ayerISO()} onClick={() => setFechaRecibido(ayerISO())} disabled={loading}>Ayer</button>
                  <button type="button" role="radio" aria-checked={!fechaRecibido} onClick={() => setFechaRecibido('')} disabled={loading}>No sé</button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {fechaRecibido
                  ? 'Con esta fecha el sistema sabe en qué transferencia al hotel entra este pago.'
                  : 'Sin fecha, el pago se cuenta como recibido antes de cualquier transferencia al hotel.'}
              </p>
            </div>

            <Comprobantes
              entidad="pago"
              entidadId={pago?.id || null}
              titulo="Comprobante del pago"
              pendientes={pendientes}
              onPendientes={setPendientes}
              onCambio={(n) => pago?.id && contarComprobantesPago(persona.id, pago.id, n)}
            />

            {confirmarBorrar && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 aparecer">
                ¿Eliminar este pago de {persona.n}? Pulsa “Eliminar” otra vez para confirmar.
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100">
            {pago?.id && (
              <button type="button" className="btn-modal-danger" onClick={handleDelete} disabled={loading}>
                <Trash2 className="h-4 w-4" />
                {confirmarBorrar ? 'Sí, eliminar' : 'Eliminar'}
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="button" className="btn-modal-primary" onClick={handleSubmit} disabled={loading || !mes || !monto}>
                <Save className="h-4 w-4" />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistrarPago;
