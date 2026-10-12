import { FileSpreadsheet, X } from 'lucide-react';
import Portal from './Portal';

/**
 * Pantalla animada mientras se genera un Excel.
 * fase: 'generando' → hoja que se llena + barra; 'listo' → check animado; 'error' → mensaje.
 */
const GenerandoExcel = ({ fase, titulo, archivo, error, onCerrar }) => {
  if (!fase) return null;

  return (
    <Portal>
    <div className="modal-overlay-dark" style={{ zIndex: 80 }} role="status" aria-live="polite"
      onClick={fase === 'generando' ? undefined : onCerrar}>
      <div className="modal-card-dark w-full max-w-xs px-6 py-7 text-center" onClick={(e) => e.stopPropagation()}>
        {fase === 'generando' && (
          <>
            {/* Hoja de cálculo que se va llenando */}
            <div className="mx-auto w-24 rounded-xl p-2.5 mb-5 border border-emerald-500/25"
              style={{ background: 'linear-gradient(160deg, rgba(16,185,129,0.14), rgba(16,185,129,0.04))' }}>
              <div className="h-2.5 rounded-sm bg-emerald-400/70 mb-1.5" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-1 mb-1">
                  <div className="h-1.5 w-1/4 rounded-sm bg-white/15" />
                  <div className="h-1.5 flex-1 rounded-sm bg-emerald-300/60 excel-fila" style={{ animationDelay: `${i * 0.18}s` }} />
                </div>
              ))}
            </div>
            <p className="text-sm font-semibold text-white">Generando {titulo}…</p>
            <p className="text-xs text-gray-500 mt-1">Calculando montos y dando formato</p>
            <div className="mt-5 h-1 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 barra-indeterminada" />
            </div>
          </>
        )}

        {fase === 'listo' && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pop-in"
              style={{ background: 'rgba(16,185,129,0.15)', boxShadow: '0 0 0 6px rgba(16,185,129,0.07)' }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" className="check-dibujado" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">¡Excel listo!</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1.5 break-all">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              {archivo}
            </p>
          </>
        )}

        {fase === 'error' && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 animate-pop-in bg-rose-500/15">
              <X className="h-7 w-7 text-rose-400" />
            </div>
            <p className="text-sm font-semibold text-white">No se pudo generar el Excel</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <button type="button" onClick={onCerrar} className="btn-modal-secondary mt-5 w-full">Cerrar</button>
          </>
        )}
      </div>
    </div>
    </Portal>
  );
};

export default GenerandoExcel;
