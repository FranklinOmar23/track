import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, UserRound, UserX, ChevronDown, Check, PencilLine } from 'lucide-react';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const fechaCorta = (f) => (f ? new Date(f).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }) : '');

/**
 * Elegir la persona de la penalidad: las que siguen en el viaje o las que se eliminaron.
 * `valor` = { personaId, nombre, habitacion, estado } · `onCambiar(valor)`.
 * También permite escribir un nombre a mano (sin asociar a nadie del sistema).
 */
const SelectorPersona = ({ viajeNombre, vigentes, eliminadas, cargandoEliminadas, valor, onCambiar }) => {
  const [abierto, setAbierto] = useState(!valor?.nombre);
  const [pestana, setPestana] = useState(valor?.estado === 'eliminada' ? 'eliminadas' : 'vigentes');
  const [busqueda, setBusqueda] = useState('');
  const buscador = useRef(null);

  useEffect(() => { if (abierto) buscador.current?.focus(); }, [abierto, pestana]);

  const lista = pestana === 'vigentes' ? vigentes : eliminadas;
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda);
    const base = q ? lista.filter((p) => normalizar(p.nombre).includes(q) || normalizar(p.habitacion) === q) : lista;
    return [...base].sort((a, b) => String(a.habitacion).localeCompare(String(b.habitacion), 'es', { numeric: true }) || a.nombre.localeCompare(b.nombre));
  }, [lista, busqueda]);

  const elegir = (p, estado) => {
    onCambiar({ personaId: p.id, nombre: p.nombre, nombreOriginal: p.nombre, habitacion: p.habitacion, estado });
    setAbierto(false);
    setBusqueda('');
  };

  const usarTexto = () => {
    onCambiar({ personaId: null, nombre: busqueda.trim(), habitacion: valor?.habitacion || '', estado: null });
    setAbierto(false);
    setBusqueda('');
  };

  // Cerrado: la persona elegida
  if (!abierto) {
    const eliminada = valor?.estado === 'eliminada';
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left hover:border-slate-300 transition-colors">
        <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${eliminada ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
          {eliminada ? <UserX className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-900 truncate">{valor?.nombre || 'Elegir persona'}</span>
          <span className="block text-xs text-slate-500">
            {valor?.habitacion ? `Hab. ${valor.habitacion}` : 'Sin habitación'}
            {valor?.estado === 'vigente' && ' · En el viaje'}
            {eliminada && <span className="text-red-700 font-medium"> · Eliminada del viaje</span>}
            {valor?.nombre && !valor?.personaId && ' · Escrita a mano'}
            {valor?.personaId && valor?.nombreOriginal && valor.nombreOriginal !== valor.nombre && ` · Asociada a ${valor.nombreOriginal}`}
          </span>
        </span>
        <span className="text-xs font-semibold text-teal-700 shrink-0">Cambiar</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden aparecer" style={{ boxShadow: '0 10px 30px -14px rgba(15,23,42,0.25)' }}>
      {/* Pestañas */}
      <div className="flex items-center gap-1 p-1.5 border-b border-slate-100 bg-slate-50/70">
        {[
          { id: 'vigentes', label: 'En el viaje', n: vigentes.length, icono: UserRound },
          { id: 'eliminadas', label: 'Eliminadas', n: eliminadas.length, icono: UserX },
        ].map((t) => (
          <button key={t.id} type="button" onClick={() => setPestana(t.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-colors ${
              pestana === t.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'
            }`}>
            <t.icono className="h-3.5 w-3.5" /> {t.label}
            <span className={`tabular-nums ${pestana === t.id ? 'text-slate-500' : 'text-slate-400'}`}>{t.id === 'eliminadas' && cargandoEliminadas ? '…' : t.n}</span>
          </button>
        ))}
        {valor?.nombre && (
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar lista"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white">
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative border-b border-slate-100">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input ref={buscador} value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (filtradas.length === 1) elegir(filtradas[0], pestana === 'vigentes' ? 'vigente' : 'eliminada'); }
            if (e.key === 'Escape' && valor?.nombre) { e.stopPropagation(); setAbierto(false); }
          }}
          placeholder="Buscar por nombre o número de habitación"
          className="w-full h-11 pl-10 pr-9 text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400" />
        {busqueda && (
          <button type="button" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>

      {/* Lista */}
      <div className="max-h-64 overflow-y-auto scroll-fino py-1">
        {pestana === 'eliminadas' && cargandoEliminadas ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Buscando personas eliminadas…</p>
        ) : filtradas.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {busqueda ? 'Nadie coincide con la búsqueda' : pestana === 'vigentes' ? 'No hay personas en el viaje' : 'No se ha eliminado a nadie de este viaje'}
          </p>
        ) : filtradas.map((p) => {
          const elegida = valor?.personaId === p.id;
          return (
            <button key={p.id} type="button" onClick={() => elegir(p, pestana === 'vigentes' ? 'vigente' : 'eliminada')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors ${elegida ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
              <span className="min-w-[3.25rem] h-7 px-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center justify-center tabular-nums shrink-0">
                {p.habitacion || '—'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-slate-900 truncate">{p.nombre}</span>
                {pestana === 'eliminadas' && (
                  <span className="block text-[11px] text-slate-500">
                    Salió de {viajeNombre} · Hab. {p.habitacion} · {fechaCorta(p.eliminadoAt)}{p.eliminadoPor ? ` por ${p.eliminadoPor}` : ''}
                  </span>
                )}
              </span>
              {elegida && <Check className="h-4 w-4 text-teal-700 shrink-0" />}
            </button>
          );
        })}
      </div>

      {busqueda.trim() && (
        <button type="button" onClick={usarTexto}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 border-t border-slate-100 text-left text-sm text-slate-700 hover:bg-slate-50">
          <PencilLine className="h-4 w-4 text-slate-400" />
          Usar «<span className="font-semibold text-slate-900 truncate">{busqueda.trim()}</span>» sin asociar
        </button>
      )}
    </div>
  );
};

export default SelectorPersona;
