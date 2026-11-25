import { useEffect, useRef, useState } from 'react';
import { Download, Zap, TableProperties } from 'lucide-react';
import { exportarExcelRapido, exportarExcelDetallado } from '../../utils/exportExcel';
import { useGeneracionExcel } from '../../hooks/useGeneracionExcel';

const OPCIONES = [
  {
    id: 'rapido',
    icono: Zap,
    titulo: 'Excel rápido',
    descripcion: 'Total por habitación y cuánto han pagado',
    exportar: exportarExcelRapido,
  },
  {
    id: 'detallado',
    icono: TableProperties,
    titulo: 'Excel detallado',
    descripcion: 'Cada persona y lo que pagó en cada mes',
    exportar: exportarExcelDetallado,
  },
];

/** Botón "Exportar Excel" con dos formatos: rápido y detallado. */
const MenuExportarExcel = ({ habitaciones, viaje }) => {
  const [abierto, setAbierto] = useState(false);
  const { generar, generando, pantalla } = useGeneracionExcel();
  const ref = useRef(null);

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return undefined;
    const alClic = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const alTecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  const exportar = (opcion) => {
    setAbierto(false);
    generar(() => opcion.exportar(habitaciones, viaje), {
      titulo: opcion.titulo,
      archivo: `${viaje?.nombre || 'viaje'} - ${opcion.titulo}.xlsx`,
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={generando}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="btn btn-borde"
        title="Exportar a Excel"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Exportar Excel</span>
      </button>

      {pantalla}

      {abierto && (
        <div role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl overflow-hidden z-30 animate-fade-in-scale origin-top-right"
          style={{ background: 'var(--superficie)', border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 16px 36px -12px rgba(15,23,42,0.25)' }}>
          {OPCIONES.map((op) => (
            <button key={op.id} type="button" role="menuitem" onClick={() => exportar(op)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
              <op.icono className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{op.titulo}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{op.descripcion}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuExportarExcel;
