import { Users } from 'lucide-react';

/** Tarjeta de habitación de solo lectura para la vista pública compartida. */
const HabitacionPublicaCard = ({ habitacion, fmt }) => {
  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  const totalHab = habitacion.total || 0;
  const pendiente = totalHab - totalPagado;
  const porcentaje = totalHab > 0 ? (totalPagado / totalHab) * 100 : 0;
  const isStack = habitacion.stack;
  const isComplete = !isStack && pendiente <= 0 && totalPagado > 0;

  let borderColor;
  if (isStack) borderColor = 'border-emerald-500/50';
  else if (isComplete) borderColor = 'border-teal-500/50';
  else if (porcentaje >= 30) borderColor = 'border-blue-500/40';
  else if (porcentaje > 0) borderColor = 'border-amber-500/40';
  else borderColor = 'border-red-500/30';

  return (
    <div className={`bg-[#1a1f2e] border ${borderColor} rounded-xl p-4 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/25">
            Hab. {habitacion.num}
          </span>
          {habitacion.tipo && (
            <span className="text-xs text-gray-500">{habitacion.tipo}</span>
          )}
          {isStack && (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">STACK</span>
          )}
          {isComplete && !isStack && (
            <span className="px-2 py-0.5 rounded text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20">Completada</span>
          )}
        </div>
        {habitacion.etiqueta && (
          <span className="text-xs text-gray-500 truncate max-w-[100px]">{habitacion.etiqueta}</span>
        )}
      </div>

      {habitacion.personas.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {habitacion.personas.map((persona, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-200">
                {persona.n}
                {persona.esNino && <span className="text-xs text-amber-400 ml-1">(niño)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isStack && totalHab > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso</span>
            <span>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2 border-t border-white/[0.05]">
        {totalPagado > 0 && (
          <div>
            <p className="text-xs text-gray-500">Pagado</p>
            <p className="text-sm font-semibold text-emerald-400">{fmt(totalPagado)}</p>
          </div>
        )}
        {!isStack && pendiente > 0 && (
          <div>
            <p className="text-xs text-gray-500">Pendiente</p>
            <p className="text-sm font-semibold text-rose-400">{fmt(pendiente)}</p>
          </div>
        )}
        {!totalPagado && !isStack && (
          <span className="text-xs text-gray-500">Sin pagos</span>
        )}
      </div>
    </div>
  );
};

export default HabitacionPublicaCard;
