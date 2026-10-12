import { useState, useEffect } from 'react';
import { DashboardStats } from './DashboardStats';
import { ChartSection } from './ChartSection';
import { ViajesTable } from './ViajesTable';
import { fetchDashboardStats } from '../../utils/api';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { divisaPrincipal } from '../../utils/formatters';
import { calcularGananciaResumen } from '../../utils/calculos';
import { FechasViajes } from './FechasViajes';

export const DashboardFull = ({ onSelectViaje }) => {
  const { state } = useHabitacionesContext();
  const [statsExtra, setStatsExtra] = useState(null); // solo totales del resumen
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarStats = async () => {
      try {
        const data = await fetchDashboardStats();
        // Guardamos solo el resumen y los stats por viaje (hab, personas, pagados)
        // pero NO los datos de nombre/tipo/divisa — esos vienen del contexto
        const statsMap = {};
        (data.viajes || []).forEach((v) => {
          statsMap[v.id] = {
            total_por_cobrar: Number(v.total_por_cobrar) || 0,
            total_pagado:     Number(v.total_pagado)     || 0,
            pendiente:        Number(v.pendiente)        || 0,
            total_habitaciones: Number(v.total_habitaciones) || 0,
            total_personas:   Number(v.total_personas)   || 0,
            personas_pagan:   Number(v.personas_pagan)   || 0,
          };
        });
        setStatsExtra({ resumen: data.resumen, statsMap });
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    cargarStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  // Viajes del contexto (reactivos a ediciones) + stats del API (totales)
  // Los viajes cerrados van al Historial, no al dashboard
  const viajes = state.viajes.filter((v) => v.estado !== 'cerrado');

  if (!viajes || viajes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay viajes activos.</p>
      </div>
    );
  }

  // Combinar: datos frescos del contexto + stats de totales del API
  const viajesProcesados = viajes.map((v) => {
    const extra = statsExtra?.statsMap?.[v.id] || {
      total_por_cobrar: 0,
      total_pagado: 0,
      pendiente: 0,
      total_habitaciones: 0,
      total_personas: 0,
    };
    // Todos los datos del viaje del contexto (fechas, nota, política, ganancia, estado)
    // + totales del API. Antes solo se pasaban algunos campos y el modal de editar
    // recibía fechas vacías, que al guardar se borraban.
    return {
      ...v,
      ...extra,
      divisa: v.divisa || 'USD',
      ganancia_tipo:  v.gananciaTipo || 'ninguna',
      ganancia_valor: Number(v.gananciaValor) || 0,
    };
  });

  // Totales globales (los viajes se suman en la divisa más usada)
  const divisa = divisaPrincipal(viajes);
  const totales = viajesProcesados.reduce((acc, v) => {
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

  const resorts = viajes.filter((v) => v.tipo !== 'tour').length;
  const tours = viajes.length - resorts;
  const cerrados = state.viajes.length - viajes.length;

  return (
    <div className="space-y-5">
      {/* Resumen en una línea */}
      <div className="flex flex-wrap items-center gap-2 text-xs animate-fade-in">
        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/[0.07] text-gray-300 font-semibold">
          {viajes.length} viaje{viajes.length !== 1 ? 's' : ''} activo{viajes.length !== 1 ? 's' : ''}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">{resorts} resort{resorts !== 1 ? 's' : ''}</span>
        <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">{tours} tour{tours !== 1 ? 's' : ''}</span>
        {cerrados > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-gray-500">{cerrados} en historial</span>
        )}
      </div>

      <DashboardStats totales={totales} divisa={divisa} />

      <ChartSection viajes={viajesProcesados} divisa={divisa} totales={totales} onSelectViaje={onSelectViaje} />

      <FechasViajes viajes={viajesProcesados} divisa={divisa} onSelectViaje={onSelectViaje} />

      <ViajesTable viajes={viajesProcesados} onSelectViaje={onSelectViaje} />
    </div>
  );
};
