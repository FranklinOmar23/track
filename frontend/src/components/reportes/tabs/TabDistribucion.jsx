import { useMemo } from 'react';
import Grafico from '../../common/Grafico';
import { ChartPanel, EmptyChart } from '../ui';

const habitaciones = (v) => `${v} hab.`;

/** Gráfico de pastel / dona con su leyenda de valores debajo. */
const Torta = ({ tipo, nombre, items, archivo }) => {
  const categorias = useMemo(() => items.map((d) => d.name), [items]);
  const colores = useMemo(() => items.map((d) => d.color), [items]);
  const series = useMemo(() => [{ name: nombre, data: items.map((d) => d.value), format: habitaciones }], [items, nombre]);
  const total = items.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <Grafico type={tipo} height={250} categories={categorias} series={series} colors={colores}
        legend={{ show: false }} donut={{ thickness: 0.36 }} y={{ format: habitaciones }}
        export={{ formats: ['png', 'pdf', 'xlsx'], filename: archivo }} />
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
        {items.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            {d.name}: <span className="text-slate-900 font-semibold">{d.value}</span>
            <span className="text-slate-400">({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </>
  );
};

const TabDistribucion = ({ datos }) => {
  const { tipoData, estadoData } = datos;
  const estados = estadoData.filter((d) => d.value > 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <ChartPanel title="Distribución por tipo" subtitle="Cuántas habitaciones hay de cada tipo (Single, Doble, Triple) según el filtro de viaje">
        {tipoData.length === 0 ? <EmptyChart /> : (
          <Torta tipo="donut" nombre="Habitaciones" items={tipoData} archivo="Distribución por tipo" />
        )}
      </ChartPanel>

      <ChartPanel title="Estado de pagos" subtitle="Habitaciones sin pago, pagando parcialmente o ya completas">
        {estados.length === 0 ? <EmptyChart /> : (
          <Torta tipo="pie" nombre="Habitaciones" items={estados} archivo="Estado de pagos" />
        )}
      </ChartPanel>
    </div>
  );
};

export default TabDistribucion;
