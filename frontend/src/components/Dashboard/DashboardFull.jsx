import { useState, useEffect } from 'react';
import { DashboardStats } from './DashboardStats';
import { ChartSection } from './ChartSection';
import { ViajesTable } from './ViajesTable';
import { fetchDashboardStats } from '../../utils/api';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';

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
  const viajes = state.viajes;

  if (!viajes || viajes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay viajes registrados aún.</p>
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
    return {
      ...extra,
      // Datos reactivos del contexto (nombre, tipo, divisa siempre frescos)
      id:     v.id,
      nombre: v.nombre,
      tipo:   v.tipo,
      divisa: v.divisa || 'USD',
      slug:   v.slug,
    };
  });

  const totalPagado    = viajesProcesados.reduce((s, v) => s + v.total_pagado, 0);
  const totalPorCobrar = viajesProcesados.reduce((s, v) => s + v.total_por_cobrar, 0);
  const porcentajeGlobal = totalPorCobrar > 0
    ? ((totalPagado / totalPorCobrar) * 100).toFixed(1)
    : 0;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6">
      <DashboardStats
        totalViajes={viajes.length}
        resorts={viajes.filter((v) => v.tipo === 'resort').length}
        tours={viajes.filter((v) => v.tipo === 'tour').length}
        recaudado={formatCurrency(totalPagado)}
        totalPagadoRaw={totalPagado}
        porcentaje={porcentajeGlobal}
        porcentajeRaw={parseFloat(porcentajeGlobal)}
      />

      <ChartSection viajes={viajesProcesados} />

      <ViajesTable viajes={viajesProcesados} onSelectViaje={onSelectViaje} />
    </div>
  );
};