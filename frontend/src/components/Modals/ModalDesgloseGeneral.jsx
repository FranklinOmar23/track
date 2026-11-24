import { useMemo, useState } from 'react';
import { X, CalendarRange } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { clavePeriodo, etiquetaPeriodo, formatoCompacto } from '../../utils/formatters';
import { useDivisa } from '../../hooks/useDivisa';
import Grafico from '../common/Grafico';

/** Caja de cifra del resumen. */
const Cifra = ({ label, value, detalle, color = 'text-slate-900' }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
    <p className="text-xs text-slate-600">{label}</p>
    <p className={`text-lg font-bold tabular-nums mt-0.5 whitespace-nowrap ${color}`}>{value}</p>
    {detalle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{detalle}</p>}
  </div>
);

/** Desglose de lo cobrado por mes en el viaje: resumen, gráfico interactivo y tabla. */
const ModalDesgloseGeneral = ({ onClose }) => {
  const { state } = useHabitacionesContext();
  const { fmt, divisa } = useDivisa();
  const viaje = state.viajes.find((v) => v.id === state.selectedViajeId);
  const [resaltado, setResaltado] = useState(null);

  // Agrupar por mes + año (no mezclar meses de años distintos)
  const meses = useMemo(() => {
    const map = new Map();
    state.habitaciones.forEach((hab) => {
      hab.personas.forEach((persona) => {
        (persona.pagos || []).forEach((pago) => {
          const clave = clavePeriodo(pago.mes, pago.anio);
          if (!map.has(clave)) map.set(clave, { mes: etiquetaPeriodo(pago.mes, pago.anio), total: 0, pagos: 0, personas: new Set() });
          const m = map.get(clave);
          m.total += Number(pago.monto || 0);
          m.pagos += 1;
          m.personas.add(persona.id);
        });
      });
    });
    const ordenados = [...map.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);
    return ordenados.reduce((lista, v) => {
      const acumulado = (lista[lista.length - 1]?.acumulado || 0) + v.total;
      return [...lista, { ...v, personas: v.personas.size, acumulado }];
    }, []);
  }, [state.habitaciones]);

  const total = meses.reduce((s, m) => s + m.total, 0);
  const mejor = meses.reduce((a, m) => (!a || m.total > a.total ? m : a), null);
  const promedio = meses.length ? total / meses.length : 0;
  const pagosTotales = meses.reduce((s, m) => s + m.pagos, 0);

  const compacto = useMemo(() => formatoCompacto(divisa), [divisa]);
  const categorias = useMemo(() => meses.map((m) => m.mes), [meses]);
  const series = useMemo(() => [
    { name: 'Cobrado en el mes', type: 'bar', color: '#059669', data: meses.map((m) => m.total), format: (v) => fmt(v) },
    {
      name: 'Acumulado', type: 'line', color: '#0f766e', curve: 'smooth', lineWidth: 2.5,
      data: meses.map((m) => m.acumulado), format: (v) => fmt(v),
      yAxis: { opposite: true, format: compacto, zero: true },
    },
    // fmt depende solo de la divisa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [meses, compacto]);

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-6 pb-5 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">Desglose de pagos por mes</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">
                {viaje?.nombre ? `${viaje.nombre} · ` : ''}Cuánto se cobró en cada mes y cómo se fue acumulando
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6">
            {meses.length === 0 ? (
              <div className="text-center py-14">
                <span className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <CalendarRange className="h-6 w-6 text-slate-400" />
                </span>
                <p className="mt-3 font-semibold text-slate-900">Todavía no hay pagos registrados</p>
                <p className="text-sm text-slate-500 mt-1">Cuando se registren pagos, aquí verás cuánto se cobró cada mes.</p>
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Cifra label="Total cobrado" value={fmt(total)} color="text-emerald-700" detalle={`${pagosTotales} pagos`} />
                  <Cifra label="Meses con pagos" value={meses.length} detalle={`${meses[0].mes} – ${meses[meses.length - 1].mes}`} />
                  <Cifra label="Promedio por mes" value={fmt(promedio)} />
                  <Cifra label="Mejor mes" value={fmt(mejor.total)} detalle={mejor.mes} />
                </div>

                {/* Gráfico interactivo */}
                <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <Grafico
                    type="bar"
                    height={280}
                    categories={categorias}
                    series={series}
                    y={{ format: compacto, zero: true }}
                    bar={{ radius: 6, padding: 0.35 }}
                    legend={{ show: true }}
                    tooltip={{ header: '{x}' }}
                    export={{ formats: ['png', 'pdf', 'xlsx'], filename: `Desglose por mes${viaje?.nombre ? ` - ${viaje.nombre}` : ''}` }}
                    onInspect={(d) => setResaltado(d?.label ?? null)}
                  />
                </div>

                {/* Tabla */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          <th className="px-4 h-10 font-normal"><span className="tabla-th">Mes</span></th>
                          <th className="px-4 h-10 font-normal text-right"><span className="tabla-th">Pagos</span></th>
                          <th className="px-4 h-10 font-normal text-right"><span className="tabla-th">Cobrado</span></th>
                          <th className="px-4 h-10 font-normal"><span className="tabla-th">% del total</span></th>
                          <th className="px-4 h-10 font-normal text-right"><span className="tabla-th">Acumulado</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {meses.map((m) => {
                          const pct = total > 0 ? (m.total / total) * 100 : 0;
                          return (
                            <tr key={m.mes}
                              className={`border-b border-slate-100 transition-colors ${resaltado === m.mes ? 'bg-emerald-50/70' : 'hover:bg-slate-50/70'}`}>
                              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{m.mes}</td>
                              <td className="px-4 py-3 text-right text-slate-600 tabular-nums" title={`${m.personas} persona${m.personas !== 1 ? 's' : ''}`}>{m.pagos}</td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">{fmt(m.total)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="barra flex-1 min-w-[70px]"><span className="bg-emerald-600" style={{ width: `${pct}%` }} /></div>
                                  <span className="text-xs text-slate-600 tabular-nums w-11 text-right">{pct.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">{fmt(m.acumulado)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-semibold">
                          <td className="px-4 py-3 text-slate-900">Total</td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{pagosTotales}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 tabular-nums whitespace-nowrap">{fmt(total)}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">100%</td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end px-5 sm:px-7 py-4 border-t border-slate-100">
            <button type="button" className="btn-modal-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDesgloseGeneral;
