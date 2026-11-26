import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { escucharAvisos } from '../../utils/avisos';
import Portal from './Portal';

const DURACION = { exito: 2400, error: 6000, info: 3200 };

/** Check verde que se dibuja (círculo que "salta" + palomita trazada). */
export const CheckAnimado = ({ tamano = 28 }) => (
  <span className="relative inline-flex shrink-0 animate-pop-in" style={{ width: tamano, height: tamano }}>
    <span className="absolute inset-0 rounded-full bg-emerald-500/25 aviso-onda" />
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} className="relative">
      <circle cx="12" cy="12" r="12" fill="#059669" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        className="check-dibujado" />
    </svg>
  </span>
);

/** Ícono de error (círculo rojo con una X). */
const ErrorAnimado = ({ tamano = 28 }) => (
  <span className="relative inline-flex shrink-0 animate-pop-in" style={{ width: tamano, height: tamano }}>
    <svg viewBox="0 0 24 24" width={tamano} height={tamano}>
      <circle cx="12" cy="12" r="12" fill="#dc2626" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" className="check-dibujado" />
    </svg>
  </span>
);

/** Muestra abajo al centro los avisos: cambios realizados (verde) y errores (rojo). */
const AvisosExito = () => {
  const [avisos, setAvisos] = useState([]);

  const quitar = (id) => {
    setAvisos((a) => a.map((x) => (x.id === id ? { ...x, saliendo: true } : x)));
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 300);
  };

  useEffect(() => escucharAvisos(({ tipo, mensaje }) => {
    const id = `${Date.now()}-${Math.random()}`;
    // Máximo 3 a la vez; los nuevos abajo
    setAvisos((a) => [...a.slice(-2), { id, tipo, mensaje, saliendo: false }]);
    setTimeout(() => quitar(id), DURACION[tipo] - 300);
  }), []);

  if (!avisos.length) return null;

  return (
    <Portal>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2 w-[min(92vw,480px)] pointer-events-none"
        role="status" aria-live="polite">
        {avisos.map((a) => {
          const error = a.tipo === 'error';
          return (
            <div key={a.id}
              role={error ? 'alert' : undefined}
              className={`pointer-events-auto flex items-center gap-3 pl-2.5 py-2.5 bg-white border shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] ${
                error ? 'rounded-2xl border-red-200 pr-2.5 w-full' : a.tipo === 'info' ? 'rounded-full border-teal-200 pr-5' : 'rounded-full border-emerald-200 pr-5'
              } ${a.saliendo ? 'aviso-salida' : 'aviso-entrada'}`}>
              {error ? <ErrorAnimado /> : a.tipo === 'info' ? (
                <span className="h-7 w-7 rounded-full bg-teal-50 text-teal-700 inline-flex items-center justify-center shrink-0 animate-pop-in">
                  <RefreshCw className="h-3.5 w-3.5" />
                </span>
              ) : <CheckAnimado />}
              <span className={`text-sm font-semibold ${error ? 'text-red-800 flex-1' : 'text-slate-900 whitespace-nowrap'}`}>
                {a.mensaje}
              </span>
              {error && (
                <button type="button" onClick={() => quitar(a.id)} aria-label="Cerrar aviso"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Portal>
  );
};

export default AvisosExito;
