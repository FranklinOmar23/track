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
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const ViajesTable = ({ viajes, onSelectViaje }) => {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-6 pb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Detalle por Viaje</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-foreground">Viaje</TableHead>
              <TableHead className="font-semibold text-foreground">Tipo</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Habitaciones</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Personas</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Total</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Pagado</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Pendiente</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Progreso</TableHead>
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
                  <TableCell className="font-medium text-foreground max-w-[200px]">
                    <span className="truncate block">{viaje.nombre}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={`
                        gap-1.5 font-medium
                        ${viaje.tipo === "resort" 
                          ? "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200" 
                          : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                        }
                      `}
                    >
                      {viaje.tipo === "resort" ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <Bus className="h-3.5 w-3.5" />
                      )}
                      {viaje.tipo === "resort" ? "Resort" : "Tour"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {viaje.total_habitaciones || 0}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {viaje.total_personas || 0}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(total)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-teal-600">
                    {formatCurrency(pagado)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-rose-500">
                    {formatCurrency(pendiente)}
                  </TableCell>
                  <TableCell className="text-center">
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
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectViaje(viaje)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
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