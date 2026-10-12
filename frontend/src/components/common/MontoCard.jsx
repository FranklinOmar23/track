import { ChevronRight } from 'lucide-react';

// Tamaño que se adapta al ancho para que montos como RD$1,400,000 no se corten
const TAMANO_MONTO = { fontSize: 'clamp(1.35rem, 1.1rem + 0.9vw, 1.9rem)' };

/** Tarjeta de monto: ícono, etiqueta, valor grande y pie opcional. */
const MontoCard = ({ icono: Icono, label, value, color, acento, pie, onClick, indice = 0 }) => (
  <div
    onClick={onClick}
    className={`group relative overflow-hidden rounded-2xl p-5 border border-white/[0.07] animate-fade-in-up card-lift ${
      onClick ? 'cursor-pointer hover:border-white/20' : ''
    }`}
    style={{ background: `linear-gradient(135deg, rgba(${acento},0.10) 0%, #1a1f2e 55%)`, animationDelay: `${indice * 70}ms` }}
  >
    <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
      style={{ background: `radial-gradient(circle, rgba(${acento},0.25), transparent 70%)` }} />
    <div className="relative flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</span>
      <span className="p-1.5 rounded-lg" style={{ background: `rgba(${acento},0.15)` }}>
        <Icono className="h-4 w-4" style={{ color: `rgb(${acento})` }} />
      </span>
    </div>
    <p className={`relative mt-3 font-bold tabular-nums leading-tight whitespace-nowrap ${color}`} style={TAMANO_MONTO}>
      {value}
    </p>
    {pie && <div className="relative mt-2">{pie}</div>}
    {onClick && (
      <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
    )}
  </div>
);

export default MontoCard;
