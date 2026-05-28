import React from 'react';

const formatFecha = (fecha) => {
  if (!fecha) return null;
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ViajeCard = ({ viaje, onSelect }) => {
  const tipo = viaje.tipo || 'resort';
  const icono = tipo === 'tour' ? '🚐' : '🏨';
  const fechaInicio = formatFecha(viaje.fechaInicio);
  const fechaFin = formatFecha(viaje.fechaFin);

  return (
    <button
      type="button"
      className="bg-white rounded-xl shadow-sm border border-border p-5 text-left hover:shadow-md transition-all group"
      onClick={() => onSelect(viaje)}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl">{icono}</div>
        <div className="text-muted-foreground group-hover:translate-x-1 transition-transform">→</div>
      </div>
      <h3 className="font-semibold text-foreground mt-3">{viaje.nombre}</h3>
      {(fechaInicio || fechaFin) && (
        <p className="text-xs text-muted-foreground mt-1">
          {fechaInicio && fechaFin
            ? `${fechaInicio} → ${fechaFin}`
            : fechaInicio
            ? `Desde ${fechaInicio}`
            : `Hasta ${fechaFin}`}
        </p>
      )}
      {viaje.nota && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{viaje.nota}</p>}
      <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full ${
        tipo === 'tour' 
          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' 
          : 'bg-teal-50 text-teal-700 border border-teal-200'
      }`}>
        {tipo === 'tour' ? 'Tour' : 'Resort'}
      </span>
    </button>
  );
};