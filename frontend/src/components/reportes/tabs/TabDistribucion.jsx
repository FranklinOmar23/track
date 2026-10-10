import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartPanel, EmptyChart } from '../ui';
import { DARK_TOOLTIP } from '../datosReportes';

const TabDistribucion = ({ datos }) => {
  const { tipoData, estadoData } = datos;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <ChartPanel title="Distribución por Tipo" subtitle="Cuántas habitaciones hay de cada tipo (Single, Doble, Triple) según el filtro de viaje de arriba" orbColor="#0d9488">
        {tipoData.length === 0 ? <EmptyChart /> : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tipoData} cx="50%" cy="50%" innerRadius={52} outerRadius={82}
                    paddingAngle={4} dataKey="value" strokeWidth={0}
                    isAnimationActive animationDuration={800} animationEasing="ease-out"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}>
                    {tipoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={DARK_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {tipoData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}: <span className="text-white font-semibold ml-0.5">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </ChartPanel>

      <ChartPanel title="Estado de Pagos" subtitle="Cuántas habitaciones están en cada etapa: sin pago alguno, pagando parcialmente, o ya completas" orbColor="#8b5cf6">
        {estadoData.length === 0 ? <EmptyChart /> : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={estadoData} cx="50%" cy="50%" outerRadius={82}
                    paddingAngle={3} dataKey="value" strokeWidth={0}
                    isAnimationActive animationDuration={800} animationEasing="ease-out"
                    label={({ value }) => `${value}`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}>
                    {estadoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={DARK_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {estadoData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}: <span className="text-white font-semibold ml-0.5">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </ChartPanel>
    </div>
  );
};

export default TabDistribucion;
