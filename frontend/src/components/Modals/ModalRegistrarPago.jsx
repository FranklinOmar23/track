import { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { MESES } from '../../utils/formatters';
import { calcularPendientePersona } from '../../utils/calculos';
import { X, CreditCard, Trash2, Save } from 'lucide-react';

const ModalRegistrarPago = ({ habId, persona, pago = null, onClose }) => {
  const { state, registrarPago, actualizarPago, eliminarPago } = useHabitacionesContext();
  const [mes, setMes]       = useState('');
  const [monto, setMonto]   = useState('');
  const [anio, setAnio]     = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const habitacion = state.habitaciones.find((hab) => hab.id === habId);

  useEffect(() => {
    if (pago) {
      setMes(pago.mes);
      setMonto(pago.monto);
      setAnio(pago.anio || new Date().getFullYear());
      return;
    }
    const fechaActual = new Date();
    setMes(MESES[fechaActual.getMonth()]);
    setAnio(fechaActual.getFullYear());
    // Sugerir lo que le falta a esta persona según su cuota real (adulto, niño o gratis)
    if (habitacion && !habitacion.stack) {
      setMonto(Math.round(calcularPendientePersona(habitacion, persona)) || '');
    }
  }, [habitacion, pago, persona]);

  const handleSubmit = async () => {
    const montoNum = parseFloat(monto);
    if (!mes || !(montoNum > 0)) {
      alert('El monto debe ser mayor que 0.');
      return;
    }
    setLoading(true);
    const pagoData = { mes, anio: Number(anio), monto: montoNum };
    try {
      if (pago?.id) {
        await actualizarPago(persona.id, pago.id, pagoData);
      } else {
        await registrarPago(persona.id, pagoData);
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
      await eliminarPago(persona.id, pago.id);
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="modal-section-label">Mes</label>
              <select className="input-dark" value={mes}
                onChange={(e) => setMes(e.target.value)} disabled={loading}>
                {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="modal-section-label">Año</label>
              <select className="input-dark" value={anio}
                onChange={(e) => setAnio(Number(e.target.value))} disabled={loading}>
                {[...new Set([anio, ...[-1, 0, 1].map((d) => new Date().getFullYear() + d)])]
                  .sort()
                  .map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="modal-section-label">Monto</label>
            <input className="input-dark" type="number" min="0.01" step="any" value={monto}
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
