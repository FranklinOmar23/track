import { useEffect, useState } from 'react';
import { X, Search, Link2, Plane } from 'lucide-react';
import Portal from '../common/Portal';
import { fetchPosiblesClientes, vincularPersonasCliente } from '../../utils/api';
import { avisarExito } from '../../utils/avisos';
import { fechaCorta } from './util';
import { EsqueletoLista } from '../common/Esqueleto';

/** Desde la ficha: busca personas sin cliente (por nombre) en los viajes y las enlaza a este cliente. */
const ModalEnlazarViajes = ({ cliente, onClose, onEnlazadas }) => {
  const [buscar, setBuscar] = useState(cliente.nombre);
  const [personas, setPersonas] = useState(null);
  const [marcadas, setMarcadas] = useState(() => new Set());
  const [estado, setEstado] = useState({ guardando: false, error: '' });

  useEffect(() => {
    const nombre = buscar.trim();
    let vigente = true;
    const t = setTimeout(() => {
      if (nombre.length < 3) { setPersonas([]); return; }
      fetchPosiblesClientes({ nombre, minViajes: 1, limit: 50 })
        .then((r) => {
          if (!vigente) return;
          const lista = r.data.data.flatMap((g) => g.personas);
          setPersonas(lista);
          // Se marcan solas las que se llaman exactamente igual que el cliente
          const exacto = cliente.nombre.trim().toLowerCase();
          setMarcadas(new Set(lista.filter((p) => p.nombre.replace(/\(\s*\d+\s*años?\s*\)/i, '').trim().toLowerCase() === exacto).map((p) => p.personaId)));
        })
        .catch((e) => vigente && setEstado({ guardando: false, error: e.message }));
    }, 300);
    return () => { vigente = false; clearTimeout(t); };
  }, [buscar, cliente.nombre]);

  const alternar = (id) => setMarcadas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const enlazar = async () => {
    setEstado({ guardando: true, error: '' });
    try {
      const r = await vincularPersonasCliente(cliente.id, [...marcadas]);
      avisarExito(`${r.enlazadas} viaje${r.enlazadas !== 1 ? 's' : ''} enlazado${r.enlazadas !== 1 ? 's' : ''}`);
      onEnlazadas();
    } catch (e) {
      setEstado({ guardando: false, error: e.message });
    }
  };

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="modal-card-dark w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900">Enlazar viajes</h2>
                <p className="text-sm text-slate-500 mt-0.5">Marca dónde viajó {cliente.nombre}. Solo aparecen personas que aún no tienen cliente.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input className="campo-buscar w-full" value={buscar} onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Nombre como se escribió en el viaje" aria-label="Buscar persona" autoFocus />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {personas === null ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden"><EsqueletoLista filas={4} /></div>
              ) : personas.length === 0 ? (
                <div className="text-center py-10">
                  <Plane className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500 mt-2">
                    {buscar.trim().length < 3 ? 'Escribe al menos 3 letras.' : `No hay personas sin cliente con “${buscar.trim()}”.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {personas.map((p) => (
                    <label key={p.personaId} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50/60">
                      <input type="checkbox" className="accent-teal-700 h-4 w-4 shrink-0" checked={marcadas.has(p.personaId)} onChange={() => alternar(p.personaId)} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{p.nombre}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {p.viaje.nombre} · Hab. {p.numero}{p.viaje.fechaInicio ? ` · ${fechaCorta(p.viaje.fechaInicio)}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-red-700 min-w-0" role="alert">{estado.error}</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={estado.guardando}>Cancelar</button>
                <button type="button" className="btn-modal-primary" onClick={enlazar} disabled={estado.guardando || !marcadas.size}>
                  <Link2 className="h-4 w-4" /> {estado.guardando ? 'Enlazando…' : `Enlazar ${marcadas.size || ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ModalEnlazarViajes;
