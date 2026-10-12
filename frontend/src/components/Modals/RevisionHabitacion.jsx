import { useState } from 'react';
import { Flag, CheckCircle2 } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';

const fechaCorta = (f) => (f ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(f)) : '');

/** Bloque "En revisión" del detalle de habitación: marcar con motivo o resolver. */
const RevisionHabitacion = ({ habitacion, soloLectura }) => {
  const { marcarRevision } = useHabitacionesContext();
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (enRevision) => {
    setGuardando(true);
    try {
      await marcarRevision(habitacion.id, enRevision, enRevision ? nota : '');
      setEditando(false);
      setNota('');
    } catch (error) {
      alert(`No se pudo actualizar la revisión: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  if (habitacion.enRevision) {
    return (
      <div className="rounded-xl p-3.5 animate-fade-in-up"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }}>
        <div className="flex items-start gap-2.5">
          <Flag className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">En revisión</p>
            {habitacion.revisionNota && <p className="text-sm text-gray-300 mt-1 break-words">{habitacion.revisionNota}</p>}
            <p className="text-[11px] text-gray-500 mt-1">
              {habitacion.revisionPor && `Marcada por ${habitacion.revisionPor}`}
              {habitacion.revisionAt && ` · ${fechaCorta(habitacion.revisionAt)}`}
            </p>
          </div>
        </div>
        {!soloLectura && (
          <button type="button" onClick={() => guardar(false)} disabled={guardando}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {guardando ? 'Guardando...' : 'Marcar como revisada'}
          </button>
        )}
      </div>
    );
  }

  if (soloLectura) return null;

  if (!editando) {
    return (
      <button type="button" onClick={() => setEditando(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300/90 border border-dashed border-amber-500/30 hover:bg-amber-500/10 transition-colors">
        <Flag className="h-3.5 w-3.5" />
        Poner en revisión
      </button>
    );
  }

  return (
    <div className="rounded-xl p-3.5 space-y-2.5 animate-fade-in-up"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.22)' }}>
      <label className="modal-section-label" htmlFor={`revision-${habitacion.id}`}>¿Qué hay que revisar?</label>
      <textarea
        id={`revision-${habitacion.id}`}
        className="input-dark resize-none"
        rows={2}
        maxLength={255}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: confirmar pago por transferencia, falta un nombre…"
        autoFocus
        disabled={guardando}
      />
      <div className="flex gap-2">
        <button type="button" className="btn-modal-secondary flex-1" onClick={() => { setEditando(false); setNota(''); }} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" onClick={() => guardar(true)} disabled={guardando}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50">
          <Flag className="h-3.5 w-3.5" />
          {guardando ? 'Guardando...' : 'Poner en revisión'}
        </button>
      </div>
    </div>
  );
};

export default RevisionHabitacion;
