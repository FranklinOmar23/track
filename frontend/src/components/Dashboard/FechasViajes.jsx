import { useState } from 'react';
import { ChevronRight, AlertTriangle, CircleCheckBig } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import {
  situacionViaje, textoCuenta, rangoDias, fechaMedia, mesCorto, colorAvanceViaje,
} from '../../utils/viajeFechas';
import { useAuthContext } from '../../Context/AuthContext';
import ModalEditarViaje from '../Modals/ModalEditarViaje';
import { EncabezadoTarjeta } from './ChartSection';

/** Clasifica cada viaje activo con fechas: en curso, próximo o terminado sin cerrar. */
const clasificar = (viajes) => {
  const resultado = { enCurso: [], proximos: [], terminados: [] };
  viajes.forEach((v) => {
    const s = situacionViaje(v);
    if (s.situacion === 'terminado') resultado.terminados.push({ ...v, ...s });
    else if (s.situacion === 'en_curso') resultado.enCurso.push({ ...v, ...s });
    else if (s.situacion === 'proximo') resultado.proximos.push({ ...v, ...s });
  });
  resultado.proximos.sort((a, b) => a.dias - b.dias);
  resultado.terminados.sort((a, b) => b.dias - a.dias);
  return resultado;
};

const FilaProximo = ({ v, divisa, onSelectViaje }) => {
  const pct = Math.round(v.pct);
  return (
    <button type="button" onClick={() => onSelectViaje(v)}
      className="w-full flex items-center gap-4 py-3.5 px-2 text-left border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70 rounded-lg transition-colors">
      <span className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${v.situacion === 'en_curso' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
        <span className="text-base font-bold text-slate-900 leading-none">{v.inicio.getDate()}</span>
        <span className="text-[10px] font-semibold text-slate-500 mt-0.5">{mesCorto(v.inicio)}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-900 truncate">{v.nombre}</span>
        <span className={`block text-xs mt-0.5 ${v.situacion === 'en_curso' ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
          {textoCuenta(v)} · {rangoDias(v)}
        </span>
      </span>
      <span className="shrink-0 w-28 sm:w-48">
        <span className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-slate-500 truncate hidden sm:inline tabular-nums">
            {v.pendiente > 0 ? `Faltan ${formatCurrency(v.pendiente, v.divisa || divisa)}` : 'Todo cobrado'}
          </span>
          <span className="font-semibold text-slate-900 tabular-nums ml-auto">{pct}%</span>
        </span>
        <span className="barra block mt-1.5">
          <span style={{ width: `${Math.min(100, pct)}%`, background: colorAvanceViaje(pct) }} />
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
    </button>
  );
};

/** Próximos viajes (cuenta regresiva) y terminados que siguen abiertos. */
export const FechasViajes = ({ viajes, divisa, onSelectViaje }) => {
  const { puede } = useAuthContext();
  const [editando, setEditando] = useState(null);
  const { enCurso, proximos, terminados } = clasificar(viajes);
  if (!enCurso.length && !proximos.length && !terminados.length) return null;
  const lista = [...enCurso, ...proximos].slice(0, 6);
  const puedeEditar = puede('editar') || puede('crear_viajes');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="tarjeta p-5 sm:p-6 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
        <EncabezadoTarjeta titulo="Próximos viajes" subtitulo="Cuánto falta para salir y cuánto se ha cobrado" />
        <div className="mt-3 -mx-2">
          {lista.map((v) => <FilaProximo key={v.id} v={v} divisa={divisa} onSelectViaje={onSelectViaje} />)}
          {!lista.length && <p className="text-sm text-slate-400 text-center py-8">No hay viajes próximos con fecha</p>}
        </div>
      </div>

      <div className="rounded-[0.875rem] p-5 sm:p-6 animate-fade-in-up border"
        style={{ background: 'var(--aviso-fondo)', borderColor: 'var(--aviso-borde)', animationDelay: '300ms' }}>
        <div className="flex items-start gap-3">
          <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--aviso-icono)' }}>
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-amber-900">Terminados sin cerrar</h3>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Ya pasó la fecha. Ciérralos desde “Editar viaje” para moverlos al historial.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {terminados.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border p-3.5" style={{ borderColor: 'var(--aviso-borde)' }}>
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => onSelectViaje(v)}
                  className="text-sm font-semibold text-slate-900 text-left hover:underline">
                  {v.nombre}
                </button>
                <span className="etiqueta-tipo etiqueta-ambar shrink-0">
                  {v.dias === 0 ? 'Hoy' : `Hace ${v.dias} día${v.dias !== 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{fechaMedia(v.fin)} · Cobrado {Math.round(v.pct)}%</p>
              {puedeEditar ? (
                <button type="button" onClick={() => setEditando(v)} className="btn btn-borde w-full mt-3">
                  Editar viaje
                </button>
              ) : (
                <button type="button" onClick={() => onSelectViaje(v)} className="btn btn-borde w-full mt-3">
                  Ver viaje
                </button>
              )}
            </div>
          ))}
          {!terminados.length && (
            <p className="flex items-center justify-center gap-2 text-sm text-amber-900/70 py-6">
              <CircleCheckBig className="h-4 w-4 text-emerald-600" /> Todo al día
            </p>
          )}
        </div>
      </div>

      <ModalEditarViaje viaje={editando} open={!!editando} onClose={() => setEditando(null)} />
    </div>
  );
};
