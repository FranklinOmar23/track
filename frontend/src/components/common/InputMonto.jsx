import { simboloDivisa } from '../../utils/formatters';

/** Input numérico de dinero con el símbolo de la divisa a la izquierda. */
const InputMonto = ({ divisa, value, onChange, placeholder = '0', disabled, autoFocus, min = '0', ...resto }) => (
  <div className="input-monto">
    <span>{simboloDivisa(divisa)}</span>
    <input
      className="input-dark tabular-nums"
      type="number"
      inputMode="decimal"
      min={min}
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      {...resto}
    />
  </div>
);

export default InputMonto;
