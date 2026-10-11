import { useEffect, useRef, useState } from 'react';
import { FileDown, ChevronDown, Zap, TableProperties } from 'lucide-react';
import { exportarExcelRapido, exportarExcelDetallado } from '../../utils/exportExcel';

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
  const [generando, setGenerando] = useState(null);
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

  const exportar = async (opcion) => {
    setAbierto(false);
    setGenerando(opcion.id);
    try {
      await opcion.exportar(habitaciones, viaje);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert(`No se pudo generar el Excel: ${error.message}`);
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={!!generando}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-60"
        title="Exportar a Excel"
      >
        <FileDown className="h-4 w-4" />
        <span className="hidden sm:inline">{generando ? 'Generando...' : 'Exportar Excel'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl overflow-hidden z-30 animate-fade-in"
          style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}>
          {OPCIONES.map((op) => (
            <button key={op.id} type="button" role="menuitem" onClick={() => exportar(op)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-b-0">
              <op.icono className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold text-white">{op.titulo}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{op.descripcion}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuExportarExcel;
