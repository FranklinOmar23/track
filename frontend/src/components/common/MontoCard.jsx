import { ChevronRight } from 'lucide-react';

// Tamaño que se adapta al ancho para que montos como RD$1,400,000 no se corten
const TAMANO_MONTO = { fontSize: 'clamp(1.35rem, 1.05rem + 0.75vw, 1.7rem)' };

/**
 * Tarjeta de monto: etiqueta, ícono en cuadro de color, valor grande y pie opcional.
 * acento: color "r,g,b" del ícono.
 */
const MontoCard = ({ icono: Icono, label, value, color = 'text-slate-900', acento = '100,116,139', pie, onClick, indice = 0 }) => (
  <div
    onClick={onClick}
    className={`group relative tarjeta p-4 sm:p-5 animate-fade-in-up ${onClick ? 'cursor-pointer card-lift' : ''}`}
    style={{ animationDelay: `${indice * 50}ms` }}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-slate-600">{label}</span>
      <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgba(${acento},0.12)` }}>
        <Icono className="h-3.5 w-3.5" style={{ color: `rgb(${acento})` }} strokeWidth={2.2} />
      </span>
    </div>
    <p className={`mt-2.5 font-bold tabular-nums leading-tight whitespace-nowrap tracking-tight ${color}`} style={TAMANO_MONTO}>
      {value}
    </p>
    {pie && <div className="mt-2.5">{pie}</div>}
    {onClick && (
      <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
    )}
  </div>
);

export default MontoCard;
