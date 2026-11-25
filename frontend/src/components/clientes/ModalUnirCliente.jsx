import { useEffect, useState } from 'react';
import { X, Search, Star, Merge, ArrowLeft } from 'lucide-react';
import Portal from '../common/Portal';
import { fetchClientes, unirClientes } from '../../utils/api';
import { avisarExito } from '../../utils/avisos';
import { iniciales } from './util';

/** Las dos primeras palabras del nombre: así salen primero las fichas parecidas. */
const busquedaInicial = (nombre = '') => nombre.trim().split(/\s+/).slice(0, 2).join(' ');

/** Junta otra ficha de la misma persona con esta: sus viajes pasan aquí y la otra se borra. */
const ModalUnirCliente = ({ cliente, onClose, onUnidos }) => {
  const [texto, setTexto] = useState(busquedaInicial(cliente.nombre));
  const [resultados, setResultados] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [estado, setEstado] = useState({ guardando: false, error: '' });

  useEffect(() => {
    const q = texto.trim();
    let vigente = true;
    const t = setTimeout(() => {
      fetchClientes(q ? { q, limit: 10 } : { limit: 10 })
        .then((r) => vigente && setResultados(r.data.data.filter((c) => c.id !== cliente.id)))
        .catch((e) => vigente && setEstado({ guardando: false, error: e.message }));
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [texto, cliente.id]);

  const unir = async () => {
    setEstado({ guardando: true, error: '' });
    try {
      const r = await unirClientes(cliente.id, elegido.id);
      avisarExito(`${elegido.nombre} unido a ${cliente.nombre}`);
      onUnidos(r);
    } catch (e) {
      setEstado({ guardando: false, error: e.message });
    }
  };

  // Datos que esta ficha no tiene y se tomarán de la otra
  const ganados = elegido ? [
    ['telefono', 'teléfono'], ['whatsapp', 'WhatsApp'], ['correo', 'correo'], ['documento', 'cédula'],
    ['fechaNacimiento', 'nacimiento'], ['ciudad', 'ciudad'], ['direccion', 'dirección'],
  ].filter(([k]) => !cliente[k] && elegido[k]).map(([, l]) => l) : [];

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="modal-card-dark w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">Unir con otra ficha</h2>
                <p className="text-sm text-slate-500 mt-0.5">Si {cliente.nombre} tiene otra ficha, júntalas en esta.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {!elegido ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input className="campo-buscar w-full" value={texto} onChange={(e) => setTexto(e.target.value)}
                      placeholder="Buscar por nombre, teléfono o cédula" autoFocus aria-label="Buscar cliente" />
                  </div>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {resultados === null && <p className="text-sm text-slate-400 text-center py-6">Buscando…</p>}
                    {resultados?.length === 0 && <p className="text-sm text-slate-500 text-center py-6 px-4">No hay otras fichas con “{texto}”.</p>}
                    {resultados?.map((c) => (
                      <button type="button" key={c.id} onClick={() => setElegido(c)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50">
                        <span className="h-8 w-8 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">{iniciales(c.nombre)}</span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1 text-sm font-semibold text-slate-900 truncate">
                            {c.nombre} {c.esFijo && <Star className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />}
                          </span>
                          <span className="block text-[11px] text-slate-500 truncate">
                            {[c.telefono || c.documento, `${c.resumen.viajes} viaje${c.resumen.viajes !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3 animate-fade-in-up">
                  <button type="button" onClick={() => setElegido(null)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="h-3.5 w-3.5" /> Elegir otra
                  </button>
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                    <p>
                      Los <strong>{elegido.resumen.viajes} viaje{elegido.resumen.viajes !== 1 ? 's' : ''}</strong> de <strong>{elegido.nombre}</strong> pasan
                      a <strong>{cliente.nombre}</strong>.
                    </p>
                    {ganados.length > 0 && <p>Se copian a esta ficha: {ganados.join(', ')}.</p>}
                    {elegido.notas && <p>Sus notas se añaden a las de esta ficha.</p>}
                    <p className="text-slate-500">La ficha de {elegido.nombre} se borra. Puedes deshacerlo desde Actividad.</p>
                  </div>
                </div>
              )}
              {estado.error && <p className="text-sm text-red-700" role="alert">{estado.error}</p>}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={estado.guardando}>Cancelar</button>
              <button type="button" className="btn-modal-primary" onClick={unir} disabled={!elegido || estado.guardando}>
                <Merge className="h-4 w-4" /> {estado.guardando ? 'Uniendo…' : 'Unir fichas'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ModalUnirCliente;
