import { Plus, ArrowRightLeft, CreditCard, Gift } from 'lucide-react';
import { calcularCuotaPersona, ninoDebePagar } from '../../utils/calculos';
import { etiquetaPeriodo } from '../../utils/formatters';

/** Tarjeta de una persona en el detalle de habitación: pagos, cuota y acciones. */
const PersonaDetalle = ({ persona, habitacion, fmt, soloLectura, onPago, onMover }) => {
  const pagadoPersona = persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
  const cuota         = calcularCuotaPersona(habitacion, persona);
  const pendienteP    = Math.max(0, cuota - pagadoPersona);
  const esNino        = persona.esNino || /\(\d+ años\)/.test(persona.n || '');
  const esGratis      = esNino && (persona.esGratis || !ninoDebePagar(persona, habitacion.edadMinimaPago));

  return (
    <div
      className="rounded-xl p-3.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: esNino ? 'rgba(245,158,11,0.25)' : 'rgba(13,148,136,0.25)' }}
          >
            {persona.n?.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-semibold text-white">{persona.n}</span>
            {esNino && (
              <span className="ml-1.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">niño</span>
            )}
          {esGratis && (
              <span className="ml-1 flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <Gift className="h-2.5 w-2.5" /> gratis
              </span>
            )}
          </div>
        </div>
        {!soloLectura && <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPago(null)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-teal-400 hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20 transition-all"
          >
            <Plus className="h-3 w-3" /> Pago
          </button>
          <button
            type="button"
            onClick={() => onMover()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all"
          >
            <ArrowRightLeft className="h-3 w-3" /> Mover
          </button>
        </div>}
      </div>

      {/* Pagos list */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {(persona.pagos || []).map((pago, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => !soloLectura && onPago(pago)}
            disabled={soloLectura}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(13,148,136,0.12)',
              border: '1px solid rgba(13,148,136,0.2)',
              color: '#5eead4',
            }}
            title={soloLectura ? undefined : 'Click para editar/eliminar pago'}
          >
            <CreditCard className="h-2.5 w-2.5" />
            {etiquetaPeriodo(pago.mes, pago.anio)} — {fmt(pago.monto)}
          </button>
        ))}
        {(!persona.pagos || persona.pagos.length === 0) && (
          <span className="text-xs text-gray-600 italic px-1">Sin pagos registrados</span>
        )}
      </div>

      {/* Person totals */}
      <div className="flex items-center gap-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {esGratis ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Gift className="h-3 w-3" />
            Sin costo · entra gratis
          </div>
        ) : (
          <>
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide">Cuota</div>
              <div className="text-xs font-bold text-gray-300 tabular-nums">{fmt(cuota)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide">Pagado</div>
              <div className="text-xs font-bold text-emerald-400 tabular-nums">{fmt(pagadoPersona)}</div>
            </div>
            {pendienteP > 0 && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Pendiente</div>
                <div className="text-xs font-bold text-rose-400 tabular-nums">-{fmt(pendienteP)}</div>
              </div>
            )}
            {pendienteP === 0 && cuota > 0 && (
              <div className="text-xs font-bold text-emerald-400">✓ Completo</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PersonaDetalle;
