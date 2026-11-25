import { forwardRef } from 'react';
import PocketChart from 'pocketchart/react';
import { useTema } from '../../utils/tema';

const FUENTE = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Colores y tipografía de la app para los gráficos, en modo claro y oscuro. */
const TEMAS = {
  claro: {
    bg: '#ffffff', fg: '#0f172a', muted: '#64748b', grid: '#eef1f5', axis: '#e2e8f0',
    chip: '#f1f5f9', chipOn: '#e6f4f1', tip: '#ffffff', line: '#cbd5e1', font: FUENTE, radius: 12,
  },
  oscuro: {
    bg: '#111a2b', fg: '#e8edf5', muted: '#8d9ab0', grid: '#1e293b', axis: '#253045',
    chip: '#1b2638', chipOn: '#0f2a29', tip: '#162033', line: '#3d4a60', font: FUENTE, radius: 12,
  },
};

/**
 * Gráfico interactivo (PocketChart) con el tema de la app: tooltip al tocar o pasar el mouse,
 * zoom, leyenda y exportar a PNG / PDF / Excel. Cambia solo al pasar a modo oscuro.
 * `series` y las opciones de PocketChart van como props; `className` y `style` son del contenedor.
 */
const Grafico = forwardRef(function Grafico({ options, ...props }, ref) {
  const tema = useTema();
  return (
    <PocketChart
      // Al cambiar de tema se vuelve a crear el gráfico con sus colores
      key={tema}
      ref={ref}
      theme={tema === 'oscuro' ? 'dark' : 'light'}
      lang="es"
      animation={{ enter: 'grow', duration: 700 }}
      export={{ formats: ['png', 'pdf', 'xlsx'] }}
      options={{ style: TEMAS[tema], styleDark: TEMAS.oscuro, ...options }}
      {...props}
    />
  );
});

export default Grafico;
