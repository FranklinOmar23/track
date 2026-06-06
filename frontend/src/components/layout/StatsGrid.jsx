import React from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { calcularEstadisticas, calcularTotalPagado } from '../../utils/calculos';
import { useDivisa } from '../../hooks/useDivisa';

const StatCard = ({ label, value, color = 'text-white' }) => (
  <div className="bg-[#1a1f2e] rounded-xl p-4 border border-white/[0.07]">
    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 font-medium leading-tight">
      {label}
    </p>
    <p className={`text-xl sm:text-2xl font-bold ${color} mt-1 truncate`}>{value}</p>
  </div>
);

const StatsGrid = () => {
  const { state } = useHabitacionesContext();
  const { fmt } = useDivisa();
  const { total, pagado, pendiente } = calcularEstadisticas(state.habitaciones);
  const habitaciones = state.habitaciones.length;
  const stackCount = state.habitaciones.filter((hab) => hab.stack).length;
  const completas = state.habitaciones.filter(
    (hab) => hab.stack || calcularTotalPagado(hab) >= hab.total
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <StatCard label="Total por Cobrar" value={fmt(total)} />
      <StatCard label="Recaudado" value={fmt(pagado)} color="text-emerald-400" />
      <StatCard label="Pendiente" value={fmt(pendiente)} color="text-red-400" />
      <StatCard label="Habitaciones" value={habitaciones} />
      <StatCard label="Stack" value={stackCount} color="text-emerald-400" />
      <StatCard label="Completadas" value={completas} color="text-emerald-400" />
    </div>
  );
};

export default StatsGrid;
