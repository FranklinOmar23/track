import { useState } from 'react';
import { ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calcularGananciaResumen } from '../../utils/calculos';

// Valor por el que se ordena cada columna
const VALOR_ORDEN = {
  nombre: (v) => v.nombre.toLowerCase(),
  total: (v) => v.total_por_cobrar || 0,
  pagado: (v) => v.total_pagado || 0,
  pendiente: (v) => v.pendiente || 0,
  ganancia: (v) => calcularGananciaResumen(v),
  progreso: (v) => v.pct || 0,
};

/** Encabezado que ordena al hacer clic (1er clic: mayor a menor; 2º: menor a mayor; 3º: orden original). */
const Encabezado = ({ campo, orden, onOrdenar, className = '', children }) => {
  const activo = orden.campo === campo;
  const Icono = orden.dir === 'desc' ? ArrowDown : ArrowUp;
  return (
    <th className={`px-4 h-11 font-normal ${className}`}>
      <button type="button" onClick={() => onOrdenar(campo)}
        className={`tabla-th inline-flex items-center gap-1 hover:text-slate-900 transition-colors ${activo ? '!text-slate-900' : ''}`}>
        {children}
        {activo && <Icono className="h-3 w-3" />}
      </button>
    </th>
  );
};

/** Tabla "Detalle por viaje" del dashboard. */
export const ViajesTable = ({ viajes, onSelectViaje }) => {
  const [orden, setOrden] = useState({ campo: null, dir: 'desc' });

  const onOrdenar = (campo) => setOrden((o) => {
    const primera = campo === 'nombre' ? 'asc' : 'desc';
    if (o.campo !== campo) return { campo, dir: primera };
    if (o.dir === primera) return { campo, dir: primera === 'asc' ? 'desc' : 'asc' };
    return { campo: null, dir: 'desc' };
  });

  const ordenados = orden.campo
    ? [...viajes].sort((a, b) => {
      const va = VALOR_ORDEN[orden.campo](a);
      const vb = VALOR_ORDEN[orden.campo](b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return orden.dir === 'asc' ? cmp : -cmp;
    })
    : viajes;
  const props = { orden, onOrdenar };

  return (
    <div className="tarjeta overflow-hidden animate-fade-in-up" style={{ animationDelay: '350ms' }}>
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <h3 className="text-[15px] font-semibold text-slate-900">Detalle por viaje</h3>
        <p className="text-xs text-slate-500 mt-0.5">{viajes.length} viaje{viajes.length !== 1 ? 's' : ''} registrado{viajes.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-100 text-left">
              <Encabezado campo="nombre" className="pl-5 sm:pl-6" {...props}>Viaje</Encabezado>
              <th className="px-4 h-11 font-normal"><span className="tabla-th">Tipo</span></th>
              <Encabezado campo="total" className="text-right" {...props}>Total</Encabezado>
              <Encabezado campo="pagado" className="text-right" {...props}>Pagado</Encabezado>
              <Encabezado campo="pendiente" className="text-right" {...props}>Pendiente</Encabezado>
              <Encabezado campo="progreso" {...props}>Progreso</Encabezado>
              <th className="px-4 pr-5 sm:pr-6 h-11 font-normal text-right"><span className="tabla-th">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((v) => {
              const divisa = v.divisa || 'USD';
              const pct = v.pct || 0;
              return (
                <tr key={v.id} onClick={() => onSelectViaje(v)}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 cursor-pointer transition-colors">
                  <td className="pl-5 sm:pl-6 px-4 py-3.5">
                    <p className="font-semibold text-slate-900">{v.nombre}</p>
                    <p className="text-xs text-slate-500">{divisa}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`etiqueta-tipo ${v.tipo === 'tour' ? 'etiqueta-tour' : 'etiqueta-resort'}`}>
                      {v.tipo === 'tour' ? 'Tour' : 'Resort'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-900">{formatCurrency(v.total_por_cobrar, divisa)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-700">{formatCurrency(v.total_pagado, divisa)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-red-700">{formatCurrency(v.pendiente, divisa)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="barra w-20"><span className="bg-emerald-600" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="text-xs text-slate-600 tabular-nums w-12">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 pr-5 sm:pr-6 py-3.5 text-right">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onSelectViaje(v); }}
                      className="btn btn-borde btn-sm">
                      Ver <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
