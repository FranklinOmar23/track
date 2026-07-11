import { useState, useEffect, useRef } from 'react';
import { Plane, Building2, Bus, DollarSign, TrendingUp } from 'lucide-react';

function useCountUp(target, duration = 1350) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof target !== 'number' || target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(target * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

const fmt = (n) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(n));

const STATS = [
  {
    key: 'totalViajes',
    title: 'Total Viajes',
    icon: Plane,
    iconBg: 'bg-white/8',
    iconColor: 'text-gray-300',
    cardGradient: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    accentRgb: '255,255,255',
    borderHover: 'rgba(255,255,255,0.15)',
    render: (n) => Math.round(n),
  },
  {
    key: 'resorts',
    title: 'Resorts',
    icon: Building2,
    iconBg: 'bg-teal-500/15',
    iconColor: 'text-teal-400',
    iconGlow: 'icon-glow-teal',
    cardGradient: 'linear-gradient(135deg, rgba(13,148,136,0.12) 0%, rgba(13,148,136,0.04) 100%)',
    accentRgb: '13,148,136',
    borderHover: 'rgba(13,148,136,0.35)',
    render: (n) => Math.round(n),
  },
  {
    key: 'tours',
    title: 'Tours',
    icon: Bus,
    iconBg: 'bg-slate-500/15',
    iconColor: 'text-slate-300',
    cardGradient: 'linear-gradient(135deg, rgba(100,116,139,0.10) 0%, rgba(100,116,139,0.03) 100%)',
    accentRgb: '100,116,139',
    borderHover: 'rgba(100,116,139,0.3)',
    render: (n) => Math.round(n),
  },
  {
    key: 'recaudado',
    title: 'Recaudado',
    icon: DollarSign,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    iconGlow: 'icon-glow-amber',
    cardGradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
    accentRgb: '245,158,11',
    borderHover: 'rgba(245,158,11,0.35)',
    isCurrency: true,
    render: (n) => fmt(n),
  },
  {
    key: 'porcentaje',
    title: 'Completado',
    icon: TrendingUp,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    iconGlow: 'icon-glow-cyan',
    cardGradient: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 100%)',
    accentRgb: '6,182,212',
    borderHover: 'rgba(6,182,212,0.35)',
    suffix: '%',
    render: (n) => n.toFixed(1),
  },
];

const STAGGER = ['stagger-0', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4'];

function StatCard({ stat, rawValue, index }) {
  const animated = useCountUp(rawValue, 1350);
  const [hovered, setHovered] = useState(false);

  const display = stat.render(animated) + (stat.suffix && !stat.isCurrency ? stat.suffix : '');

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/[0.07] p-4 sm:p-5 card-lift animate-fade-in-up ${STAGGER[index]}`}
      style={{
        background: stat.cardGradient,
        backgroundColor: '#1a1f2e',
        borderColor: hovered ? stat.borderHover : undefined,
        transition: 'border-color 220ms ease, transform 220ms cubic-bezier(0.23,1,0.32,1), box-shadow 220ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Corner glow orb */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${stat.accentRgb},0.35), transparent 70%)`,
          opacity: hovered ? 0.4 : 0.2,
          transition: 'opacity 300ms ease',
          filter: 'blur(16px)',
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-gray-500 uppercase">
            {stat.title}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-white mt-1.5 tabular-nums leading-none">
            {display}
          </span>
        </div>

        <div className={`p-2.5 rounded-xl flex-shrink-0 ${stat.iconBg} ${stat.iconGlow || ''}`}>
          <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
        </div>
      </div>

      {/* Animated bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${stat.accentRgb},0.5), transparent)`,
          opacity: hovered ? 1 : 0.3,
          transition: 'opacity 300ms ease',
        }}
      />
    </div>
  );
}

export const DashboardStats = ({
  totalViajes, resorts, tours,
  porcentaje,
  totalPagadoRaw, porcentajeRaw,
}) => {
  const rawValues = {
    totalViajes: totalViajes || 0,
    resorts:     resorts     || 0,
    tours:       tours       || 0,
    recaudado:   typeof totalPagadoRaw === 'number' ? totalPagadoRaw : 0,
    porcentaje:  typeof porcentajeRaw  === 'number' ? porcentajeRaw  : parseFloat(porcentaje) || 0,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATS.map((stat, i) => (
        <StatCard
          key={stat.key}
          stat={stat}
          rawValue={rawValues[stat.key]}
          index={i}
        />
      ))}
    </div>
  );
};
