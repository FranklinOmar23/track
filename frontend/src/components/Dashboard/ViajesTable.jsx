import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import { FileText, Building2, Bus, Eye, Pencil } from 'lucide-react';
import ModalEditarViaje from '../Modals/ModalEditarViaje';

const formatCurrency = (value, divisa = 'USD') =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: divisa,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value || 0);

const STAGGER_DELAYS = [0, 40, 80, 120, 160, 200, 240];

export const ViajesTable = ({ viajes, onSelectViaje }) => {
  const [viajeEditando, setViajeEditando] = useState(null);

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
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase">Viaje</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-center hidden md:table-cell">Hab.</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-center hidden md:table-cell">Pax</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-right">Total</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-right hidden sm:table-cell">Pagado</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-right">Pendiente</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-center hidden sm:table-cell">Progreso</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs tracking-wider uppercase text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajes.map((viaje, rowIdx) => {
                const total      = viaje.total_por_cobrar || 0;
                const pagado     = viaje.total_pagado     || 0;
                const pendiente  = viaje.pendiente        || 0;
                const porcentaje = total > 0 ? ((pagado / total) * 100).toFixed(1) : 0;
                const divisa     = viaje.divisa || 'USD';
                const delay      = STAGGER_DELAYS[Math.min(rowIdx, STAGGER_DELAYS.length - 1)];

                return (
                  <TableRow
                    key={viaje.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
                    style={{
                      animation: `fadeInUp 0.45s cubic-bezier(0.23,1,0.32,1) both`,
                      animationDelay: `${250 + delay}ms`,
                    }}
                  >
                    <TableCell className="font-medium text-white max-w-[120px] sm:max-w-[200px] py-3.5">
                      <span className="truncate block text-sm">{viaje.nombre}</span>
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

                    <TableCell className="text-center hidden sm:table-cell py-3.5">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={parseFloat(porcentaje)} className="w-16 h-1.5" />
                        <span className="text-xs text-gray-500 w-10 tabular-nums">{porcentaje}%</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViajeEditando(viaje)}
                          className="text-gray-600 hover:text-gray-200 hover:bg-white/[0.06] p-1.5 rounded-lg transition-all duration-150"
                          title="Editar viaje"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectViaje(viaje)}
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
