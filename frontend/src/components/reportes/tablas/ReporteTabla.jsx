import { useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { formatearCelda, armarFilas, esNumerica } from './tablaReporte';

/** Tabla de reporte: orden por columna, grupos con subtotales y total general. */
const ReporteTabla = ({ columnas, filas, agruparPor, divisa, orden, onOrdenar }) => {
  const filasVista = useMemo(() => armarFilas({ columnas, filas, agruparPor, orden }), [columnas, filas, agruparPor, orden]);

  if (!filas.length) {
    return <p className="text-center text-sm text-slate-500 py-14 sin-imprimir-vacio">No hay datos para estos filtros.</p>;
  }

  const celda = (col, valor, fila) => {
    if (valor === 'varias') return <span className="text-slate-500 text-xs">varias divisas</span>;
    if (col.tipo === 'firma') return <span className="block border-b border-slate-200 h-5" />;
    return formatearCelda(col, valor, fila.divisa || divisa);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 tabla-reporte-contenedor">
      <table className="w-full text-sm tabla-reporte">
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            {columnas.map((c) => {
              const activo = orden.clave === c.clave;
              const Icono = !activo ? ArrowUpDown : orden.dir === 'desc' ? ArrowDown : ArrowUp;
              return (
                <th key={c.clave} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${esNumerica(c) ? 'text-right' : 'text-left'}`}>
                  {c.tipo === 'firma' ? c.titulo : (
                    <button type="button" onClick={() => onOrdenar(c.clave)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider ${activo ? 'text-teal-700' : 'hover:text-slate-900'}`}>
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
                  <td colSpan={columnas.length} className="px-3 py-2 text-xs font-bold text-teal-700 bg-teal-50 border-t border-slate-200">
                    {f.valores[0]}
                  </td>
                </tr>
              );
            }
            const estilo = f.tipoFila === 'total' ? 'fila-total font-bold bg-slate-100 text-slate-900 border-t-2 border-slate-200'
              : f.tipoFila === 'subtotal' ? 'fila-subtotal font-semibold bg-slate-50 text-slate-800 border-t border-slate-200'
                : 'text-slate-700 border-t border-slate-200 hover:bg-slate-100';
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
