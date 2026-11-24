import { Users } from 'lucide-react';
import { calcularTotalHabitacion } from '../../utils/calculos';

/** Tarjeta de habitación de solo lectura para la vista pública compartida. */
const HabitacionPublicaCard = ({ habitacion, fmt }) => {
  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  // Total real: cuota de adultos + niños que pagan, sin personas stack (igual que en la app)
  const totalHab = calcularTotalHabitacion(habitacion);
  const pendiente = Math.max(0, totalHab - totalPagado);
  const porcentaje = totalHab > 0 ? (totalPagado / totalHab) * 100 : 0;
  const isStack = habitacion.stack;
  const isComplete = !isStack && pendiente <= 0 && totalPagado > 0;

  let borderColor;
  if (isStack) borderColor = 'border-emerald-200';
  else if (isComplete) borderColor = 'border-teal-200';
  else if (porcentaje >= 30) borderColor = 'border-blue-200';
  else if (porcentaje > 0) borderColor = 'border-amber-200';
  else borderColor = 'border-red-200';

  return (
    <div className={`bg-white border ${borderColor} rounded-xl p-4 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Hab. {habitacion.num}
          </span>
          {habitacion.tipo && (
            <span className="text-xs text-slate-500">{habitacion.tipo}</span>
          )}
          {isStack && (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">STACK</span>
          )}
          {isComplete && !isStack && (
            <span className="px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-700 border border-teal-200">Completada</span>
          )}
        </div>
        {habitacion.etiqueta && (
          <span className="text-xs text-slate-500 truncate max-w-[100px]">{habitacion.etiqueta}</span>
        )}
      </div>

      {habitacion.personas.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {habitacion.personas.map((persona, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-slate-500" />
              </div>
              <span className="text-sm text-slate-800">
                {persona.n}
                {persona.esNino && <span className="text-xs text-amber-700 ml-1">(niño)</span>}
                {persona.esStack && <span className="text-xs text-emerald-700 ml-1">(stack)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isStack && totalHab > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progreso</span>
            <span>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
        {totalPagado > 0 && (
          <div>
            <p className="text-xs text-slate-500">Pagado</p>
            <p className="text-sm font-semibold text-emerald-700">{fmt(totalPagado)}</p>
          </div>
        )}
        {!isStack && pendiente > 0 && (
          <div>
            <p className="text-xs text-slate-500">Pendiente</p>
            <p className="text-sm font-semibold text-red-700">{fmt(pendiente)}</p>
          </div>
        )}
        {!totalPagado && !isStack && (
          <span className="text-xs text-slate-500">Sin pagos</span>
        )}
      </div>
    </div>
  );
};

export default HabitacionPublicaCard;
