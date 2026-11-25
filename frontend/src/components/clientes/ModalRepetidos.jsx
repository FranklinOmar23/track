import { useEffect, useMemo, useState } from 'react';
import { X, Search, UserPlus, Link2, EyeOff, Users, Star } from 'lucide-react';
import Portal from '../common/Portal';
import { fetchPosiblesClientes, crearCliente, vincularPersonasCliente } from '../../utils/api';
import { avisarExito, avisarError } from '../../utils/avisos';
import { fechaCorta } from './util';
import ModalCliente from './ModalCliente';
import { EsqueletoLista } from '../common/Esqueleto';

const POR_PAGINA = 15;

/** Un grupo: el mismo nombre en varios viajes. Se marcan las personas que sí son la misma. */
const Grupo = ({ grupo, ocupado, onCrear, onCrearConDatos, onEnlazar, onIgnorar, soloUnCliente }) => {
  const [marcadas, setMarcadas] = useState(() => new Set(grupo.personas.map((p) => p.personaId)));
  const [clienteId, setClienteId] = useState(grupo.clientes[0]?.id || null);
  const alternar = (id) => setMarcadas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...marcadas];
  const cliente = grupo.clientes.find((c) => c.id === clienteId);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden animate-fade-in-up">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">{grupo.nombre}</p>
        <span className="text-xs text-slate-500">
          {grupo.personas.length} {grupo.personas.length === 1 ? 'vez' : 'veces'} en {grupo.viajes} viaje{grupo.viajes !== 1 ? 's' : ''}
        </span>
        {grupo.clientes.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
            <Star className="h-3 w-3" /> Ya existe como cliente
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-100">
        {grupo.personas.map((p) => (
          <label key={p.personaId} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-50/60">
            <input type="checkbox" className="accent-teal-700 h-4 w-4 shrink-0" checked={marcadas.has(p.personaId)} onChange={() => alternar(p.personaId)} />
            <span className="flex-1 min-w-0 text-[13px] text-slate-800 truncate">
              <span className="font-medium">{p.viaje.nombre}</span>
              <span className="text-slate-500"> · Hab. {p.numero}{p.viaje.fechaInicio ? ` · ${fechaCorta(p.viaje.fechaInicio)}` : ''}</span>
            </span>
            {p.nombre !== grupo.nombre && <span className="text-[11px] text-slate-400 truncate max-w-[40%]">“{p.nombre}”</span>}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100">
        <button type="button" onClick={onIgnorar} className="btn btn-borde btn-sm !font-medium text-slate-500" disabled={ocupado}>
          <EyeOff className="h-3.5 w-3.5" /> No son la misma persona
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {grupo.clientes.length > 0 ? (
            <>
              {!soloUnCliente && grupo.clientes.length > 1 && (
                <select className="input-dark !h-8 !py-0 !text-xs !w-auto" value={clienteId || ''} onChange={(e) => setClienteId(Number(e.target.value))}>
                  {grupo.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}</option>)}
                </select>
              )}
              <button type="button" className="btn btn-primario btn-sm" disabled={ocupado || !ids.length} onClick={() => onEnlazar(cliente, ids)}>
                <Link2 className="h-3.5 w-3.5" /> Enlazar {ids.length} a {cliente?.nombre}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-borde btn-sm" disabled={ocupado || !ids.length} onClick={() => onCrearConDatos(ids)}>
                Con teléfono y datos…
              </button>
              <button type="button" className="btn btn-primario btn-sm" disabled={ocupado || !ids.length} onClick={() => onCrear(ids)}>
                <UserPlus className="h-3.5 w-3.5" /> Crear cliente con {ids.length}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** "Encontrar clientes repetidos": nombres que se repiten en varios viajes y aún no tienen ficha. */
const ModalRepetidos = ({ onClose, onCambios }) => {
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('');
  const [grupos, setGrupos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(null);
  const [conDatos, setConDatos] = useState(null); // { grupo, ids }
  const [ocultos, setOcultos] = useState(() => new Set());

  useEffect(() => {
    const t = setTimeout(() => setFiltro(buscar.trim()), 300);
    return () => clearTimeout(t);
  }, [buscar]);

  useEffect(() => {
    let vigente = true;
    fetchPosiblesClientes({ nombre: filtro, page: pagina, limit: POR_PAGINA })
      .then((r) => {
        if (!vigente) return;
        setGrupos((prev) => (pagina === 1 ? r.data.data : [...prev, ...r.data.data]));
        setHayMas(r.data.isThereNextPage);
      })
      .catch((e) => vigente && avisarError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [filtro, pagina]);

  const cambiarFiltro = (v) => { setBuscar(v); setPagina(1); setCargando(true); };
  const visibles = useMemo(() => grupos.filter((g) => !ocultos.has(g.clave)), [grupos, ocultos]);
  const quitar = (clave) => setOcultos((s) => new Set(s).add(clave));

  const crear = async (grupo, ids) => {
    setOcupado(grupo.clave);
    try {
      await crearCliente({ nombre: grupo.nombre, personaIds: ids });
      avisarExito(`Cliente ${grupo.nombre} creado`);
      quitar(grupo.clave);
      onCambios?.();
    } catch (e) {
      avisarError(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const enlazar = async (grupo, cliente, ids) => {
    setOcupado(grupo.clave);
    try {
      await vincularPersonasCliente(cliente.id, ids);
      avisarExito(`Enlazado a ${cliente.nombre}`);
      quitar(grupo.clave);
      onCambios?.();
    } catch (e) {
      avisarError(e.message);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="modal-card-dark w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Encontrar clientes repetidos</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Personas con el mismo nombre en varios viajes. Desmarca las que no sean la misma persona antes de enlazar.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input className="campo-buscar w-full" value={buscar} onChange={(e) => cambiarFiltro(e.target.value)}
                  placeholder="Filtrar por nombre" aria-label="Filtrar por nombre" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {cargando && <div className="rounded-xl border border-slate-200 overflow-hidden"><EsqueletoLista filas={5} /></div>}
              {!cargando && visibles.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500 mt-2">
                    {filtro ? `No hay nombres repetidos con “${filtro}”.` : 'No quedan nombres repetidos sin ficha.'}
                  </p>
                </div>
              )}
              {!cargando && visibles.map((g) => (
                <Grupo key={g.clave} grupo={g} ocupado={ocupado === g.clave}
                  onCrear={(ids) => crear(g, ids)}
                  onCrearConDatos={(ids) => setConDatos({ grupo: g, ids })}
                  onEnlazar={(cliente, ids) => enlazar(g, cliente, ids)}
                  onIgnorar={() => quitar(g.clave)} />
              ))}
              {!cargando && hayMas && (
                <button type="button" className="btn btn-borde w-full" onClick={() => setPagina((p) => p + 1)}>Ver más</button>
              )}
            </div>
          </div>
        </div>
      </div>
      {conDatos && (
        <ModalCliente nombreInicial={conDatos.grupo.nombre} personaIds={conDatos.ids}
          onClose={() => setConDatos(null)}
          onGuardado={() => { quitar(conDatos.grupo.clave); setConDatos(null); onCambios?.(); }} />
      )}
    </Portal>
  );
};

export default ModalRepetidos;
