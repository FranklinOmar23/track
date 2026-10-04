const EDAD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Política de pago de niños por edad (compartida por crear y editar viaje).
 *  edadMinimaPago = 0 → todos pagan; N → niños de N años en adelante pagan. */
const PoliticaNinosFields = ({ edadMinimaPago, onChange, tipo, disabled }) => (
  <div>
    <label className="modal-section-label">Política de niños</label>
    <div className="space-y-2">
      <button type="button" disabled={disabled}
        onClick={() => onChange(0)}
        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left"
        style={{
          background: edadMinimaPago === 0 ? 'rgba(13,148,136,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${edadMinimaPago === 0 ? 'rgba(13,148,136,0.3)' : 'rgba(255,255,255,0.08)'}`,
        }}>
        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: edadMinimaPago === 0 ? '#0d9488' : 'rgba(255,255,255,0.2)' }}>
          {edadMinimaPago === 0 && <div className="w-2 h-2 rounded-full bg-teal-400" />}
        </div>
        <span className="text-sm" style={{ color: edadMinimaPago === 0 ? '#5eead4' : 'rgba(255,255,255,0.45)' }}>
          Todos los niños pagan
        </span>
      </button>
      <button type="button" disabled={disabled}
        onClick={() => onChange(edadMinimaPago === 0 ? 3 : edadMinimaPago)}
        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left"
        style={{
          background: edadMinimaPago > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${edadMinimaPago > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
        }}>
        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: edadMinimaPago > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}>
          {edadMinimaPago > 0 && <div className="w-2 h-2 rounded-full bg-amber-400" />}
        </div>
        <span className="text-sm" style={{ color: edadMinimaPago > 0 ? '#fbbf24' : 'rgba(255,255,255,0.45)' }}>
          Niños de X años en adelante pagan
        </span>
      </button>
      {edadMinimaPago > 0 && (
        <div className="flex items-center gap-3 pl-1 animate-fade-in">
          <span className="text-xs text-gray-500">Edad mínima:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {EDAD_OPTIONS.map((edad) => (
              <button key={edad} type="button" disabled={disabled}
                onClick={() => onChange(edad)}
                className="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150"
                style={{
                  background: edadMinimaPago === edad ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)',
                  color: edadMinimaPago === edad ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${edadMinimaPago === edad ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {edad}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-600">años</span>
        </div>
      )}
      {edadMinimaPago > 0 && (
        <p className="text-[11px] pl-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Niños menores de {edadMinimaPago} año{edadMinimaPago !== 1 ? 's' : ''} entran gratis · Los de {edadMinimaPago}+ pagan {tipo === 'tour' ? 'cuota normal' : 'precio niño'}
        </p>
      )}
    </div>
  </div>
);

export default PoliticaNinosFields;
