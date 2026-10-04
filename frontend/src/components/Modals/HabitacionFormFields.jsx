// Campos compartidos por los modales de crear y editar habitación
import { Plus, Minus, Gift } from 'lucide-react';

const NINO_VACIO = { nombre: '', edad: '', gratis: false };

const Check = ({ activo, color, size = 'w-4 h-4', text = 'text-[10px]' }) => (
  <div className={`${size} rounded flex items-center justify-center shrink-0`}
    style={{ background: activo ? color : 'rgba(255,255,255,0.1)', transition: 'background 150ms' }}>
    {activo && <span className={`${text} font-bold text-black`}>✓</span>}
  </div>
);

/** Selector de centro/etiqueta con opción de crear una nueva. */
export const EtiquetaFields = ({ etiqueta, onEtiquetaChange, nueva, onNuevaChange, opciones, disabled }) => (
  <>
    <div>
      <label className="modal-section-label">Centro / Etiqueta</label>
      <select className="input-dark" value={etiqueta} disabled={disabled}
        onChange={(e) => { onEtiquetaChange(e.target.value); if (e.target.value !== '__nueva__') onNuevaChange(''); }}>
        <option value="">Sin etiqueta</option>
        {opciones.map((e) => <option key={e} value={e}>{e}</option>)}
        <option value="__nueva__">+ Nueva etiqueta...</option>
      </select>
    </div>

    {etiqueta === '__nueva__' && (
      <div>
        <label className="modal-section-label">Nombre de la etiqueta</label>
        <input className="input-dark" type="text" value={nueva}
          onChange={(e) => onNuevaChange(e.target.value)}
          placeholder="Ej: Centro Nueva Isabela" autoFocus disabled={disabled} />
      </div>
    )}
  </>
);

/** Niños de la habitación: activar, lista (nombre, edad, gratis) y precio por niño. */
export const NinosFields = ({
  hayNinos, onHayNinosChange, ninos, onNinosChange, precioNino, onPrecioNinoChange, stackActivo, disabled,
}) => {
  const actualizar = (idx, campo, valor) =>
    onNinosChange(ninos.map((n, i) => (i === idx ? { ...n, [campo]: valor } : n)));

  const toggle = () => {
    if (hayNinos) {
      onNinosChange([NINO_VACIO]);
      onPrecioNinoChange('');
    }
    onHayNinosChange(!hayNinos);
  };

  return (
    <>
      <div>
        <button type="button" disabled={disabled} onClick={toggle}
          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
          style={{
            background: hayNinos ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${hayNinos ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
          <Check activo={hayNinos} color="#f59e0b" />
          <span className="text-sm font-medium" style={{ color: hayNinos ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
            ¿Hay niños en esta habitación?
          </span>
        </button>
      </div>

      {hayNinos && (
        <div className="space-y-2 pl-1">
          {ninos.map((nino, idx) => (
            <div key={nino.id ?? idx} className="rounded-xl p-3 space-y-2"
              style={{ background: nino.gratis ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${nino.gratis ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 200ms' }}>
              <div className="flex gap-2 items-center">
                <input className="input-dark flex-1" type="text" value={nino.nombre}
                  onChange={(e) => actualizar(idx, 'nombre', e.target.value)}
                  placeholder={`Niño ${idx + 1} — nombre`} disabled={disabled} />
                <input className="input-dark" type="number" value={nino.edad}
                  onChange={(e) => actualizar(idx, 'edad', e.target.value)}
                  placeholder="Edad" min="0" max="17" style={{ width: '70px' }} disabled={disabled} />
                {ninos.length > 1 && (
                  <button type="button" disabled={disabled}
                    onClick={() => onNinosChange(ninos.filter((_, i) => i !== idx))}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button type="button" disabled={disabled}
                onClick={() => actualizar(idx, 'gratis', !nino.gratis)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-left w-full"
                style={{ background: nino.gratis ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${nino.gratis ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                <Check activo={nino.gratis} color="#10b981" size="w-3.5 h-3.5" text="text-[9px]" />
                <Gift className="h-3 w-3 shrink-0" style={{ color: nino.gratis ? '#34d399' : 'rgba(255,255,255,0.3)' }} />
                <span className="text-xs" style={{ color: nino.gratis ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
                  {nino.gratis ? 'No paga — entra gratis' : 'Marcar como gratis (no paga)'}
                </span>
              </button>
            </div>
          ))}
          <button type="button" disabled={disabled}
            onClick={() => onNinosChange([...ninos, NINO_VACIO])}
            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors px-1 py-0.5">
            <Plus className="h-3 w-3" /> Agregar otro niño
          </button>
          <div className="mt-2">
            <label className="modal-section-label">Precio por niño</label>
            <input className="input-dark" type="number" value={precioNino}
              onChange={(e) => onPrecioNinoChange(e.target.value)} placeholder="0"
              disabled={stackActivo || disabled} />
          </div>
        </div>
      )}
    </>
  );
};

/** Interruptor de habitación STACK (no paga). */
export const StackToggle = ({ activo, onChange, disabled }) => (
  <div>
    <button type="button" disabled={disabled} onClick={() => onChange(!activo)}
      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
      style={{
        background: activo ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${activo ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
      }}>
      <Check activo={activo} color="#10b981" />
      <div className="text-left">
        <span className="text-sm font-bold" style={{ color: activo ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
          STACK
        </span>
        <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {activo ? 'Habitación stack (no paga)' : 'Habitación normal'}
        </span>
      </div>
    </button>
  </div>
);
