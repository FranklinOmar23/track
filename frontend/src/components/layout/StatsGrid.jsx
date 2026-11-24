import { useState } from 'react';
import { CreditCard, Check, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { calcularEstadisticas, calcularTotalPagado, calcularTotalHabitacion, calcularGanancia } from '../../utils/calculos';
import { useDivisa } from '../../hooks/useDivisa';
import ModalNumerosHabitaciones from '../Modals/ModalNumerosHabitaciones';
import ModalTopPagadores from '../Modals/ModalTopPagadores';
import MontoCard from '../common/MontoCard';
import { BarraCobrado } from '../Dashboard/DashboardStats';

/** Un contador de la franja (Habitaciones, Completadas, Stack, En revisión). */
const Contador = ({ label, value, color = 'text-slate-900', onClick, titulo, className = '' }) => {
  const Etiqueta = onClick ? 'button' : 'div';
  return (
    <Etiqueta type={onClick ? 'button' : undefined} onClick={onClick} title={titulo}
      className={`group flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left border-slate-100 ${className} ${onClick ? 'hover:bg-slate-50 transition-colors' : ''}`}>
      <span className="text-[13px] text-slate-600">{label}</span>
      <span className={`flex items-center gap-1 text-[15px] font-bold tabular-nums whitespace-nowrap ${color}`}>
        {value}
        {onClick && <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 -mr-1" />}
      </span>
    </Etiqueta>
  );
};

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
  const personas = state.habitaciones.reduce((s, h) => s + h.personas.filter((p) => p.n).length, 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MontoCard icono={CreditCard} label="Total por cobrar" value={fmt(total)} acento="71,85,105"
          pie={<p className="text-xs text-slate-500">{habitaciones} habitaciones · {personas} personas</p>} />

        <MontoCard icono={Check} label="Recaudado" value={fmt(pagado)} color="text-emerald-700" acento="5,150,105" indice={1}
          onClick={() => setModalPagadoresOpen(true)}
          pie={<div className="pr-6"><BarraCobrado porcentaje={porcentaje} /></div>} />

        <MontoCard icono={Clock} label="Pendiente" value={fmt(pendiente)} color="text-red-700" acento="220,38,38" indice={2}
          pie={<p className="text-xs text-slate-500">{habitaciones - completas} habitaciones con saldo</p>} />

        <MontoCard icono={TrendingUp} label="Ganancia estimada" acento="15,118,110" indice={3}
          value={ganancia.tipo === 'ninguna' ? '—' : fmt(ganancia.estimada)}
          pie={(
            <p className="text-xs text-slate-500">
              {ganancia.tipo === 'porcentaje'
                ? <>Margen {ganancia.valor}% · cobrada <span className="text-emerald-700 font-semibold">{fmt(ganancia.cobrada)}</span></>
                : ganancia.tipo === 'por_persona'
                  ? `${fmt(ganancia.valor)} × ${ganancia.pax} pax`
                  : 'Configúrala al editar el viaje'}
            </p>
          )} />
      </div>

      {/* Contadores en una sola franja */}
      <div className="tarjeta grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden animate-fade-in-up"
        style={{ animationDelay: '150ms' }}>
        <Contador label="Habitaciones" value={habitaciones} onClick={() => setModalNumerosOpen(true)} titulo="Ver números de habitación" />
        <Contador label="Completadas" value={`${completas} / ${habitaciones}`} className="border-t sm:border-t-0 sm:border-l" />
        <Contador label="Stack" value={`${stackCount} hab. · ${personasStack} pers.`} className="border-t lg:border-t-0 lg:border-l" />
        <Contador label="En revisión" value={revisionCount} className="border-t sm:border-l lg:border-t-0"
          color={revisionCount > 0 ? 'text-amber-700' : 'text-slate-900'}
          onClick={revisionCount > 0 ? () => setFiltros({ ...state.filtros, estado: 'revision' }) : undefined}
          titulo={revisionCount > 0 ? 'Ver habitaciones en revisión' : undefined} />
      </div>

      {modalNumerosOpen && (
        <ModalNumerosHabitaciones habitaciones={state.habitaciones} onClose={() => setModalNumerosOpen(false)} />
      )}
      {modalPagadoresOpen && (
        <ModalTopPagadores habitaciones={state.habitaciones} onClose={() => setModalPagadoresOpen(false)} />
      )}
    </>
  );
};

export default StatsGrid;
