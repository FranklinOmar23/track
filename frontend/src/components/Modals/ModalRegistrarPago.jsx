import { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { MESES } from '../../utils/formatters';
import { X, CreditCard, Trash2, Save } from 'lucide-react';

const ModalRegistrarPago = ({ habId, perIdx, persona, pago = null, onClose }) => {
  const { state, registrarPago, actualizarPago, eliminarPago } = useHabitacionesContext();
  const [mes, setMes]       = useState('');
  const [monto, setMonto]   = useState('');
  const [loading, setLoading] = useState(false);

  const habitacion = state.habitaciones.find((hab) => hab.id === habId);

  useEffect(() => {
    if (pago) {
      setMes(pago.mes);
      setMonto(pago.monto);
      return;
    }
    const fechaActual = new Date();
    setMes(MESES[fechaActual.getMonth()]);
    if (habitacion && !habitacion.stack && habitacion.total > 0) {
      const cantidadPersonas = habitacion.personas.filter((p) => p.n).length;
      const cuotaIdeal  = Math.round(habitacion.total / cantidadPersonas);
      const pagadoPersona = persona.pagos.reduce((sum, pagoItem) => sum + pagoItem.monto, 0);
      const pendiente   = Math.max(0, cuotaIdeal - pagadoPersona);
      setMonto(pendiente);
    }
  }, [habitacion, pago, persona.pagos]);

  const handleSubmit = async () => {
    if (!mes || !monto) return;
    setLoading(true);
    const pagoData = { mes, monto: parseFloat(monto) };
    try {
      if (pago?.id) {
        await actualizarPago(habId, perIdx, pago.id, pagoData);
      } else {
        await registrarPago(habId, perIdx, pagoData);
      }
      onClose();
    } catch (error) {
      console.error('Error guardando pago:', error);
      alert('Error al guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pago?.id) return;
    setLoading(true);
    try {
      await eliminarPago(habId, perIdx, pago.id);
      onClose();
    } catch (error) {
      console.error('Error eliminando pago:', error);
      alert('Error al eliminar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-dark" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal-card-dark w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Teal orb */}
        <div className="orb w-32 h-32 pointer-events-none" style={{ top: '-30px', right: '-30px', background: '#0d9488', opacity: 0.12 }} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CreditCard className="h-4 w-4 text-teal-400" />
              <h3 className="text-base font-bold text-white">
                {pago ? 'Editar pago' : 'Registrar pago'}
              </h3>
            </div>
            <p className="text-xs text-gray-600">{persona.n}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-5 py-4 space-y-4">

          <div>
            <label className="modal-section-label">Mes</label>
            <select className="input-dark" value={mes}
              onChange={(e) => setMes(e.target.value)} disabled={loading}>
              {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="modal-section-label">Monto ($)</label>
            <input className="input-dark" type="number" value={monto}
              onChange={(e) => setMonto(e.target.value)} placeholder="0"
              disabled={loading} autoFocus={!pago} />
          </div>

          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {pago?.id && (
              <button type="button" className="btn-modal-danger" onClick={handleDelete} disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" />
                {loading ? '...' : 'Eliminar'}
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className="btn-modal-primary"
                onClick={handleSubmit} disabled={loading || !mes || !monto}>
                <Save className="h-3.5 w-3.5" />
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
