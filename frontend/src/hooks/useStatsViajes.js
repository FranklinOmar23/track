import { useEffect, useMemo, useState } from 'react';
import { fetchDashboardStats } from '../utils/api';
import { useHabitacionesContext } from '../Context/HabitacionesContext';

const VACIO = { total_por_cobrar: 0, total_pagado: 0, pendiente: 0, total_habitaciones: 0, total_personas: 0, personas_pagan: 0, total_transferido: 0, en_cuenta: 0 };

/**
 * Viajes del contexto (reactivos a ediciones) + totales del API (cobrado, pendiente, habitaciones…).
 * Devuelve todos los viajes; cada pantalla filtra activos / cerrados.
 */
export const useStatsViajes = () => {
  const { state } = useHabitacionesContext();
  const [statsMap, setStatsMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    fetchDashboardStats()
      .then((data) => {
        if (cancelado) return;
        const mapa = {};
        (data.viajes || []).forEach((v) => {
          mapa[v.id] = {
            total_por_cobrar: Number(v.total_por_cobrar) || 0,
            total_pagado: Number(v.total_pagado) || 0,
            pendiente: Number(v.pendiente) || 0,
            total_habitaciones: Number(v.total_habitaciones) || 0,
            total_personas: Number(v.total_personas) || 0,
            personas_pagan: Number(v.personas_pagan) || 0,
            total_transferido: Number(v.total_transferido) || 0,
            en_cuenta: Number(v.en_cuenta ?? v.total_pagado) || 0,
          };
        });
        setStatsMap(mapa);
      })
      .catch((err) => {
        console.error('Error cargando estadísticas:', err);
        if (!cancelado) setError(err.message);
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  // Todos los datos del viaje del contexto (fechas, nota, política, ganancia, estado) + totales del API.
  const viajes = useMemo(() => state.viajes.map((v) => {
    const extra = statsMap?.[v.id] || VACIO;
    const pct = extra.total_por_cobrar > 0 ? (extra.total_pagado / extra.total_por_cobrar) * 100 : 0;
    return {
      ...v,
      ...extra,
      pct,
      divisa: v.divisa || 'USD',
      ganancia_tipo: v.gananciaTipo || 'ninguna',
      ganancia_valor: Number(v.gananciaValor) || 0,
    };
  }), [state.viajes, statsMap]);

  return { viajes, loading, error };
};
