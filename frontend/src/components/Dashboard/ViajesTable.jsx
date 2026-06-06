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

export const ViajesTable = ({ viajes, onSelectViaje }) => {
  const [viajeEditando, setViajeEditando] = useState(null);

  return (
    <>
      <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 sm:p-6 pb-4">
          <FileText className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-white">Detalle por Viaje</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/[0.03] hover:bg-white/[0.03]">
                <TableHead className="font-semibold text-gray-400">Viaje</TableHead>
                <TableHead className="font-semibold text-gray-400 hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="font-semibold text-gray-400 text-center hidden md:table-cell">Hab.</TableHead>
                <TableHead className="font-semibold text-gray-400 text-center hidden md:table-cell">Pax</TableHead>
                <TableHead className="font-semibold text-gray-400 text-right">Total</TableHead>
                <TableHead className="font-semibold text-gray-400 text-right hidden sm:table-cell">Pagado</TableHead>
                <TableHead className="font-semibold text-gray-400 text-right">Pendiente</TableHead>
                <TableHead className="font-semibold text-gray-400 text-center hidden sm:table-cell">Progreso</TableHead>
                <TableHead className="font-semibold text-gray-400 text-center">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajes.map((viaje) => {
                const total      = viaje.total_por_cobrar || 0;
                const pagado     = viaje.total_pagado || 0;
                const pendiente  = viaje.pendiente || 0;
                const porcentaje = total > 0 ? ((pagado / total) * 100).toFixed(1) : 0;
                const divisa     = viaje.divisa || 'USD';

                return (
                  <TableRow key={viaje.id}>
                    <TableCell className="font-medium text-white max-w-[120px] sm:max-w-[200px]">
                      <span className="truncate block text-sm">{viaje.nombre}</span>
                      {divisa !== 'USD' && (
                        <span className="text-[10px] font-medium text-gray-500 bg-white/5 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {divisa}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={viaje.tipo === 'resort' ? 'resort' : 'tour'}
                        className={`gap-1.5 font-medium ${
                          viaje.tipo === 'resort'
                            ? 'bg-teal-900/40 text-teal-400 border border-teal-600/40'
                            : 'bg-cyan-900/40 text-cyan-400 border border-cyan-600/40'
                        }`}
                      >
                        {viaje.tipo === 'resort' ? <Building2 className="h-3.5 w-3.5" /> : <Bus className="h-3.5 w-3.5" />}
                        {viaje.tipo === 'resort' ? 'Resort' : 'Tour'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-gray-500 text-sm hidden md:table-cell">
                      {viaje.total_habitaciones || 0}
                    </TableCell>
                    <TableCell className="text-center text-gray-500 text-sm hidden md:table-cell">
                      {viaje.total_personas || 0}
                    </TableCell>

                    <TableCell className="text-right font-medium text-gray-200 text-sm">
                      {formatCurrency(total, divisa)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-400 text-sm hidden sm:table-cell">
                      {formatCurrency(pagado, divisa)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-rose-400 text-sm">
                      {formatCurrency(pendiente, divisa)}
                    </TableCell>

                    <TableCell className="text-center hidden sm:table-cell">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={parseFloat(porcentaje)} className="w-16 h-2" />
                        <span className="text-xs text-gray-500 w-10">{porcentaje}%</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViajeEditando(viaje)}
                          className="text-gray-500 hover:text-gray-200 hover:bg-white/5 p-1.5 rounded transition-colors"
                          title="Editar viaje"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onSelectViaje(viaje)}
                          className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 px-2 py-1.5 rounded text-sm flex items-center gap-1 transition-colors"
                          title="Ver viaje"
                        >
                          <Eye className="h-4 w-4" />
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
