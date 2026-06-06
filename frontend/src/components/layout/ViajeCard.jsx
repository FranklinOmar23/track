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
  const fechaFin    = formatFecha(viaje.fechaFin);

  return (
    <button
      type="button"
      className="bg-[#1a1f2e] rounded-xl border border-white/[0.07] p-5 text-left hover:border-white/[0.15] hover:bg-[#1e2437] transition-all group w-full"
      onClick={() => onSelect(viaje)}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl">{icono}</div>
        <div className="text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all">→</div>
      </div>
      <h3 className="font-semibold text-white mt-3">{viaje.nombre}</h3>
      {(fechaInicio || fechaFin) && (
        <p className="text-xs text-gray-500 mt-1">
          {fechaInicio && fechaFin
            ? `${fechaInicio} → ${fechaFin}`
            : fechaInicio ? `Desde ${fechaInicio}` : `Hasta ${fechaFin}`}
        </p>
      )}
      {viaje.nota && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{viaje.nota}</p>}
      <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full border ${
        tipo === 'tour'
          ? 'bg-cyan-900/40 text-cyan-400 border-cyan-600/40'
          : 'bg-teal-900/40 text-teal-400 border-teal-600/40'
      }`}>
        {tipo === 'tour' ? 'Tour' : 'Resort'}
      </span>
    </button>
  );
};
