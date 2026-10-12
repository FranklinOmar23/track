import { useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { formatearCelda, armarFilas, esNumerica } from './tablaReporte';

/** Tabla de reporte: orden por columna, grupos con subtotales y total general. */
const ReporteTabla = ({ columnas, filas, agruparPor, divisa, orden, onOrdenar }) => {
  const filasVista = useMemo(() => armarFilas({ columnas, filas, agruparPor, orden }), [columnas, filas, agruparPor, orden]);

  if (!filas.length) {
    return <p className="text-center text-sm text-gray-500 py-14 sin-imprimir-vacio">No hay datos para estos filtros.</p>;
  }

  const celda = (col, valor, fila) => {
    if (valor === 'varias') return <span className="text-gray-500 text-xs">varias divisas</span>;
    if (col.tipo === 'firma') return <span className="block border-b border-gray-500/40 h-5" />;
    return formatearCelda(col, valor, fila.divisa || divisa);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07] tabla-reporte-contenedor">
      <table className="w-full text-sm tabla-reporte">
        <thead>
          <tr className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-gray-400">
            {columnas.map((c) => {
              const activo = orden.clave === c.clave;
              const Icono = !activo ? ArrowUpDown : orden.dir === 'desc' ? ArrowDown : ArrowUp;
              return (
                <th key={c.clave} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${esNumerica(c) ? 'text-right' : 'text-left'}`}>
                  {c.tipo === 'firma' ? c.titulo : (
                    <button type="button" onClick={() => onOrdenar(c.clave)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider ${activo ? 'text-teal-300' : 'hover:text-gray-200'}`}>
                      {c.titulo}
                      <Icono className={`h-3 w-3 sin-imprimir ${activo ? '' : 'opacity-40'}`} />
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filasVista.map((f) => {
            if (f.tipoFila === 'grupo') {
              return (
                <tr key={f.clave} className="fila-grupo">
                  <td colSpan={columnas.length} className="px-3 py-2 text-xs font-bold text-teal-300 bg-teal-500/[0.07] border-t border-white/[0.06]">
                    {f.valores[0]}
                  </td>
                </tr>
              );
            }
            const estilo = f.tipoFila === 'total' ? 'fila-total font-bold bg-white/[0.06] text-white border-t-2 border-white/20'
              : f.tipoFila === 'subtotal' ? 'fila-subtotal font-semibold bg-white/[0.025] text-gray-200 border-t border-white/[0.08]'
                : 'text-gray-300 border-t border-white/[0.04] hover:bg-white/[0.02]';
            return (
              <tr key={f.clave} className={estilo}>
                {columnas.map((c, ci) => (
                  <td key={c.clave}
                    className={`px-3 py-2 align-top ${esNumerica(c) ? 'text-right tabular-nums whitespace-nowrap' : ''} ${c.tipo === 'firma' ? 'min-w-[9rem]' : ''}`}>
                    {ci === 0 && f.tipoFila !== 'dato' ? f.valores[0] : celda(c, f.valores[ci], f)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReporteTabla;
