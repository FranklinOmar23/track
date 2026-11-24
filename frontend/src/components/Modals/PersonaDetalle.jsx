import { Plus, ArrowRightLeft, Gift, Layers, Crown, GripVertical } from 'lucide-react';
import { calcularCuotaPersona, calcularPendientePersona, ninoDebePagar } from '../../utils/calculos';


/** Dato del pie de la tarjeta (CUOTA / PAGADO / PENDIENTE…). */
const Dato = ({ label, children, color = 'text-slate-900', titulo }) => (
  <div title={titulo}>
    <p className="label-mayus">{label}</p>
    <p className={`text-sm font-semibold tabular-nums mt-0.5 ${color}`}>{children}</p>
  </div>
);

/**
 * Tarjeta de una persona en el detalle de habitación: pagos, cuota y acciones.
 * titular: es la primera persona de la habitación (círculo dorado).
 * arrastrable: se puede arrastrar sobre el titular para cambiarlo.
 */
const PersonaDetalle = ({
  persona, habitacion, fmt, soloLectura, puedePagar, onPago, onMover,
  titular = false, arrastrable = false, onHacerTitular,
}) => {
  const pagadoPersona = persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
  const cuota         = calcularCuotaPersona(habitacion, persona);
  const pendienteP    = calcularPendientePersona(habitacion, persona);
  const cubierto      = Math.max(0, cuota - pagadoPersona) - pendienteP;
  const esNino        = persona.esNino || /\(\d+ años\)/.test(persona.n || '');
  const esGratis      = esNino && (persona.esGratis || !ninoDebePagar(persona, habitacion.edadMinimaPago));
  const pagos         = persona.pagos || [];

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {arrastrable && (
              <GripVertical className="h-4 w-4 text-slate-400 shrink-0 -mr-1.5 cursor-grab" aria-hidden="true" />
            )}
            <span className={`h-9 w-9 rounded-full bg-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center shrink-0 ${titular ? 'avatar-titular' : ''}`}
              title={titular ? 'Titular de la habitación' : undefined}>
              {persona.n?.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex flex-wrap items-center gap-1.5">
              <span className="text-[15px] font-semibold text-slate-900 truncate">{persona.n}</span>
              {titular && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 rounded-full leading-4"
                  style={{ background: '#fbf1d3', color: '#8a5a00' }}>
                  <Crown className="h-2.5 w-2.5" /> titular
                </span>
              )}
              {esNino && <span className="text-[10px] font-semibold px-1.5 rounded-full bg-amber-50 text-amber-800 leading-4">niño</span>}
              {persona.esStack && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 rounded-full bg-violet-50 text-violet-700 leading-4">
                  <Layers className="h-2.5 w-2.5" /> stack
                </span>
              )}
              {esGratis && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 rounded-full bg-emerald-50 text-emerald-700 leading-4">
                  <Gift className="h-2.5 w-2.5" /> gratis
                </span>
              )}
            </div>
          </div>
          {(puedePagar || !soloLectura) && (
            <div className="flex items-center gap-2 shrink-0">
              {!soloLectura && !titular && onHacerTitular && (
                <button type="button" onClick={onHacerTitular} title="Hacer titular" aria-label={`Hacer titular a ${persona.n}`}
                  className="btn btn-borde !px-2.5 text-amber-700 hover:!border-amber-300 hover:!bg-amber-50">
                  <Crown className="h-4 w-4" />
                </button>
              )}
              {!soloLectura && (
                <button type="button" onClick={() => onMover()} className="btn btn-borde !font-medium">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Mover
                </button>
              )}
              {puedePagar && (
                <button type="button" onClick={() => onPago(null)} className="btn btn-primario">
                  <Plus className="h-4 w-4" /> Pago
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagos */}
        <div className="flex flex-wrap gap-2 mt-3.5">
          {pagos.map((pago, idx) => (
            <button
              key={pago.id ?? idx}
              type="button"
              onClick={() => puedePagar && onPago(pago)}
              disabled={!puedePagar}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] border border-emerald-200 bg-emerald-50/70 text-emerald-800 transition-colors ${
                puedePagar ? 'hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer' : 'cursor-default'
              }`}
              title={puedePagar ? 'Clic para editar o eliminar el pago' : undefined}
            >
              <span className="font-semibold">{pago.mes}{pago.anio ? ` ${pago.anio}` : ''}</span>
              <span className="tabular-nums">{fmt(pago.monto)}</span>
            </button>
          ))}
          {pagos.length === 0 && <span className="text-sm text-slate-400 italic">Sin pagos registrados</span>}
        </div>
      </div>

      {/* Totales de la persona */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
        {persona.esStack ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-700">
            <Layers className="h-4 w-4" /> Stack · no paga su parte
          </p>
        ) : esGratis ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Gift className="h-4 w-4" /> Sin costo · entra gratis
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Dato label="Cuota">{fmt(cuota)}</Dato>
            <Dato label="Pagado" color="text-emerald-700">{fmt(pagadoPersona)}</Dato>
            {pendienteP > 0 ? (
              <Dato label="Pendiente" color="text-red-700">{fmt(pendienteP)}</Dato>
            ) : cubierto > 0 ? (
              <Dato label="Cubierto por la hab." color="text-sky-700" titulo="Pagado de más por otra persona de la habitación">{fmt(cubierto)}</Dato>
            ) : pagadoPersona > cuota && cuota >= 0 ? (
              <Dato label="A favor" color="text-sky-700" titulo="Pagó más que su cuota: el excedente se aplica a los demás de la habitación">
                {fmt(pagadoPersona - cuota)}
              </Dato>
            ) : (
              <Dato label="Pendiente" color="text-emerald-700">✓ Completo</Dato>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaDetalle;
