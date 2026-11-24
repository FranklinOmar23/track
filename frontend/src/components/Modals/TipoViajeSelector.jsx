const TIPOS = [
  { valor: 'resort', letra: 'R', titulo: 'Resort', detalle: 'Por habitaciones' },
  { valor: 'tour', letra: 'T', titulo: 'Tour', detalle: 'Por pasajeros' },
];

/** Selección del tipo de viaje en dos tarjetas (Resort / Tour). */
const TipoViajeSelector = ({ valor, onChange, disabled }) => (
  <div>
    <span className="modal-section-label">Tipo de viaje</span>
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de viaje">
      {TIPOS.map((t) => {
        const activo = valor === t.valor;
        return (
          <button key={t.valor} type="button" role="radio" aria-checked={activo} disabled={disabled}
            onClick={() => onChange(t.valor)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors disabled:opacity-60 ${
              activo ? 'border-teal-700 bg-[#eef7f5] ring-1 ring-teal-700' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}>
            <span className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 bg-white ${
              activo ? 'border-teal-200 text-teal-700' : 'border-slate-200 text-teal-700'
            }`}>
              {t.letra}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{t.titulo}</span>
              <span className="block text-xs text-slate-500">{t.detalle}</span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default TipoViajeSelector;
