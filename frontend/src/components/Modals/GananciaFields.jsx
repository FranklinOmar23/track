import { TrendingUp } from 'lucide-react';

const OPCIONES = [
  { value: 'porcentaje',  label: '% del total',       hint: 'Ej. comisión del hotel' },
  { value: 'por_persona', label: 'Monto por persona', hint: 'Ej. ganancia por pax en tours' },
  { value: 'ninguna',     label: 'Sin ganancia',      hint: 'No calcular' },
];

/** Selector de margen de ganancia del viaje (compartido por crear y editar). */
const GananciaFields = ({ tipo, valor, divisa, onTipoChange, onValorChange, disabled }) => (
  <div>
    <label className="modal-section-label flex items-center gap-1.5">
      <TrendingUp className="h-3 w-3" /> Margen de ganancia
    </label>
    <div className="grid grid-cols-3 gap-2">
      {OPCIONES.map((op) => {
        const activa = tipo === op.value;
        return (
          <button key={op.value} type="button" disabled={disabled}
            onClick={() => onTipoChange(op.value)}
            title={op.hint}
            className="px-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: activa ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activa ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: activa ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
            }}>
            {op.label}
          </button>
        );
      })}
    </div>
    {tipo !== 'ninguna' && (
      <div className="mt-2 flex items-center gap-2 animate-fade-in">
        <input
          className="input-dark flex-1"
          type="number"
          min="0"
          max={tipo === 'porcentaje' ? 100 : undefined}
          step="any"
          value={valor}
          onChange={(e) => onValorChange(e.target.value)}
          placeholder={tipo === 'porcentaje' ? 'Ej. 10' : 'Ej. 1500'}
          disabled={disabled}
        />
        <span className="text-sm text-gray-500 shrink-0 w-24">
          {tipo === 'porcentaje' ? '% del total' : `${divisa} / persona`}
        </span>
      </div>
    )}
  </div>
);

export default GananciaFields;
