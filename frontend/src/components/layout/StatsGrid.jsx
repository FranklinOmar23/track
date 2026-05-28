import React from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { calcularEstadisticas, calcularTotalPagado } from '../../utils/calculos';

const StatCard = ({ label, value, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</p>
    <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
  </div>
);

const StatsGrid = () => {
  const { state } = useHabitacionesContext();
  const { total, pagado, pendiente } = calcularEstadisticas(state.habitaciones);
  const habitaciones = state.habitaciones.length;
  const stackCount = state.habitaciones.filter(hab => hab.stack).length;
  const completas = state.habitaciones.filter(hab => hab.stack || calcularTotalPagado(hab) >= hab.total).length;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <StatCard label="Total por Cobrar" value={formatCurrency(total)} />
      <StatCard label="Recaudado" value={formatCurrency(pagado)} color="text-teal-600" />
      <StatCard label="Pendiente" value={formatCurrency(pendiente)} color="text-rose-500" />
      <StatCard label="Habitaciones" value={habitaciones} />
      <StatCard label="Stack" value={stackCount} color="text-amber-600" />
      <StatCard label="Completadas" value={completas} color="text-teal-600" />
    </div>
  );
};

export default StatsGrid;