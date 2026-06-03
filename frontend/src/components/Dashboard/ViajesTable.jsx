import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { FileText, Building2, Bus, Eye, Pencil } from 'lucide-react';
import ModalEditarViaje from '../Modals/ModalEditarViaje';

const formatCurrency = (value, divisa = 'USD') => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: divisa,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const ViajesTable = ({ viajes, onSelectViaje }) => {
  const [viajeEditando, setViajeEditando] = useState(null);

  return (
    <>
      <Card className="border-none shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-4 sm:p-6 pb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Detalle por Viaje</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">Viaje</TableHead>
                <TableHead className="font-semibold text-foreground hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="font-semibold text-foreground text-center hidden md:table-cell">Hab.</TableHead>
                <TableHead className="font-semibold text-foreground text-center hidden md:table-cell">Pax</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Total</TableHead>
                <TableHead className="font-semibold text-foreground text-right hidden sm:table-cell">Pagado</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Pendiente</TableHead>
                <TableHead className="font-semibold text-foreground text-center hidden sm:table-cell">Progreso</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajes.map((viaje) => {
                const total     = viaje.total_por_cobrar || 0;
                const pagado    = viaje.total_pagado || 0;
                const pendiente = viaje.pendiente || 0;
                const porcentaje = total > 0 ? ((pagado / total) * 100).toFixed(1) : 0;
                const divisa    = viaje.divisa || 'USD';

                return (
                  <TableRow key={viaje.id} className="hover:bg-muted/30 transition-colors">

                    {/* Nombre */}
                    <TableCell className="font-medium text-foreground max-w-[120px] sm:max-w-[200px]">
                      <span className="truncate block text-sm">{viaje.nombre}</span>
                      {/* Divisa como badge pequeño bajo el nombre */}
                      {divisa !== 'USD' && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {divisa}
                        </span>
                      )}
                    </TableCell>

                    {/* Tipo */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="secondary"
                        className={`gap-1.5 font-medium ${
                          viaje.tipo === 'resort'
                            ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                            : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                        }`}
                      >
                        {viaje.tipo === 'resort'
                          ? <Building2 className="h-3.5 w-3.5" />
                          : <Bus className="h-3.5 w-3.5" />}
                        {viaje.tipo === 'resort' ? 'Resort' : 'Tour'}
                      </Badge>
                    </TableCell>

                    {/* Hab */}
                    <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                      {viaje.total_habitaciones || 0}
                    </TableCell>

                    {/* Pax */}
                    <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                      {viaje.total_personas || 0}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(total, divisa)}
                    </TableCell>

                    {/* Pagado */}
                    <TableCell className="text-right font-medium text-teal-600 text-sm hidden sm:table-cell">
                      {formatCurrency(pagado, divisa)}
                    </TableCell>

                    {/* Pendiente */}
                    <TableCell className="text-right font-medium text-rose-500 text-sm">
                      {formatCurrency(pendiente, divisa)}
                    </TableCell>

                    {/* Progreso */}
                    <TableCell className="text-center hidden sm:table-cell">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={parseFloat(porcentaje)} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground w-10">{porcentaje}%</span>
                      </div>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViajeEditando(viaje)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2"
                          title="Editar viaje"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectViaje(viaje)}
                          className="text-primary hover:text-primary hover:bg-primary/10 px-2"
                          title="Ver viaje"
                        >
                          <Eye className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ModalEditarViaje
        viaje={viajeEditando}
        open={!!viajeEditando}
        onClose={() => setViajeEditando(null)}
      />
    </>
  );
};