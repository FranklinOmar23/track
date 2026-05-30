import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { ChevronRight, Users, Tag } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

// Colores consistentes con HabitacionesList
const COLORES_ETIQUETA = [
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
];

// Genera un color estable basado en el texto de la etiqueta
const getColorForEtiqueta = (etiqueta) => {
  if (!etiqueta) return null;
  let hash = 0;
  for (let i = 0; i < etiqueta.length; i++) {
    hash = etiqueta.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORES_ETIQUETA[Math.abs(hash) % COLORES_ETIQUETA.length];
};

export const HabitacionCard = ({ habitacion, onSelect }) => {
  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  const totalHabitacion = habitacion.total || 0;
  const pendiente = totalHabitacion - totalPagado;
  const porcentaje = totalHabitacion > 0 ? (totalPagado / totalHabitacion) * 100 : 0;
  const isComplete = pendiente === 0 && totalPagado > 0;
  const isStack = habitacion.stack;
  const hasPersonas = habitacion.personas && habitacion.personas.length > 0;
  const etiqueta = habitacion.etiqueta || '';
  const colorEtiqueta = getColorForEtiqueta(etiqueta);

  return (
    <Card
      className={`
        p-4 border transition-all cursor-pointer hover:shadow-lg group
        ${isComplete ? 'border-teal-200 bg-gradient-to-br from-teal-50/50 to-white' : ''}
        ${isStack ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white' : ''}
        ${!isComplete && !isStack ? 'border-gray-200 hover:border-primary/40 bg-white' : ''}
      `}
      onClick={() => onSelect && onSelect(habitacion)}
    >
      {/* Header: número, tipo, stack y etiqueta */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold px-3">
            Hab. {habitacion.num}
          </Badge>
          <span className="text-xs text-gray-500 font-medium">{habitacion.tipo}</span>
          {isStack && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
              STACK
            </Badge>
          )}
        </div>
        {/* Etiqueta en esquina superior derecha */}
        {etiqueta && colorEtiqueta && (
          <span
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${colorEtiqueta.bg} ${colorEtiqueta.text} ${colorEtiqueta.border} shrink-0 ml-1`}
          >
            <Tag className="h-2.5 w-2.5" />
            {etiqueta}
          </span>
        )}
      </div>

      {/* Personas */}
      {hasPersonas && (
        <div className="mb-3 space-y-1.5">
          {habitacion.personas.map((persona, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm font-medium text-gray-800">{persona.n}</span>
            </div>
          ))}
        </div>
      )}

      {isStack && !hasPersonas && (
        <div className="mb-3 py-2">
          <span className="text-sm text-gray-500 italic">Sin asignar</span>
        </div>
      )}

      {/* Barra de progreso */}
      {totalHabitacion > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso de pago</span>
            <span>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {totalPagado > 0 || pendiente > 0 ? (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Pagado</span>
                <span className="text-sm font-bold text-teal-600">
                  {formatCurrency(totalPagado)}
                </span>
              </div>
              {pendiente > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Pendiente</span>
                  <span className="text-sm font-bold text-rose-500">
                    {formatCurrency(pendiente)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500">Sin pagos</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
      </div>
    </Card>
  );
};