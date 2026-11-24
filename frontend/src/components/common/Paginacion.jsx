import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Números a mostrar: siempre la primera, la última y las vecinas de la actual; '…' en los huecos. */
const paginasVisibles = (actual, totalPaginas) => {
  const set = new Set([1, totalPaginas, actual - 1, actual, actual + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= totalPaginas).sort((a, b) => a - b);
  const resultado = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) resultado.push(`hueco-${n}`);
    resultado.push(n);
  });
  return resultado;
};

/** Paginación: "Mostrando 11–20 de 556" + Anterior / números / Siguiente. */
const Paginacion = ({ pagina, porPagina, total, onCambiar, disabled }) => {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  const boton = 'min-w-[2rem] h-8 px-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-xs text-slate-500">
        Mostrando <span className="text-slate-700 font-semibold">{desde}–{hasta}</span> de{' '}
        <span className="text-slate-700 font-semibold">{total}</span>
      </p>

      {totalPaginas > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginación">
          <button type="button" onClick={() => onCambiar(pagina - 1)} disabled={disabled || pagina === 1}
            className={`${boton} flex items-center gap-1 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50`}>
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {paginasVisibles(pagina, totalPaginas).map((n) =>
            typeof n === 'string' ? (
              <span key={n} className="px-1 text-xs text-slate-400">…</span>
            ) : (
              <button key={n} type="button" onClick={() => onCambiar(n)} disabled={disabled}
                aria-current={n === pagina ? 'page' : undefined}
                className={`${boton} ${
                  n === pagina
                    ? 'bg-slate-900 text-white border border-slate-900'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                }`}>
                {n}
              </button>
            )
          )}

          <button type="button" onClick={() => onCambiar(pagina + 1)} disabled={disabled || pagina === totalPaginas}
            className={`${boton} flex items-center gap-1 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50`}>
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
};

export default Paginacion;
