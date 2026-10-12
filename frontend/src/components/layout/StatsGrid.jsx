import { useState } from 'react';
import { Wallet, CircleDollarSign, Hourglass, TrendingUp, BedDouble, Layers, BadgeCheck, ChevronRight, Flag } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { calcularEstadisticas, calcularTotalPagado, calcularTotalHabitacion, calcularGanancia } from '../../utils/calculos';
import { useDivisa } from '../../hooks/useDivisa';
import ModalNumerosHabitaciones from '../Modals/ModalNumerosHabitaciones';
import ModalTopPagadores from '../Modals/ModalTopPagadores';
import MontoCard from '../common/MontoCard';

/** Contador compacto (habitaciones, stack, completadas). */
const Contador = ({ icono: Icono, label, value, detalle, color = 'text-white', onClick, indice = 0 }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-[#1a1f2e] border border-white/[0.07] transition-colors animate-fade-in-up ${
      onClick ? 'cursor-pointer hover:border-white/20' : ''
    }`}
    style={{ animationDelay: `${280 + indice * 60}ms` }}
  >
    <span className="p-2 rounded-lg bg-white/[0.05]">
      <Icono className="h-4 w-4 text-gray-400" />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>
        {value}
        {detalle && <span className="ml-1.5 text-xs font-medium text-gray-500">{detalle}</span>}
      </p>
    </div>
    {onClick && <ChevronRight className="ml-auto h-4 w-4 text-gray-600" />}
  </div>
);

const StatsGrid = () => {
  const { state, setFiltros } = useHabitacionesContext();
  const { fmt } = useDivisa();
  const viaje = state.viajes.find((v) => v.id === state.selectedViajeId);
  const ganancia = calcularGanancia(viaje, state.habitaciones);
  const [modalNumerosOpen, setModalNumerosOpen] = useState(false);
  const [modalPagadoresOpen, setModalPagadoresOpen] = useState(false);
  const { total, pagado, pendiente } = calcularEstadisticas(state.habitaciones);
  const porcentaje = total > 0 ? Math.min(100, Math.round((pagado / total) * 100)) : 0;
  const habitaciones = state.habitaciones.length;
  const stackCount = state.habitaciones.filter((hab) => hab.stack).length;
  const personasStack = state.habitaciones.reduce(
    (s, hab) => s + (hab.stack ? 0 : hab.personas.filter((p) => p.n && p.esStack).length), 0);
  const revisionCount = state.habitaciones.filter((hab) => hab.enRevision).length;
  const completas = state.habitaciones.filter(
    (hab) => hab.stack || calcularTotalPagado(hab) >= calcularTotalHabitacion(hab)
  ).length;

  return (
    <>
      {/* Montos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
        <MontoCard icono={Wallet} label="Total por cobrar" value={fmt(total)} color="text-white" acento="148,163,184"
          pie={<p className="text-xs text-gray-500">{habitaciones} habitaciones · {state.habitaciones.reduce((s, h) => s + h.personas.filter((p) => p.n).length, 0)} personas</p>} />

        <MontoCard icono={CircleDollarSign} label="Recaudado" value={fmt(pagado)} color="text-emerald-400" acento="16,185,129" indice={1}
          onClick={() => setModalPagadoresOpen(true)}
          pie={(
            <div className="pr-6">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Cobrado</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{porcentaje}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${porcentaje}%`, '--pw': `${porcentaje}%`, animation: 'progressFill 1s 0.3s cubic-bezier(0.23,1,0.32,1) both' }} />
              </div>
            </div>
          )} />

        <MontoCard icono={Hourglass} label="Pendiente" value={fmt(pendiente)} color="text-rose-400" acento="244,63,94" indice={2}
          pie={<p className="text-xs text-gray-500">{habitaciones - completas} habitaciones con saldo</p>} />

        <MontoCard icono={TrendingUp} label="Ganancia estimada" acento="45,212,191" indice={3}
          value={ganancia.tipo === 'ninguna' ? '—' : fmt(ganancia.estimada)}
          color="text-teal-300"
          pie={(
            <p className="text-xs text-gray-500">
              {ganancia.tipo === 'porcentaje'
                ? <>{ganancia.valor}% · cobrada <span className="text-teal-300 font-semibold">{fmt(ganancia.cobrada)}</span></>
                : ganancia.tipo === 'por_persona'
                  ? `${fmt(ganancia.valor)} × ${ganancia.pax} pax`
                  : 'Configúrala al editar el viaje'}
            </p>
          )} />
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Contador icono={BedDouble} label="Habitaciones" value={habitaciones} onClick={() => setModalNumerosOpen(true)} />
        <Contador icono={BadgeCheck} label="Completadas" value={`${completas} / ${habitaciones}`} color="text-emerald-400" indice={1} />
        <Contador icono={Layers} label="Stack" value={stackCount} color="text-sky-300" indice={2}
          detalle={`hab.${personasStack > 0 ? ` · ${personasStack} pers.` : ''}`} />
        <Contador icono={Flag} label="En revisión" value={revisionCount} indice={3}
          color={revisionCount > 0 ? 'text-amber-300' : 'text-gray-500'}
          onClick={revisionCount > 0 ? () => setFiltros({ ...state.filtros, estado: 'revision' }) : undefined} />
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
