import { useState } from 'react';
import { Flag, CheckCircle2 } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { avisarError } from '../../utils/avisos';

const fechaCorta = (f) => (f ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(f)) : '');

/** Botón "Poner en revisión" (va junto al selector de centro). */
export const BotonRevision = ({ onClick }) => (
  <button type="button" onClick={onClick}
    className="h-[2.65rem] shrink-0 inline-flex items-center justify-center gap-2 px-4 rounded-[0.6rem] text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
    <Flag className="h-4 w-4" /> Poner en revisión
  </button>
);

/**
 * Bloque de revisión del detalle de habitación.
 * - Si la habitación está en revisión: muestra el motivo y permite resolverla.
 * - Si `editando`: formulario para escribir el motivo.
 */
const RevisionHabitacion = ({ habitacion, soloLectura, editando, onCerrarEdicion }) => {
  const { marcarRevision } = useHabitacionesContext();
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (enRevision) => {
    setGuardando(true);
    try {
      await marcarRevision(habitacion.id, enRevision, enRevision ? nota : '');
      setNota('');
      onCerrarEdicion?.();
    } catch (error) {
      avisarError(`No se pudo actualizar la revisión: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  if (habitacion.enRevision) {
    return (
      <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 animate-fade-in-up">
        <div className="flex items-start gap-2.5">
          <Flag className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">En revisión</p>
            {habitacion.revisionNota && <p className="text-sm text-slate-700 mt-1 break-words">{habitacion.revisionNota}</p>}
            <p className="text-xs text-slate-500 mt-1">
              {habitacion.revisionPor && `Marcada por ${habitacion.revisionPor}`}
              {habitacion.revisionAt && ` · ${fechaCorta(habitacion.revisionAt)}`}
            </p>
          </div>
        </div>
        {!soloLectura && (
          <button type="button" onClick={() => guardar(false)} disabled={guardando}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            {guardando ? 'Guardando...' : 'Marcar como revisada'}
          </button>
        )}
      </div>
    );
  }

  if (soloLectura || !editando) return null;

  return (
    <div className="rounded-xl p-4 space-y-3 bg-amber-50 border border-amber-200 animate-fade-in-up">
      <label className="modal-section-label !mb-0" htmlFor={`revision-${habitacion.id}`}>¿Qué hay que revisar?</label>
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
        <button type="button" className="btn-modal-secondary flex-1" onClick={() => { setNota(''); onCerrarEdicion?.(); }} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" onClick={() => guardar(true)} disabled={guardando}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.6rem] text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50">
          <Flag className="h-4 w-4" />
          {guardando ? 'Guardando...' : 'Poner en revisión'}
        </button>
      </div>
    </div>
  );
};

export default RevisionHabitacion;
