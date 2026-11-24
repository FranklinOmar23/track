import { forwardRef } from 'react';
import PocketChart from 'pocketchart/react';

/** Colores y tipografía de la app para todos los gráficos. */
const TEMA = {
  bg: '#ffffff',
  fg: '#0f172a',
  muted: '#64748b',
  grid: '#eef1f5',
  axis: '#e2e8f0',
  chip: '#f1f5f9',
  chipOn: '#e6f4f1',
  tip: '#ffffff',
  line: '#cbd5e1',
  font: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  radius: 12,
};

/**
 * Gráfico interactivo (PocketChart) con el tema de la app: tooltip al tocar o pasar el mouse,
 * zoom, leyenda y exportar a PNG / PDF / Excel.
 * `series` y las opciones de PocketChart van como props; `className` y `style` son del contenedor.
 */
const Grafico = forwardRef(function Grafico({ options, ...props }, ref) {
  return (
    <PocketChart
      ref={ref}
      theme="light"
      lang="es"
      animation={{ enter: 'grow', duration: 700 }}
      export={{ formats: ['png', 'pdf', 'xlsx'] }}
      options={{ style: TEMA, ...options }}
      {...props}
    />
  );
});

export default Grafico;
