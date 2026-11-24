import InputMonto from '../common/InputMonto';

const OPCIONES = [
  { value: 'porcentaje',  label: '% del total',       hint: 'Ej. comisión del hotel' },
  { value: 'por_persona', label: 'Monto por persona', hint: 'Ej. ganancia por pax en tours' },
  { value: 'ninguna',     label: 'Sin ganancia',      hint: 'No calcular' },
];

/** Margen de ganancia del viaje (compartido por crear y editar). */
const GananciaFields = ({ tipo, valor, divisa, onTipoChange, onValorChange, disabled }) => (
  <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 pb-4 pt-1">
    <legend className="px-1.5 text-[13px] font-semibold text-slate-700">Margen de ganancia</legend>

    <div className="segmentado w-full mt-1" role="radiogroup" aria-label="Tipo de margen">
      {OPCIONES.map((op) => (
        <button key={op.value} type="button" role="radio" aria-checked={tipo === op.value} disabled={disabled}
          onClick={() => onTipoChange(op.value)} title={op.hint} className="flex-1 !px-2 !text-xs sm:!text-[13px]">
          {op.label}
        </button>
      ))}
    </div>

    {tipo !== 'ninguna' && (
      <div className="mt-3 flex items-center gap-3 animate-fade-in-up">
        <div className="w-40 sm:w-52 shrink-0">
          {tipo === 'porcentaje' ? (
            <div className="input-monto prefijo">
              <span>%</span>
              <input className="input-dark tabular-nums" type="number" inputMode="decimal" min="0" max="100" step="any"
                value={valor} onChange={(e) => onValorChange(e.target.value)} placeholder="Ej: 10" disabled={disabled} />
            </div>
          ) : (
            <InputMonto divisa={divisa} value={valor} onChange={onValorChange} placeholder="Ej: 1500" disabled={disabled} />
          )}
        </div>
        <span className="text-sm text-slate-500">
          {tipo === 'porcentaje' ? 'del total vendido' : 'por persona que paga'}
        </span>
      </div>
    )}
  </fieldset>
);

export default GananciaFields;
