import { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { X, Save, Trash2 } from 'lucide-react';

const DIVISAS = [
  { code: 'USD', label: 'USD — Dólar americano' },
  { code: 'DOP', label: 'DOP — Peso dominicano' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'MXN', label: 'MXN — Peso mexicano' },
  { code: 'COP', label: 'COP — Peso colombiano' },
];

const EDAD_OPTIONS = [1,2,3,4,5,6,7,8,9,10,11,12];

const ModalEditarViaje = ({ viaje, open, onClose }) => {
  const { editarViaje, eliminarViaje } = useHabitacionesContext();
  const [nombre, setNombre]                       = useState('');
  const [tipo, setTipo]                           = useState('resort');
  const [divisa, setDivisa]                       = useState('USD');
  const [fechaInicio, setFechaInicio]             = useState('');
  const [fechaFin, setFechaFin]                   = useState('');
  const [nota, setNota]                           = useState('');
  const [edadMinimaPago, setEdadMinimaPago]       = useState(0);
  const [loading, setLoading]                     = useState(false);
  const [confirmDelete, setConfirmDelete]         = useState(false);

  useEffect(() => {
    if (viaje && open) {
      setNombre(viaje.nombre || '');
      setTipo(viaje.tipo || 'resort');
      setDivisa(viaje.divisa || 'USD');
      setFechaInicio(viaje.fechaInicio ? viaje.fechaInicio.slice(0, 10) : '');
      setFechaFin(viaje.fechaFin ? viaje.fechaFin.slice(0, 10) : '');
      setNota(viaje.nota || '');
      setEdadMinimaPago(Number(viaje.edadMinimaPago) || 0);
      setConfirmDelete(false);
    }
  }, [viaje, open]);

  if (!open || !viaje) return null;

  const handleGuardar = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await editarViaje(viaje.id, {
        nombre: nombre.trim(), tipo, divisa,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        nota: nota || null,
        edadMinimaPago: Number(edadMinimaPago) || 0,
      });
      onClose();
    } catch {
      alert('Error al guardar el viaje');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading(true);
    try {
      await eliminarViaje(viaje.id);
      onClose();
    } catch {
      alert('Error al eliminar el viaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Purple orb */}
        <div className="orb w-44 h-44 pointer-events-none" style={{ top: '-50px', right: '-50px', background: '#8b5cf6', opacity: 0.09 }} />

        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">Editar viaje</h2>
            <p className="text-xs text-gray-600 mt-0.5 truncate max-w-[220px]">{viaje.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-6 py-5 space-y-4">

          <div>
            <label className="modal-section-label">Nombre del viaje *</label>
            <input className="input-dark" type="text" value={nombre}
              onChange={(e) => setNombre(e.target.value)} disabled={loading} />
          </div>

          <div>
            <label className="modal-section-label">Tipo</label>
            <select className="input-dark" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={loading}>
              <option value="resort">🏨 Resort</option>
              <option value="tour">🚐 Tour</option>
            </select>
          </div>

          <div>
            <label className="modal-section-label">Divisa</label>
            <select className="input-dark" value={divisa} onChange={(e) => setDivisa(e.target.value)} disabled={loading}>
              {DIVISAS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="modal-section-label">Fecha inicio</label>
              <input className="input-dark" type="date" value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="modal-section-label">Fecha fin</label>
              <input className="input-dark" type="date" value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div>
            <label className="modal-section-label">Nota (opcional)</label>
            <textarea className="input-dark resize-none" value={nota}
              onChange={(e) => setNota(e.target.value)} rows={3}
              placeholder="Información adicional..." disabled={loading}
              style={{ minHeight: '72px' }} />
          </div>

          {/* Política de niños */}
          <div>
            <label className="modal-section-label">Política de niños (resort)</label>
            <div className="space-y-2">
              <button type="button" disabled={loading}
                onClick={() => setEdadMinimaPago(0)}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left"
                style={{
                  background: edadMinimaPago === 0 ? 'rgba(13,148,136,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${edadMinimaPago === 0 ? 'rgba(13,148,136,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: edadMinimaPago === 0 ? '#0d9488' : 'rgba(255,255,255,0.2)' }}>
                  {edadMinimaPago === 0 && <div className="w-2 h-2 rounded-full bg-teal-400" />}
                </div>
                <span className="text-sm" style={{ color: edadMinimaPago === 0 ? '#5eead4' : 'rgba(255,255,255,0.45)' }}>
                  Todos los niños pagan
                </span>
              </button>
              <button type="button" disabled={loading}
                onClick={() => setEdadMinimaPago(edadMinimaPago === 0 ? 3 : edadMinimaPago)}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left"
                style={{
                  background: edadMinimaPago > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${edadMinimaPago > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: edadMinimaPago > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}>
                  {edadMinimaPago > 0 && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                </div>
                <span className="text-sm" style={{ color: edadMinimaPago > 0 ? '#fbbf24' : 'rgba(255,255,255,0.45)' }}>
                  Niños de X años en adelante pagan
                </span>
              </button>
              {edadMinimaPago > 0 && (
                <div className="flex items-center gap-3 pl-1 animate-fade-in">
                  <span className="text-xs text-gray-500">Edad mínima:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {EDAD_OPTIONS.map((edad) => (
                      <button key={edad} type="button" disabled={loading}
                        onClick={() => setEdadMinimaPago(edad)}
                        className="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150"
                        style={{
                          background: edadMinimaPago === edad ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)',
                          color: edadMinimaPago === edad ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                          border: `1px solid ${edadMinimaPago === edad ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        {edad}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">años</span>
                </div>
              )}
              {edadMinimaPago > 0 && (
                <p className="text-[11px] pl-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Niños menores de {edadMinimaPago} año{edadMinimaPago !== 1 ? 's' : ''} entran gratis · Los de {edadMinimaPago}+ pagan precio niño
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {confirmDelete ? (
              <div
                className="p-3 rounded-xl mb-3"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}
              >
                <p className="text-sm text-rose-300 font-semibold mb-2">¿Eliminar este viaje y todos sus datos?</p>
                <div className="flex gap-2">
                  <button className="btn-modal-danger flex-1" onClick={handleEliminar} disabled={loading}>
                    <Trash2 className="h-3.5 w-3.5" />
                    {loading ? 'Eliminando...' : 'Confirmar'}
                  </button>
                  <button className="btn-modal-secondary flex-1" onClick={() => setConfirmDelete(false)} disabled={loading}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button className="btn-modal-danger" onClick={handleEliminar} disabled={loading}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
                <div className="flex gap-2">
                  <button className="btn-modal-secondary" onClick={onClose} disabled={loading}>
                    Cancelar
                  </button>
                  <button className="btn-modal-primary" onClick={handleGuardar} disabled={loading || !nombre.trim()}>
                    <Save className="h-3.5 w-3.5" />
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>{/* fin scroll container */}
      </div>
    </div>
  );
};

export default ModalEditarViaje;
