import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import { FileText, Building2, Bus, Eye, Pencil, Lock, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { calcularGananciaResumen } from '../../utils/calculos';
import { formatCurrency } from '../../utils/formatters';
import ModalEditarViaje from '../Modals/ModalEditarViaje';


const STAGGER_DELAYS = [0, 40, 80, 120, 160, 200, 240];

// Valor por el que se ordena cada columna
const VALOR_ORDEN = {
  nombre: (v) => v.nombre.toLowerCase(),
  habitaciones: (v) => v.total_habitaciones || 0,
  personas: (v) => v.total_personas || 0,
  total: (v) => v.total_por_cobrar || 0,
  pagado: (v) => v.total_pagado || 0,
  pendiente: (v) => v.pendiente || 0,
  ganancia: (v) => calcularGananciaResumen(v),
  progreso: (v) => (v.total_por_cobrar > 0 ? v.total_pagado / v.total_por_cobrar : 0),
};

/** Encabezado que ordena al hacer clic (1er clic: mayor a menor; 2º: menor a mayor; 3º: orden original). */
const Encabezado = ({ campo, orden, onOrdenar, className = '', children }) => {
  const activo = orden.campo === campo;
  const Icono = !activo ? ArrowUpDown : orden.dir === 'desc' ? ArrowDown : ArrowUp;
  return (
    <TableHead className={`font-semibold text-xs tracking-wider uppercase ${className}`}>
      <button type="button" onClick={() => onOrdenar(campo)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors ${activo ? 'text-teal-300' : 'text-gray-500 hover:text-gray-300'}`}>
        {children}
        <Icono className={`h-3 w-3 ${activo ? '' : 'opacity-40'}`} />
      </button>
    </TableHead>
  );
};

export const ViajesTable = ({ viajes, onSelectViaje }) => {
  const [viajeEditando, setViajeEditando] = useState(null);
  const [orden, setOrden] = useState({ campo: null, dir: 'desc' });

  const onOrdenar = (campo) => setOrden((o) => {
    if (o.campo !== campo) return { campo, dir: campo === 'nombre' ? 'asc' : 'desc' };
    if (o.dir === (campo === 'nombre' ? 'asc' : 'desc')) return { campo, dir: campo === 'nombre' ? 'desc' : 'asc' };
    return { campo: null, dir: 'desc' };
  });

  const viajesOrdenados = orden.campo
    ? [...viajes].sort((a, b) => {
      const va = VALOR_ORDEN[orden.campo](a);
      const vb = VALOR_ORDEN[orden.campo](b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return orden.dir === 'asc' ? cmp : -cmp;
    })
    : viajes;
  const props = { orden, onOrdenar };

  return (
    <>
      <div
        className="relative overflow-hidden rounded-xl animate-fade-in-up stagger-3"
        style={{
          backgroundColor: '#1a1f2e',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Subtle top-left orb */}
        <div
          className="orb w-56 h-56 pointer-events-none"
          style={{ top: '-60px', left: '-60px', background: '#0d9488', opacity: 0.05 }}
        />

        <div className="relative flex items-center gap-2.5 p-4 sm:p-6 pb-4">
          <div className="p-1.5 rounded-lg bg-white/5">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Detalle por Viaje</h3>
            <p className="text-xs text-gray-600 mt-0.5">{viajes.length} viaje{viajes.length !== 1 ? 's' : ''} registrado{viajes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/[0.025] hover:bg-white/[0.025] border-b border-white/[0.05]">
                <Encabezado campo="nombre" {...props}>Viaje</Encabezado>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase hidden sm:table-cell">Tipo</TableHead>
                <Encabezado campo="habitaciones" className="text-center hidden md:table-cell" {...props}>Hab.</Encabezado>
                <Encabezado campo="personas" className="text-center hidden md:table-cell" {...props}>Pax</Encabezado>
                <Encabezado campo="total" className="text-right" {...props}>Total</Encabezado>
                <Encabezado campo="pagado" className="text-right hidden sm:table-cell" {...props}>Pagado</Encabezado>
                <Encabezado campo="pendiente" className="text-right" {...props}>Pendiente</Encabezado>
                <Encabezado campo="ganancia" className="text-right hidden lg:table-cell" {...props}>Ganancia</Encabezado>
                <Encabezado campo="progreso" className="text-center hidden sm:table-cell" {...props}>Progreso</Encabezado>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajesOrdenados.map((viaje, rowIdx) => {
                const total      = viaje.total_por_cobrar || 0;
                const pagado     = viaje.total_pagado     || 0;
                const pendiente  = viaje.pendiente        || 0;
                const porcentaje = total > 0 ? ((pagado / total) * 100).toFixed(1) : 0;
                const divisa     = viaje.divisa || 'USD';
                const ganancia   = calcularGananciaResumen(viaje);
                const cerrado    = viaje.estado === 'cerrado';
                const delay      = STAGGER_DELAYS[Math.min(rowIdx, STAGGER_DELAYS.length - 1)];

                return (
                  <TableRow
                    key={viaje.id}
                    onClick={() => onSelectViaje(viaje)}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors ${cerrado ? 'opacity-60' : ''} cursor-pointer`}
                    style={{
                      animation: `fadeInUp 0.45s cubic-bezier(0.23,1,0.32,1) backwards`,
                      animationDelay: `${250 + delay}ms`,
                    }}
                  >
                    <TableCell className="font-medium text-white max-w-[120px] sm:max-w-[200px] py-3.5">
                      <span className="truncate block text-sm">{viaje.nombre}</span>
                      {cerrado && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mt-0.5 mr-1 inline-flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Cerrado
                        </span>
                      )}
                      {divisa !== 'USD' && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {divisa}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell py-3.5">
                      <Badge
                        className={`gap-1.5 font-semibold text-xs border ${
                          viaje.tipo === 'resort'
                            ? 'bg-teal-900/40 text-teal-400 border-teal-600/30'
                            : 'bg-cyan-900/40 text-cyan-400 border-cyan-600/30'
                        }`}
                      >
                        {viaje.tipo === 'resort'
                          ? <Building2 className="h-3 w-3" />
                          : <Bus className="h-3 w-3" />}
                        {viaje.tipo === 'resort' ? 'Resort' : 'Tour'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-gray-500 text-sm hidden md:table-cell py-3.5">
                      {viaje.total_habitaciones || 0}
                    </TableCell>
                    <TableCell className="text-center text-gray-500 text-sm hidden md:table-cell py-3.5">
                      {viaje.total_personas || 0}
                    </TableCell>

                    <TableCell className="text-right font-semibold text-gray-200 text-sm py-3.5">
                      {formatCurrency(total, divisa)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-400 text-sm hidden sm:table-cell py-3.5">
                      {formatCurrency(pagado, divisa)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-400 text-sm py-3.5">
                      {formatCurrency(pendiente, divisa)}
                    </TableCell>

                    <TableCell className="text-right font-semibold text-sm hidden lg:table-cell py-3.5">
                      {viaje.ganancia_tipo && viaje.ganancia_tipo !== 'ninguna' ? (
                        <span className="text-emerald-300" title={viaje.ganancia_tipo === 'porcentaje'
                          ? `${viaje.ganancia_valor}% del total`
                          : `${formatCurrency(viaje.ganancia_valor, divisa)} × ${viaje.personas_pagan || 0} pax`}>
                          {formatCurrency(ganancia, divisa)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center hidden sm:table-cell py-3.5">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={parseFloat(porcentaje)} className="w-16 h-1.5" />
                        <span className="text-xs text-gray-500 w-10 tabular-nums">{porcentaje}%</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setViajeEditando(viaje); }}
                          className="text-gray-600 hover:text-gray-200 hover:bg-white/[0.06] p-1.5 rounded-lg transition-all duration-150"
                          title="Editar viaje"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectViaje(viaje); }}
                          className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-150 border border-transparent hover:border-teal-500/20"
                          title="Ver viaje"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ver</span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <ModalEditarViaje
        viaje={viajeEditando}
        open={!!viajeEditando}
        onClose={() => setViajeEditando(null)}
      />
    </>
  );
};
