import { DashboardStats } from './DashboardStats';
import { ChartSection } from './ChartSection';
import { ViajesTable } from './ViajesTable';
import { FechasViajes } from './FechasViajes';
import { useStatsViajes } from '../../hooks/useStatsViajes';
import { divisaPrincipal } from '../../utils/formatters';
import { calcularGananciaResumen } from '../../utils/calculos';
import { EsqueletoDashboard } from '../common/Esqueleto';

const fechaHoy = () => {
  const t = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // "martes, 24 de noviembre de 2026" -> "Martes, 24 de noviembre 2026"
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace(/ de (\d{4})$/, ' $1');
};

export const DashboardFull = ({ onSelectViaje }) => {
  const { viajes: todos, loading, error } = useStatsViajes();

  // Los viajes cerrados van al Historial, no al dashboard
  const viajes = todos.filter((v) => v.estado !== 'cerrado');
  const resorts = viajes.filter((v) => v.tipo !== 'tour').length;
  const tours = viajes.length - resorts;
  const cerrados = todos.length - viajes.length;

  const encabezado = (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in">
      <div>
        <p className="text-xs text-slate-500">{fechaHoy()}</p>
        <h1 className="titulo-pagina mt-1">Dashboard</h1>
        <p className="subtitulo-pagina">Gestiona y monitorea todos tus viajes y pagos en tiempo real.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="chip chip-fuerte">{viajes.length} viaje{viajes.length !== 1 ? 's' : ''} activo{viajes.length !== 1 ? 's' : ''}</span>
        <span className="chip">{resorts} resort{resorts !== 1 ? 's' : ''}</span>
        <span className="chip">{tours} tour{tours !== 1 ? 's' : ''}</span>
        <span className="chip">{cerrados} en historial</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {encabezado}
        <EsqueletoDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {encabezado}
        <p className="tarjeta p-6 text-sm text-red-700">No se pudieron cargar las estadísticas: {error}</p>
      </div>
    );
  }

  if (viajes.length === 0) {
    return (
      <div className="space-y-6">
        {encabezado}
        <div className="tarjeta p-12 text-center">
          <p className="text-slate-900 font-semibold">No hay viajes activos.</p>
          <p className="text-sm text-slate-500 mt-1">Crea un viaje con el botón “Nuevo viaje” del menú.</p>
        </div>
      </div>
    );
  }

  // Totales globales (los viajes se suman en la divisa más usada)
  const divisa = divisaPrincipal(viajes);
  const totales = viajes.reduce((acc, v) => {
    const ganancia = calcularGananciaResumen(v);
    const avance = v.total_por_cobrar > 0 ? Math.min(1, v.total_pagado / v.total_por_cobrar) : 0;
    acc.porCobrar += v.total_por_cobrar;
    acc.pagado += v.total_pagado;
    acc.pendiente += v.pendiente;
    acc.habitaciones += v.total_habitaciones;
    acc.personas += v.total_personas;
    acc.ganancia += ganancia;
    acc.gananciaCobrada += v.ganancia_tipo === 'porcentaje'
      ? (v.total_pagado * v.ganancia_valor) / 100
      : ganancia * avance;
    if (v.pendiente > 0) acc.viajesConSaldo += 1;
    if (v.ganancia_tipo !== 'ninguna') acc.conGanancia = true;
    return acc;
  }, { porCobrar: 0, pagado: 0, pendiente: 0, habitaciones: 0, personas: 0, ganancia: 0, gananciaCobrada: 0, viajesConSaldo: 0, conGanancia: false });

  return (
    <div className="space-y-5">
      {encabezado}
      <div className="pt-1 aparecer"><DashboardStats totales={totales} divisa={divisa} /></div>
      <ChartSection viajes={viajes} divisa={divisa} totales={totales} onSelectViaje={onSelectViaje} />
      <FechasViajes viajes={viajes} divisa={divisa} onSelectViaje={onSelectViaje} />
      <ViajesTable viajes={viajes} onSelectViaje={onSelectViaje} />
    </div>
  );
};
