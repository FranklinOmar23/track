import { useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ModalNumerosHabitaciones = ({ habitaciones, onClose }) => {
  const { rango, existentesSet, faltantes, otras, min, max } = useMemo(() => {
    const numericos = [];
    const otras = [];

    habitaciones.forEach((h) => {
      const raw = String(h.num ?? '').trim();
      if (/^\d+$/.test(raw)) {
        numericos.push(parseInt(raw, 10));
      } else if (raw) {
        otras.push(raw);
      }
    });

    const existentesSet = new Set(numericos);
    const min = numericos.length ? Math.min(...numericos) : null;
    const max = numericos.length ? Math.max(...numericos) : null;

    const rango = [];
    if (min !== null) {
      for (let i = min; i <= max; i++) rango.push(i);
    }
    const faltantes = rango.filter((n) => !existentesSet.has(n));

    return { rango, existentesSet, faltantes, otras: otras.sort(), min, max };
  }, [habitaciones]);

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="orb w-40 h-40 pointer-events-none" style={{ top: '-40px', left: '-40px', background: '#0d9488', opacity: 0.1 }} />

        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
            style={{ background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-lg font-bold text-white">Habitaciones</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {habitaciones.length} habitaciones {min !== null && `· rango ${min}–${max}`}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative px-6 py-5 space-y-5">
            {faltantes.length > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="text-sm text-rose-300">
                  Faltan {faltantes.length} número{faltantes.length !== 1 ? 's' : ''}: {faltantes.join(', ')}
                </span>
              </div>
            )}

            {rango.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No hay habitaciones numeradas.</p>
            )}

            {rango.length > 0 && (
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {rango.map((n) => {
                  const existe = existentesSet.has(n);
                  return (
                    <div
                      key={n}
                      className="flex items-center justify-center rounded-lg py-2 text-sm font-semibold"
                      style={
                        existe
                          ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }
                          : { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', color: '#fb7185' }
                      }
                    >
                      {n}
                    </div>
                  );
                })}
              </div>
            )}

            {otras.length > 0 && (
              <div>
                <label className="modal-section-label">Otras habitaciones (ID no numérico)</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {otras.map((o) => (
                    <span key={o} className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button type="button" className="btn-modal-secondary" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNumerosHabitaciones;
