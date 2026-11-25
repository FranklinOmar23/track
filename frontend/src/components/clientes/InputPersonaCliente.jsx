import { useEffect, useRef, useState } from 'react';
import { Contact, Star, X } from 'lucide-react';
import { fetchClientes } from '../../utils/api';
import { useAuthContext } from '../../Context/AuthContext';
import { montosPorDivisa } from './util';

/**
 * Campo de nombre de una persona con sugerencias de clientes.
 * Al elegir un cliente, la persona queda enlazada a su ficha (clienteId). Si después se
 * cambia el nombre a mano, el enlace se quita. Sin permiso de ver clientes es un input normal.
 */
const InputPersonaCliente = ({ value, clienteId, onChange, placeholder, className = '', disabled, autoFocus, sinQuitar = false }) => {
  const { puede } = useAuthContext();
  const conClientes = puede('clientes');
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const ref = useRef(null);
  const ultimaBusqueda = useRef('');

  // Busca mientras se escribe (con una pausa corta para no consultar en cada tecla)
  useEffect(() => {
    const texto = value.trim();
    if (!conClientes || clienteId || texto.length < 2) return undefined;
    const t = setTimeout(() => {
      ultimaBusqueda.current = texto;
      fetchClientes({ q: texto, limit: 6 })
        .then((r) => {
          if (ultimaBusqueda.current !== texto) return;
          setSugerencias(r.data.data);
          setActivo(0);
        })
        .catch(() => setSugerencias([]));
    }, 250);
    return () => clearTimeout(t);
  }, [value, clienteId, conClientes]);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const elegir = (c) => {
    onChange(c.nombre, c.id);
    setAbierto(false);
    setSugerencias([]);
  };

  const alTeclear = (e) => {
    if (!abierto || !sugerencias.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => (i + 1) % sugerencias.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => (i - 1 + sugerencias.length) % sugerencias.length); }
    if (e.key === 'Enter') { e.preventDefault(); elegir(sugerencias[activo]); }
    if (e.key === 'Escape') setAbierto(false);
  };

  const mostrar = abierto && !clienteId && value.trim().length >= 2 && sugerencias.length > 0;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input className={`input-dark w-full ${clienteId ? (sinQuitar ? '!pr-20' : '!pr-24') : ''}`} type="text" value={value} disabled={disabled} autoFocus={autoFocus}
        placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={mostrar} aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value, null); setAbierto(true); }}
        onFocus={() => setAbierto(true)} onKeyDown={alTeclear} />

      {clienteId && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <Contact className="h-3 w-3" /> Cliente
          {!disabled && !sinQuitar && (
            <button type="button" onClick={() => onChange(value, null)} aria-label="Quitar enlace con el cliente"
              className="p-0.5 rounded-full hover:bg-teal-100"><X className="h-3 w-3" /></button>
          )}
        </span>
      )}

      {mostrar && (
        <ul role="listbox" className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-fade-in-scale origin-top">
          <li className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400">CLIENTES</li>
          {sugerencias.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === activo}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(c)} onMouseEnter={() => setActivo(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === activo ? 'bg-slate-50' : ''}`}>
                <span className="h-7 w-7 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-slate-900 truncate">
                    {c.nombre} {c.esFijo && <Star className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {[c.telefono || c.whatsapp, `${c.resumen.viajes} viaje${c.resumen.viajes !== 1 ? 's' : ''}`,
                      c.resumen.conDeuda ? `debe ${montosPorDivisa(c.resumen.totales, 'pendiente')}` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 text-[11px] text-slate-400 border-t border-slate-100">Elige uno para enlazarlo, o sigue escribiendo para una persona nueva</li>
        </ul>
      )}
    </div>
  );
};

export default InputPersonaCliente;
