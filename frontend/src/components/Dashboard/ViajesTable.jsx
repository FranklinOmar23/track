import React from 'react';
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
import { FileText, Building2, Bus, Eye } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const ViajesTable = ({ viajes, onSelectViaje }) => {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 sm:p-6 pb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Detalle por Viaje</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {/* Viaje: siempre visible */}
              <TableHead className="font-semibold text-foreground">Viaje</TableHead>
              {/* Tipo: visible desde sm */}
              <TableHead className="font-semibold text-foreground hidden sm:table-cell">Tipo</TableHead>
              {/* Habitaciones: visible desde md */}
              <TableHead className="font-semibold text-foreground text-center hidden md:table-cell">Hab.</TableHead>
              {/* Personas: visible desde md */}
              <TableHead className="font-semibold text-foreground text-center hidden md:table-cell">Pax</TableHead>
              {/* Total: siempre visible */}
              <TableHead className="font-semibold text-foreground text-right">Total</TableHead>
              {/* Pagado: visible desde sm */}
              <TableHead className="font-semibold text-foreground text-right hidden sm:table-cell">Pagado</TableHead>
              {/* Pendiente: siempre visible */}
              <TableHead className="font-semibold text-foreground text-right">Pendiente</TableHead>
              {/* Progreso: visible desde sm */}
              <TableHead className="font-semibold text-foreground text-center hidden sm:table-cell">Progreso</TableHead>
              {/* Acción: siempre visible */}
              <TableHead className="font-semibold text-foreground text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viajes.map((viaje) => {
              const total = viaje.total_por_cobrar || 0;
              const pagado = viaje.total_pagado || 0;
              const pendiente = viaje.pendiente || 0;
              const porcentaje = total > 0 ? ((pagado / total) * 100).toFixed(1) : 0;

              return (
                <TableRow
                  key={viaje.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Viaje: siempre visible */}
                  <TableCell className="font-medium text-foreground max-w-[120px] sm:max-w-[200px]">
                    <span className="truncate block text-sm">{viaje.nombre}</span>
                  </TableCell>

                  {/* Tipo: visible desde sm */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="secondary"
                      className={`
                        gap-1.5 font-medium
                        ${viaje.tipo === 'resort'
                          ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                          : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                        }
                      `}
                    >
                      {viaje.tipo === 'resort' ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <Bus className="h-3.5 w-3.5" />
                      )}
                      {viaje.tipo === 'resort' ? 'Resort' : 'Tour'}
                    </Badge>
                  </TableCell>

                  {/* Habitaciones: visible desde md */}
                  <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                    {viaje.total_habitaciones || 0}
                  </TableCell>

                  {/* Personas: visible desde md */}
                  <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                    {viaje.total_personas || 0}
                  </TableCell>

                  {/* Total: siempre visible */}
                  <TableCell className="text-right font-medium text-sm">
                    {formatCurrency(total)}
                  </TableCell>

                  {/* Pagado: visible desde sm */}
                  <TableCell className="text-right font-medium text-teal-600 text-sm hidden sm:table-cell">
                    {formatCurrency(pagado)}
                  </TableCell>

                  {/* Pendiente: siempre visible */}
                  <TableCell className="text-right font-medium text-rose-500 text-sm">
                    {formatCurrency(pendiente)}
                  </TableCell>

                  {/* Progreso: visible desde sm */}
                  <TableCell className="text-center hidden sm:table-cell">
                    <div className="flex items-center gap-2 justify-center">
                      <Progress
                        value={parseFloat(porcentaje)}
                        className="w-16 h-2"
                      />
                      <span className="text-xs text-muted-foreground w-10">
                        {porcentaje}%
                      </span>
                    </div>
                  </TableCell>

                  {/* Acción: siempre visible */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectViaje(viaje)}
                      className="text-primary hover:text-primary hover:bg-primary/10 px-2"
                    >
                      <Eye className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Ver</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};