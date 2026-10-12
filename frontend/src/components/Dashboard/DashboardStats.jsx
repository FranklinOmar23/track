import { Wallet, CircleDollarSign, Hourglass, TrendingUp } from 'lucide-react';
import MontoCard from '../common/MontoCard';
import { formatCurrency } from '../../utils/formatters';

/** Totales del dashboard: por cobrar, recaudado (con barra), pendiente y ganancia estimada. */
export const DashboardStats = ({ totales, divisa }) => {
  const fmt = (n) => formatCurrency(n, divisa);
  const { porCobrar, pagado, pendiente, ganancia, gananciaCobrada, habitaciones, personas, viajesConSaldo, conGanancia } = totales;
  const porcentaje = porCobrar > 0 ? Math.min(100, Math.round((pagado / porCobrar) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <MontoCard icono={Wallet} label="Total por cobrar" value={fmt(porCobrar)} color="text-white" acento="148,163,184"
        pie={<p className="text-xs text-gray-500">{habitaciones} habitaciones · {personas} personas</p>} />

      <MontoCard icono={CircleDollarSign} label="Recaudado" value={fmt(pagado)} color="text-emerald-400" acento="16,185,129" indice={1}
        pie={(
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Cobrado</span>
              <span className="font-semibold text-emerald-400 tabular-nums">{porcentaje}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500"
                style={{ width: `${porcentaje}%`, '--pw': `${porcentaje}%`, animation: 'progressFill 1s 0.3s cubic-bezier(0.23,1,0.32,1) both' }} />
            </div>
          </div>
        )} />

      <MontoCard icono={Hourglass} label="Pendiente" value={fmt(pendiente)} color="text-rose-400" acento="244,63,94" indice={2}
        pie={<p className="text-xs text-gray-500">{viajesConSaldo} viaje{viajesConSaldo !== 1 ? 's' : ''} con saldo pendiente</p>} />

      <MontoCard icono={TrendingUp} label="Ganancia estimada" value={conGanancia ? fmt(ganancia) : '—'} color="text-teal-300" acento="45,212,191" indice={3}
        pie={(
          <p className="text-xs text-gray-500">
            {conGanancia
              ? <>Cobrada <span className="text-teal-300 font-semibold">{fmt(gananciaCobrada)}</span></>
              : 'Configura el margen al editar cada viaje'}
          </p>
        )} />
    </div>
  );
};
