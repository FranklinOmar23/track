import { useEffect, useState } from 'react';
import { X, Search, Star, UserPlus, Link2 } from 'lucide-react';
import Portal from '../common/Portal';
import { fetchClientes, vincularPersonasCliente } from '../../utils/api';
import { avisarExito } from '../../utils/avisos';
import ModalCliente from './ModalCliente';

const sinEdad = (n = '') => n.replace(/\(\s*\d+\s*años?\s*\)/i, '').trim();

/** Enlaza una persona de una habitación con un cliente existente, o le crea su ficha. */
const ModalEnlazarPersona = ({ persona, onClose, onEnlazada }) => {
  const [texto, setTexto] = useState(sinEdad(persona.n));
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState('');
  const [enlazando, setEnlazando] = useState(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const q = texto.trim();
    const t = setTimeout(() => {
      fetchClientes(q ? { q, limit: 8 } : { limit: 8 })
        .then((r) => setResultados(r.data.data))
        .catch((e) => setError(e.message));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [texto]);

  const enlazar = async (cliente) => {
    setEnlazando(cliente.id);
    setError('');
    try {
      await vincularPersonasCliente(cliente.id, [persona.id]);
      avisarExito(`${persona.n} enlazado con ${cliente.nombre}`);
      onEnlazada(cliente);
    } catch (e) {
      setError(e.message);
      setEnlazando(null);
    }
  };

  if (creando) {
    return (
      <ModalCliente nombreInicial={sinEdad(persona.n)} personaIds={[persona.id]}
        onClose={() => setCreando(false)} onGuardado={(c) => onEnlazada(c)} />
    );
  }

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="modal-card-dark w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">Enlazar con un cliente</h2>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{persona.n}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input className="campo-buscar w-full" value={texto} onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o cédula" autoFocus aria-label="Buscar cliente" />
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {resultados === null && <p className="text-sm text-slate-400 text-center py-6">Buscando…</p>}
                {resultados?.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6 px-4">No hay clientes con “{texto}”. Puedes crear su ficha.</p>
                )}
                {resultados?.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="h-8 w-8 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {c.nombre.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1 text-sm font-semibold text-slate-900 truncate">
                        {c.nombre} {c.esFijo && <Star className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {[c.telefono || c.documento, `${c.resumen.viajes} viaje${c.resumen.viajes !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button type="button" className="btn btn-borde btn-sm" disabled={enlazando !== null} onClick={() => enlazar(c)}>
                      <Link2 className="h-3.5 w-3.5" /> {enlazando === c.id ? 'Enlazando…' : 'Enlazar'}
                    </button>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">¿No está en la lista?</p>
              <button type="button" className="btn-modal-primary" onClick={() => setCreando(true)}>
                <UserPlus className="h-4 w-4" /> Crear ficha nueva
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ModalEnlazarPersona;
