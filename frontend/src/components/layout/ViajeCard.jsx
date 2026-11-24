import { ChevronRight, Calendar, Home, Bus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { situacionViaje, textoSituacion, rangoLargo } from '../../utils/viajeFechas';

const ESTILO_INSIGNIA = {
  terminado: 'etiqueta-ambar',
  en_curso: 'bg-emerald-50 text-emerald-700',
  proximo: 'etiqueta-gris',
};

/** Tarjeta de un viaje en "Mis viajes": fechas, cuánto falta para salir y avance de cobro. */
export const ViajeCard = ({ viaje, onSelect, index = 0 }) => {
  const tour = viaje.tipo === 'tour';
  const Icono = tour ? Bus : Home;
  const situacion = situacionViaje(viaje);
  const insignia = textoSituacion(situacion);
  const rango = rangoLargo(viaje);
  const pct = Math.round(viaje.pct || 0);
  const divisa = viaje.divisa || 'USD';

  return (
    <button
      type="button"
      onClick={() => onSelect(viaje)}
      className="group tarjeta card-lift text-left w-full p-5 animate-fade-in-up flex flex-col"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tour ? 'bg-indigo-50 text-indigo-700' : 'bg-[#e6f4f1] text-teal-700'}`}>
          <Icono className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">{viaje.nombre}</h3>
          {rango && (
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-1">
              <Calendar className="h-3.5 w-3.5" /> {rango}
            </p>
          )}
        </div>
        {insignia && (
          <span className={`etiqueta-tipo shrink-0 ${ESTILO_INSIGNIA[situacion.situacion]}`}>{insignia}</span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-[13px] mb-1.5">
          <span className="text-slate-600">Cobrado</span>
          <span className="font-semibold text-slate-900 tabular-nums">{pct}%</span>
        </div>
        <div className="barra"><span className="bg-emerald-600" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-end gap-5">
        <div>
          <p className="label-mayus">Pagado</p>
          <p className="text-[15px] font-semibold text-emerald-700 tabular-nums mt-0.5">{formatCurrency(viaje.total_pagado, divisa)}</p>
        </div>
        <div>
          <p className="label-mayus">Pendiente</p>
          <p className="text-[15px] font-semibold text-red-700 tabular-nums mt-0.5">{formatCurrency(viaje.pendiente, divisa)}</p>
        </div>
        <span className="ml-auto flex items-center gap-2 self-center">
          <span className={`etiqueta-tipo ${tour ? 'etiqueta-tour' : 'etiqueta-resort'}`}>{tour ? 'Tour' : 'Resort'}</span>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </button>
  );
};
