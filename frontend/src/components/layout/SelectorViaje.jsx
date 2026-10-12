import { useEffect, useMemo, useRef, useState } from 'react';
import { Plane, ChevronDown, Search, Check, Building2, Bus, Lock } from 'lucide-react';

const normalizar = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Desplegable de viajes: buscador, grupos Activos / Cerrados y navegación con teclado. */
const SelectorViaje = ({ viajes, valorId, onSeleccionar }) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const contenedor = useRef(null);
  const buscador = useRef(null);
  const lista = useRef(null);

  const actual = viajes.find((v) => v.id === valorId);

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
    setIndiceActivo(Math.max(0, viajes.filter((v) => v.estado !== 'cerrado').concat(viajes.filter((v) => v.estado === 'cerrado')).findIndex((v) => v.id === valorId)));
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

  const Icono = actual?.tipo === 'tour' ? Bus : Plane;

  return (
    <div className="relative flex-1 min-w-0" ref={contenedor}>
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={(e) => { if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); abrir(); } }}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`w-full h-10 pl-10 pr-9 rounded-xl bg-[#0f1117] border text-left text-sm font-medium text-gray-100 transition-colors truncate ${
          abierto ? 'border-teal-500/50 ring-2 ring-teal-500/10' : 'border-white/[0.08] hover:border-white/20'
        }`}
      >
        <Icono className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-400" />
        {actual ? actual.nombre : 'Seleccionar viaje'}
        {actual?.estado === 'cerrado' && <Lock className="inline h-3 w-3 ml-2 text-amber-400 -mt-0.5" />}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-40 rounded-xl overflow-hidden animate-fade-in-scale origin-top"
          style={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 18px 40px -8px rgba(0,0,0,0.6)' }}
        >
          <div className="relative border-b border-white/[0.06]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              ref={buscador}
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setIndiceActivo(0); }}
              onKeyDown={alTeclear}
              placeholder="Buscar viaje..."
              aria-label="Buscar viaje"
              className="w-full h-11 pl-10 pr-3 bg-transparent text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none"
            />
          </div>

          <ul ref={lista} role="listbox" className="max-h-72 overflow-y-auto py-1.5 scroll-fino">
            {opciones.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-600">No hay viajes con "{busqueda}"</li>
            )}
            {opciones.map((v, i) => {
              const seleccionado = v.id === valorId;
              const resaltado = i === indiceActivo;
              const IconoTipo = v.tipo === 'tour' ? Bus : Building2;
              return (
                <li key={v.id} role="option" aria-selected={seleccionado}>
                  {(i === 0 && v.estado !== 'cerrado') && (
                    <p className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Activos</p>
                  )}
                  {i === primerCerrado && (
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 border-t border-white/[0.05] mt-1">Cerrados</p>
                  )}
                  <button
                    type="button"
                    data-indice={i}
                    onClick={() => elegir(v)}
                    onMouseEnter={() => setIndiceActivo(i)}
                    className={`w-full flex items-center gap-3 px-3 mx-1.5 py-2 rounded-lg text-left transition-colors ${
                      resaltado ? 'bg-white/[0.06]' : ''
                    }`}
                    style={{ width: 'calc(100% - 0.75rem)' }}
                  >
                    <span className={`p-1.5 rounded-lg shrink-0 ${v.tipo === 'tour' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-teal-500/10 text-teal-400'}`}>
                      <IconoTipo className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate text-sm ${seleccionado ? 'text-teal-300 font-semibold' : v.estado === 'cerrado' ? 'text-gray-500' : 'text-gray-200'}`}>
                        {v.nombre}
                      </span>
                      <span className="block text-[11px] text-gray-600">
                        {v.tipo === 'tour' ? 'Tour' : 'Resort'} · {v.divisa || 'USD'}
                        {v.fechaInicio ? ` · ${v.fechaInicio}` : ''}
                      </span>
                    </span>
                    {v.estado === 'cerrado' && <Lock className="h-3.5 w-3.5 text-amber-500/70 shrink-0" />}
                    {seleccionado && <Check className="h-4 w-4 text-teal-400 shrink-0" />}
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
