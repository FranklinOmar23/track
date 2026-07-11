import { useMemo } from 'react';
import { X } from 'lucide-react';
import { calcularRankingPersonas } from '../../utils/calculos';
import { useDivisa } from '../../hooks/useDivisa';

const MEDAL_COLOR = ['#fbbf24', '#cbd5e1', '#d97706'];

const ModalTopPagadores = ({ habitaciones, onClose }) => {
  const { fmt } = useDivisa();

  const ranking = useMemo(() => {
    return calcularRankingPersonas(habitaciones)
      .filter((p) => p.pagado > 0)
      .sort((a, b) => b.pagado - a.pagado);
  }, [habitaciones]);

  const max = ranking.length ? ranking[0].pagado : 0;

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="orb w-40 h-40 pointer-events-none" style={{ top: '-40px', left: '-40px', background: '#10b981', opacity: 0.1 }} />

        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
            style={{ background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-lg font-bold text-white">Personas que más pagan</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {ranking.length} persona{ranking.length !== 1 ? 's' : ''} con pagos registrados
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative px-6 py-5">
            {ranking.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Aún no hay pagos registrados.</p>
            ) : (
              <div className="space-y-2.5">
                {ranking.map((p, idx) => (
                  <div key={p.nombre} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{
                        background: idx < 3 ? `${MEDAL_COLOR[idx]}26` : 'rgba(255,255,255,0.06)',
                        color: idx < 3 ? MEDAL_COLOR[idx] : '#6b7280',
                        border: `1px solid ${idx < 3 ? `${MEDAL_COLOR[idx]}55` : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-sm mb-1">
                        <span className="text-gray-200 font-medium truncate">{p.nombre}</span>
                        <span className="text-emerald-400 font-bold tabular-nums shrink-0">{fmt(p.pagado)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${max > 0 ? (p.pagado / max) * 100 : 0}%`, background: '#10b981' }} />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">
                        Hab. {p.habitaciones.join(', ')}
                        {p.pendiente > 0 && <span className="text-rose-400"> · debe {fmt(p.pendiente)}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button type="button" className="btn-modal-secondary" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalTopPagadores;
