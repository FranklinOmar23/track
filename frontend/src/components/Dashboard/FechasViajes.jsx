import { CalendarClock, PlaneTakeoff, CircleCheckBig, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const UN_DIA = 24 * 60 * 60 * 1000;
const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const aFecha = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00`) : null);
const fechaCorta = (d) => d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });

/** Clasifica cada viaje activo con fechas: en curso, próximo o terminado sin cerrar. */
const clasificar = (viajes) => {
  const h = hoy();
  const resultado = { enCurso: [], proximos: [], terminados: [] };
  viajes.forEach((v) => {
    const inicio = aFecha(v.fechaInicio);
    const fin = aFecha(v.fechaFin) || inicio;
    if (!inicio) return;
    if (fin < h) resultado.terminados.push({ ...v, inicio, fin, dias: Math.round((h - fin) / UN_DIA) });
    else if (inicio <= h) resultado.enCurso.push({ ...v, inicio, fin, dias: Math.round((fin - h) / UN_DIA) });
    else resultado.proximos.push({ ...v, inicio, fin, dias: Math.round((inicio - h) / UN_DIA) });
  });
  resultado.proximos.sort((a, b) => a.dias - b.dias);
  return resultado;
};

const Fila = ({ v, etiqueta, colorEtiqueta, divisa, onSelectViaje, indice }) => {
  const pct = v.total_por_cobrar > 0 ? Math.round((v.total_pagado / v.total_por_cobrar) * 100) : 0;
  return (
    <button type="button" onClick={() => onSelectViaje(v)}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors animate-fade-in-up"
      style={{ animationDelay: `${400 + indice * 50}ms` }}>
      <span className="shrink-0 w-16 text-center">
        <span className="block text-[11px] font-bold leading-tight" style={{ color: colorEtiqueta }}>{etiqueta}</span>
        <span className="block text-[10px] text-gray-600">{fechaCorta(v.inicio)}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-200 truncate">{v.nombre}</span>
        <span className="block h-1 mt-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-xs font-semibold text-gray-300 tabular-nums">{pct}%</span>
        {v.pendiente > 0 && (
          <span className="block text-[10px] text-rose-400/80 tabular-nums">faltan {formatCurrency(v.pendiente, divisa)}</span>
        )}
      </span>
    </button>
  );
};

/** Calendario de viajes: en curso, próximos (cuenta regresiva) y terminados que siguen abiertos. */
export const FechasViajes = ({ viajes, divisa, onSelectViaje }) => {
  const { enCurso, proximos, terminados } = clasificar(viajes);
  if (!enCurso.length && !proximos.length && !terminados.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5 sm:p-6 border border-white/[0.07] animate-fade-in-up"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #1c2233 100%)', animationDelay: '380ms' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-sky-500/12"><CalendarClock className="h-4 w-4 text-sky-400" /></div>
          <div>
            <h3 className="font-semibold text-white text-sm">Próximos viajes</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cuánto falta para salir y cuánto se ha cobrado</p>
          </div>
        </div>
        <div className="space-y-0.5">
          {enCurso.map((v, i) => (
            <Fila key={v.id} v={v} indice={i} divisa={divisa} onSelectViaje={onSelectViaje}
              etiqueta={<span className="inline-flex items-center gap-1"><PlaneTakeoff className="h-3 w-3" />En curso</span>} colorEtiqueta="#34d399" />
          ))}
          {proximos.slice(0, 6).map((v, i) => (
            <Fila key={v.id} v={v} indice={enCurso.length + i} divisa={divisa} onSelectViaje={onSelectViaje}
              etiqueta={v.dias === 0 ? 'Hoy' : v.dias === 1 ? 'Mañana' : `En ${v.dias} días`}
              colorEtiqueta={v.dias <= 7 ? '#fbbf24' : '#7dd3fc'} />
          ))}
          {!enCurso.length && !proximos.length && (
            <p className="text-sm text-gray-600 text-center py-8">No hay viajes próximos con fecha</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5 sm:p-6 border border-white/[0.07] animate-fade-in-up"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #1c2233 100%)', animationDelay: '420ms' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/12"><AlertTriangle className="h-4 w-4 text-amber-400" /></div>
          <div>
            <h3 className="font-semibold text-white text-sm">Terminados sin cerrar</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ya pasó la fecha: ciérralos desde "Editar viaje" para moverlos al historial</p>
          </div>
        </div>
        <div className="space-y-0.5">
          {terminados.map((v, i) => (
            <Fila key={v.id} v={v} indice={i} divisa={divisa} onSelectViaje={onSelectViaje}
              etiqueta={v.dias === 0 ? 'Terminó hoy' : `Hace ${v.dias} d`} colorEtiqueta="#f59e0b" />
          ))}
          {!terminados.length && (
            <p className="flex items-center justify-center gap-2 text-sm text-gray-600 py-8">
              <CircleCheckBig className="h-4 w-4 text-emerald-500/60" /> Todo al día
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
