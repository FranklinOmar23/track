import React, { useState, useEffect } from 'react';
import { DashboardStats } from './DashboardStats';
import { ChartSection } from './ChartSection';
import { ViajesTable } from './ViajesTable';
import { fetchDashboardStats } from '../../utils/api';

export const DashboardFull = ({ onSelectViaje }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarStats = async () => {
      try {
        const data = await fetchDashboardStats();
        console.log('📊 Datos recibidos del backend:', data);
        setStats(data);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!stats || !stats.viajes || stats.viajes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay viajes registrados aún.</p>
      </div>
    );
  }

  // Asegurar que los valores sean números (por si vienen como string)
  const viajesProcesados = stats.viajes.map(v => ({
    ...v,
    total_por_cobrar: Number(v.total_por_cobrar) || 0,
    total_pagado: Number(v.total_pagado) || 0,
    pendiente: Number(v.pendiente) || 0,
    total_habitaciones: Number(v.total_habitaciones) || 0,
    total_personas: Number(v.total_personas) || 0,
  }));

  const totalPagado = viajesProcesados.reduce((sum, v) => sum + v.total_pagado, 0);
  const totalPorCobrar = viajesProcesados.reduce((sum, v) => sum + v.total_por_cobrar, 0);
  const porcentajeGlobal = totalPorCobrar > 0 ? ((totalPagado / totalPorCobrar) * 100).toFixed(1) : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <DashboardStats
        totalViajes={stats.resumen.total_viajes}
        resorts={stats.resumen.total_resorts}
        tours={stats.resumen.total_tours}
        recaudado={formatCurrency(stats.resumen.total_pagado)}
        porcentaje={stats.resumen.porcentaje_pagado}
      />

      <ChartSection viajes={viajesProcesados} />

      <ViajesTable viajes={viajesProcesados} onSelectViaje={onSelectViaje} />
    </div>
  );
};