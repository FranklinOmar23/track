import { CreditCard, Check, Clock, TrendingUp } from 'lucide-react';
import MontoCard from '../common/MontoCard';
import { formatCurrency } from '../../utils/formatters';

/** Barra de avance con el porcentaje a la derecha (tarjeta "Recaudado"). */
export const BarraCobrado = ({ porcentaje }) => (
  <div className="flex items-center gap-3">
    <div className="barra flex-1">
      <span className="bg-emerald-600"
        style={{ width: `${Math.min(100, porcentaje)}%`, '--pw': `${Math.min(100, porcentaje)}%`, animation: 'progressFill 0.9s 0.2s cubic-bezier(0.23,1,0.32,1) both' }} />
    </div>
    <span className="text-xs font-semibold text-emerald-700 tabular-nums">{porcentaje}%</span>
  </div>
);

/** Totales del dashboard: por cobrar, recaudado (con barra), pendiente y ganancia estimada. */
export const DashboardStats = ({ totales, divisa }) => {
  const fmt = (n) => formatCurrency(n, divisa);
  const { porCobrar, pagado, pendiente, ganancia, gananciaCobrada, habitaciones, personas, viajesConSaldo, conGanancia, transferido, enCuenta } = totales;
  const porcentaje = porCobrar > 0 ? Math.min(100, Math.round((pagado / porCobrar) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <MontoCard icono={CreditCard} label="Total por cobrar" value={fmt(porCobrar)} acento="71,85,105"
        pie={<p className="text-xs text-slate-500">{habitaciones} habitaciones · {personas} personas</p>} />

      <MontoCard icono={Check} label="Recaudado" value={fmt(pagado)} color="text-emerald-700" acento="5,150,105" indice={1}
        pie={(
          <div className="space-y-1.5">
            <BarraCobrado porcentaje={porcentaje} />
            {transferido > 0 && (
              <p className="text-xs text-slate-500" title="Cobrado menos lo transferido a los hoteles">
                En cuenta <span className="font-semibold text-teal-800">{fmt(enCuenta)}</span>
              </p>
            )}
          </div>
        )} />

      <MontoCard icono={Clock} label="Pendiente" value={fmt(pendiente)} color="text-red-700" acento="220,38,38" indice={2}
        pie={<p className="text-xs text-slate-500">{viajesConSaldo} viaje{viajesConSaldo !== 1 ? 's' : ''} con saldo pendiente</p>} />

      <MontoCard icono={TrendingUp} label="Ganancia estimada" value={conGanancia ? fmt(ganancia) : '—'} acento="15,118,110" indice={3}
        pie={(
          <p className="text-xs text-slate-500">
            {conGanancia
              ? <>Cobrada <span className="text-emerald-700 font-semibold">{fmt(gananciaCobrada)}</span></>
              : 'Configura el margen al editar cada viaje'}
          </p>
        )} />
    </div>
  );
};
