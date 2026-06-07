import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const formatFecha = (fecha) => {
  if (!fecha) return null;
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STAGGER = ['stagger-0', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5'];

export const ViajeCard = ({ viaje, onSelect, index = 0 }) => {
  const [hovered, setHovered] = useState(false);
  const tipo = viaje.tipo || 'resort';
  const icono = tipo === 'tour' ? '🚐' : '🏨';
  const fechaInicio = formatFecha(viaje.fechaInicio);
  const fechaFin    = formatFecha(viaje.fechaFin);
  const stagger = STAGGER[Math.min(index % 6, STAGGER.length - 1)];

  const accent     = tipo === 'tour' ? '6,182,212' : '13,148,136';
  const accentHex  = tipo === 'tour' ? '#06b6d4'   : '#0d9488';
  const badgeClass = tipo === 'tour'
    ? 'bg-cyan-900/40 text-cyan-400 border-cyan-600/30'
    : 'bg-teal-900/40 text-teal-400 border-teal-600/30';

  return (
    <button
      type="button"
      className={`group relative overflow-hidden text-left w-full rounded-xl p-5 animate-fade-in-up ${stagger}`}
      style={{
        backgroundColor: '#1a1f2e',
        border: `1px solid ${hovered ? `rgba(${accent},0.35)` : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 220ms ease, transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 36px -10px rgba(${accent},0.25), 0 0 0 1px rgba(${accent},0.12)`
          : 'none',
      }}
      onClick={() => onSelect(viaje)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Corner accent glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${accent},0.4), transparent 70%)`,
          filter: 'blur(20px)',
          opacity: hovered ? 0.5 : 0.15,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Bottom line accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${accent},0.6), transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div
            className="text-3xl"
            style={{
              animation: `floatY ${3.5 + (index % 3) * 0.4}s ease-in-out infinite`,
              animationDelay: `${(index % 4) * 0.6}s`,
              display: 'inline-block',
            }}
          >
            {icono}
          </div>
          <div
            style={{
              color: hovered ? accentHex : 'rgba(255,255,255,0.25)',
              transform: hovered ? 'translateX(3px)' : 'translateX(0)',
              transition: 'color 220ms ease, transform 220ms ease',
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        <h3
          className="font-semibold mt-3 leading-snug"
          style={{
            color: hovered ? '#f0fdfa' : '#ffffff',
            transition: 'color 220ms ease',
          }}
        >
          {viaje.nombre}
        </h3>

        {(fechaInicio || fechaFin) && (
          <p className="text-xs text-gray-500 mt-1.5">
            📅{' '}
            {fechaInicio && fechaFin
              ? `${fechaInicio} → ${fechaFin}`
              : fechaInicio ? `Desde ${fechaInicio}` : `Hasta ${fechaFin}`}
          </p>
        )}

        {viaje.nota && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{viaje.nota}</p>
        )}

        <span className={`inline-block mt-3 text-xs px-2.5 py-1 rounded-full border font-semibold ${badgeClass}`}>
          {tipo === 'tour' ? 'Tour' : 'Resort'}
        </span>
      </div>
    </button>
  );
};
