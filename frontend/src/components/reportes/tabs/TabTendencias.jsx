import { useMemo } from 'react';
import Grafico from '../../common/Grafico';
import { formatoCompacto } from '../../../utils/formatters';
import { ChartPanel, EmptyChart } from '../ui';

const TabTendencias = ({ datos, fmt, divisa }) => {
  const { tendenciasData, proyeccionData, comparativaData } = datos;
  const compacto = useMemo(() => formatoCompacto(divisa), [divisa]);
  const dinero = (v) => fmt(v);

  // Evolución: cobrado por mes (área) y acumulado (línea en su propio eje)
  const evolucion = useMemo(() => ({
    categorias: tendenciasData.map((d) => d.mes),
    series: [
      { name: 'Cobrado en el mes', type: 'area', color: '#059669', data: tendenciasData.map((d) => d.pagado), format: dinero },
      {
        name: 'Acumulado', type: 'line', color: '#6366f1', lineWidth: 2.5, data: tendenciasData.map((d) => d.acumulado), format: dinero,
        yAxis: { opposite: true, format: compacto, zero: true },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tendenciasData, compacto]);

  // Proyección: real (sólida) y estimación (punteada); los null cortan cada línea
  const proyeccion = useMemo(() => ({
    categorias: proyeccionData.map((d) => d.mes),
    series: [
      { name: 'Real', type: 'line', color: '#059669', lineWidth: 2.5, data: proyeccionData.map((d) => d.actual), format: dinero, markers: { show: true, size: 4 } },
      { name: 'Proyección', type: 'line', color: '#6366f1', dash: [6, 4], data: proyeccionData.map((d) => d.tendencia), format: dinero },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [proyeccionData]);

  const comparativa = useMemo(() => ({
    categorias: comparativaData.map((d) => d.name),
    series: [
      { name: 'Pagado', type: 'bar', color: '#059669', data: comparativaData.map((d) => d.pagado), format: dinero },
      { name: 'Pendiente', type: 'bar', color: '#f4a9a3', data: comparativaData.map((d) => d.pendiente), format: dinero },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [comparativaData]);

  const sinProyeccion = proyeccionData.every((d) => !d.actual && !d.tendencia);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel title="Evolución de recaudación" subtitle="Dinero cobrado en cada mes y total acumulado">
          {tendenciasData.length === 0 ? <EmptyChart /> : (
            <Grafico type="area" height={240} categories={evolucion.categorias} series={evolucion.series}
              y={{ format: compacto, zero: true }} legend={{ show: true }} tooltip={{ header: '{x}' }}
              export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Evolución de recaudación' }} />
          )}
        </ChartPanel>

        <ChartPanel title="Proyección de cobro" subtitle="Línea sólida = cobros reales · punteada = estimación si el ritmo sigue igual">
          {sinProyeccion ? <EmptyChart /> : (
            <Grafico type="line" height={240} categories={proyeccion.categorias} series={proyeccion.series}
              y={{ format: compacto, zero: true }} legend={{ show: true }} tooltip={{ header: '{x}' }}
              export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Proyección de cobro' }} />
          )}
        </ChartPanel>
      </div>

      {comparativaData.length > 0 && (
        <ChartPanel title="Comparativa entre viajes" subtitle="Cuánto se ha cobrado y cuánto falta en cada viaje">
          <Grafico type="bar" height={280} categories={comparativa.categorias} series={comparativa.series}
            y={{ format: compacto, zero: true }} bar={{ radius: 5, padding: 0.3 }} legend={{ show: true }} tooltip={{ header: '{x}' }}
            export={{ formats: ['png', 'pdf', 'xlsx'], filename: 'Comparativa entre viajes' }} />
        </ChartPanel>
      )}
    </div>
  );
};

export default TabTendencias;
