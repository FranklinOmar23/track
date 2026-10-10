import { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { calcularEstadisticas, calcularTotalPagado, calcularTotalHabitacion, calcularGanancia } from '../../utils/calculos';
import { useDivisa } from '../../hooks/useDivisa';
import ModalNumerosHabitaciones from '../Modals/ModalNumerosHabitaciones';
import ModalTopPagadores from '../Modals/ModalTopPagadores';

const StatCard = ({ label, value, sub, color = 'text-white', onClick }) => (
  <div
    className={`bg-[#1a1f2e] rounded-xl p-4 border border-white/[0.07] ${onClick ? 'cursor-pointer hover:border-white/20 transition-colors' : ''}`}
    onClick={onClick}
  >
    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 font-medium leading-tight">
      {label}
    </p>
    <p className={`text-xl sm:text-2xl font-bold ${color} mt-1 truncate`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{sub}</p>}
  </div>
);

const StatsGrid = () => {
  const { state } = useHabitacionesContext();
  const { fmt } = useDivisa();
  const viaje = state.viajes.find((v) => v.id === state.selectedViajeId);
  const ganancia = calcularGanancia(viaje, state.habitaciones);
  const [modalNumerosOpen, setModalNumerosOpen] = useState(false);
  const [modalPagadoresOpen, setModalPagadoresOpen] = useState(false);
  const { total, pagado, pendiente } = calcularEstadisticas(state.habitaciones);
  const habitaciones = state.habitaciones.length;
  const stackCount = state.habitaciones.filter((hab) => hab.stack).length;
  const completas = state.habitaciones.filter(
    (hab) => hab.stack || calcularTotalPagado(hab) >= calcularTotalHabitacion(hab)
  ).length;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard label="Total por Cobrar" value={fmt(total)} />
        <StatCard label="Recaudado" value={fmt(pagado)} color="text-emerald-400" onClick={() => setModalPagadoresOpen(true)} />
        <StatCard label="Pendiente" value={fmt(pendiente)} color="text-red-400" />
        <StatCard label="Habitaciones" value={habitaciones} onClick={() => setModalNumerosOpen(true)} />
        <StatCard label="Stack" value={stackCount} color="text-emerald-400" />
        <StatCard label="Completadas" value={completas} color="text-emerald-400" />
        <StatCard
          label="Ganancia est."
          value={ganancia.tipo === 'ninguna' ? '—' : fmt(ganancia.estimada)}
          color="text-emerald-300"
          sub={ganancia.tipo === 'porcentaje'
            ? `${ganancia.valor}% · cobrada ${fmt(ganancia.cobrada)}`
            : ganancia.tipo === 'por_persona'
              ? `${fmt(ganancia.valor)} × ${ganancia.pax} pax`
              : 'Configúrala al editar el viaje'}
        />
      </div>

      {modalNumerosOpen && (
        <ModalNumerosHabitaciones
          habitaciones={state.habitaciones}
          onClose={() => setModalNumerosOpen(false)}
        />
      )}

      {modalPagadoresOpen && (
        <ModalTopPagadores
          habitaciones={state.habitaciones}
          onClose={() => setModalPagadoresOpen(false)}
        />
      )}
    </>
  );
};

export default StatsGrid;
