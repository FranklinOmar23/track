import { useMemo } from 'react';
import { X } from 'lucide-react';
import { calcularRankingPersonas } from '../../utils/calculos';
import { formatoCompacto } from '../../utils/formatters';
import { useDivisa } from '../../hooks/useDivisa';
import Grafico from '../common/Grafico';

const TOP_GRAFICO = 15;
const MEDALLA = [
  { bg: '#fdf0d5', text: '#92400e' },
  { bg: '#eef2f6', text: '#475569' },
  { bg: '#fbe9dc', text: '#9a3412' },
];

const ModalTopPagadores = ({ habitaciones, onClose }) => {
  const { fmt, divisa } = useDivisa();

  const ranking = useMemo(() => calcularRankingPersonas(habitaciones)
    .filter((p) => p.pagado > 0)
    .sort((a, b) => b.pagado - a.pagado), [habitaciones]);

  const total = ranking.reduce((s, p) => s + p.pagado, 0);
  const top = useMemo(() => ranking.slice(0, TOP_GRAFICO), [ranking]);
  const compacto = useMemo(() => formatoCompacto(divisa), [divisa]);
  const categorias = useMemo(() => top.map((p) => p.nombre), [top]);
  const series = useMemo(() => [
    { name: 'Pagado', type: 'bar', color: '#059669', stack: true, data: top.map((p) => p.pagado), format: (v) => fmt(v) },
    { name: 'Pendiente', type: 'bar', color: '#f4a9a3', stack: true, data: top.map((p) => p.pendiente), format: (v) => fmt(v) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [top]);

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-6 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Personas que más pagan</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {ranking.length} persona{ranking.length !== 1 ? 's' : ''} con pagos · {fmt(total)} recaudado
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6">
            {ranking.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">Aún no hay pagos registrados.</p>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Top {top.length}: lo pagado y lo que falta
                  </p>
                  <Grafico type="bar" height={280} categories={categorias} series={series}
                    y={{ format: compacto, zero: true }} bar={{ radius: 4, padding: 0.3 }}
                    legend={{ show: true }} tooltip={{ header: '{x}', footer: 'Cuota: {total}' }}
                    export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Personas que más pagan' }} />
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {ranking.map((p, idx) => (
                    <div key={`${p.nombre}-${idx}`} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                        style={idx < 3 ? { background: MEDALLA[idx].bg, color: MEDALLA[idx].text } : { background: 'var(--suave)', color: 'var(--tinta-3)' }}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                        <p className="text-xs text-slate-500">Hab. {p.habitaciones.join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-700 tabular-nums">{fmt(p.pagado)}</p>
                        <p className={`text-xs tabular-nums ${p.pendiente > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                          {p.pendiente > 0 ? `debe ${fmt(p.pendiente)}` : 'al día'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end px-5 sm:px-7 py-4 border-t border-slate-100">
            <button type="button" className="btn-modal-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalTopPagadores;
