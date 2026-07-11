import { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { X, ArrowRightLeft } from 'lucide-react';

const ModalMoverPersona = ({ habOrigen, perIdx, persona, onClose }) => {
  const { state, moverPersona } = useHabitacionesContext();

  const destinos = state.habitaciones.filter((hab) => {
    if (hab.id === habOrigen) return false;
    const ocupados  = hab.personas.filter((p) => p.n).length;
    const capacidad = hab.tipo === 'Triple' ? 3 : hab.tipo === 'Single' ? 1 : 2;
    return ocupados <= capacidad;
  });

  const [destinoSeleccionado, setDestinoSeleccionado] = useState(destinos[0]?.id || '');

  useEffect(() => {
    setDestinoSeleccionado(destinos[0]?.id || '');
  }, [destinos.length]);

  const handleMover = () => {
    if (!destinoSeleccionado) return;
    moverPersona(habOrigen, parseInt(destinoSeleccionado, 10), perIdx);
    onClose();
  };

  return (
    <div className="modal-overlay-dark" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal-card-dark w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Cyan orb */}
        <div className="orb w-28 h-28 pointer-events-none" style={{ top: '-20px', right: '-20px', background: '#06b6d4', opacity: 0.1 }} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Mover persona</h3>
            </div>
            <p className="text-xs text-gray-600">{persona.n || '(sin nombre)'}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-5 py-4">
          {destinos.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-3">🚫</div>
              <p className="text-sm text-gray-500 leading-relaxed">
                No hay habitaciones disponibles con espacio para mover a esta persona.
              </p>
              <button type="button" className="btn-modal-secondary mt-4 w-full" onClick={onClose}>
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="modal-section-label">Habitación destino</label>
                <select className="input-dark" value={destinoSeleccionado}
                  onChange={(e) => setDestinoSeleccionado(e.target.value)}>
                  {destinos.map((hab) => {
                    const ocupados  = hab.personas.filter((p) => p.n).length;
                    const capacidad = hab.tipo === 'Triple' ? 3 : hab.tipo === 'Single' ? 1 : 2;
                    const llena     = ocupados >= capacidad;
                    const label     = llena
                      ? `Hab ${hab.num} (${hab.tipo} → ${hab.tipo === 'Single' ? 'Doble' : 'Triple'})`
                      : `Hab ${hab.num} — ${hab.tipo} (${ocupados}/${capacidad} personas)`;
                    return <option key={hab.id} value={hab.id}>{label}</option>;
                  })}
                </select>
              </div>

              <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button type="button" className="btn-modal-secondary flex-1" onClick={onClose}>
                  Cancelar
                </button>
                <button type="button" className="btn-modal-primary flex-1"
                  onClick={handleMover} disabled={!destinoSeleccionado}>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Mover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalMoverPersona;
