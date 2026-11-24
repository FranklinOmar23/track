import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, Home, Bus, Lock } from 'lucide-react';

const normalizar = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Botón "Cambiar viaje" con desplegable: buscador, grupos Activos / Cerrados y navegación con teclado. */
const SelectorViaje = ({ viajes, valorId, onSeleccionar }) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const contenedor = useRef(null);
  const buscador = useRef(null);
  const lista = useRef(null);

  // Lista plana (para el teclado) ya filtrada: activos primero, luego cerrados
  const opciones = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const filtrados = viajes.filter((v) => !q || normalizar(v.nombre).includes(q));
    return [
      ...filtrados.filter((v) => v.estado !== 'cerrado'),
      ...filtrados.filter((v) => v.estado === 'cerrado'),
    ];
  }, [viajes, busqueda]);
  const primerCerrado = opciones.findIndex((v) => v.estado === 'cerrado');

  const abrir = () => {
    setBusqueda('');
    const ordenados = [...viajes.filter((v) => v.estado !== 'cerrado'), ...viajes.filter((v) => v.estado === 'cerrado')];
    setIndiceActivo(Math.max(0, ordenados.findIndex((v) => v.id === valorId)));
    setAbierto(true);
  };
  const cerrar = () => setAbierto(false);
  const elegir = (viaje) => {
    cerrar();
    if (viaje && viaje.id !== valorId) onSeleccionar(viaje);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return undefined;
    const alClic = (e) => { if (!contenedor.current?.contains(e.target)) cerrar(); };
    document.addEventListener('mousedown', alClic);
    buscador.current?.focus();
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  // Mantener visible la opción resaltada
  useEffect(() => {
    if (!abierto) return;
    lista.current?.querySelector(`[data-indice="${indiceActivo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [indiceActivo, abierto]);

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceActivo((i) => Math.min(opciones.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceActivo((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(opciones[indiceActivo]); }
    else if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={(e) => { if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); abrir(); } }}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border bg-white text-xs font-medium text-slate-700 transition-colors ${
          abierto ? 'border-teal-600 ring-2 ring-teal-600/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        Cambiar viaje
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[min(340px,calc(100vw-2rem))] rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xl animate-fade-in-scale origin-top-left">
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={buscador}
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setIndiceActivo(0); }}
              onKeyDown={alTeclear}
              placeholder="Buscar viaje..."
              aria-label="Buscar viaje"
              className="w-full h-11 pl-10 pr-3 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <ul ref={lista} role="listbox" className="max-h-72 overflow-y-auto py-1.5 scroll-fino">
            {opciones.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">No hay viajes con “{busqueda}”</li>
            )}
            {opciones.map((v, i) => {
              const seleccionado = v.id === valorId;
              const IconoTipo = v.tipo === 'tour' ? Bus : Home;
              return (
                <li key={v.id} role="option" aria-selected={seleccionado}>
                  {(i === 0 && v.estado !== 'cerrado') && (
                    <p className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Activos</p>
                  )}
                  {i === primerCerrado && (
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 mt-1">Cerrados</p>
                  )}
                  <button
                    type="button"
                    data-indice={i}
                    onClick={() => elegir(v)}
                    onMouseEnter={() => setIndiceActivo(i)}
                    className={`flex items-center gap-3 px-3 mx-1.5 py-2 rounded-lg text-left transition-colors ${i === indiceActivo ? 'bg-slate-100' : ''}`}
                    style={{ width: 'calc(100% - 0.75rem)' }}
                  >
                    <span className={`p-1.5 rounded-lg shrink-0 ${v.tipo === 'tour' ? 'etiqueta-tour' : 'etiqueta-resort'}`}>
                      <IconoTipo className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate text-sm ${seleccionado ? 'text-teal-700 font-semibold' : v.estado === 'cerrado' ? 'text-slate-500' : 'text-slate-800'}`}>
                        {v.nombre}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {v.tipo === 'tour' ? 'Tour' : 'Resort'} · {v.divisa || 'USD'}
                        {v.fechaInicio ? ` · ${String(v.fechaInicio).slice(0, 10)}` : ''}
                      </span>
                    </span>
                    {v.estado === 'cerrado' && <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                    {seleccionado && <Check className="h-4 w-4 text-teal-700 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectorViaje;
