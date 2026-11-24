import { useMemo, useState } from 'react';
import { X, Search, GripVertical, ArrowRight, ArrowLeft, Tag, ChevronLeft, Loader2, Users } from 'lucide-react';
import { CheckAnimado } from '../common/AvisosExito';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { capacidadPorTipo, contarAdultos } from '../../utils/calculos';

const normalizar = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esNino = (p) => p.esNino || /\(\d+ años?\)/.test(p.n || '');
const TIPO_SIGUIENTE = { Single: 'Doble', Doble: 'Triple' };

/** ¿Puede la habitación recibir a alguien? (misma regla que el servidor: si está llena, sube de tipo). */
const infoCupo = (hab) => {
  const ocupados = contarAdultos(hab);
  const capacidad = capacidadPorTipo(hab.tipo);
  return {
    ocupados,
    capacidad,
    acepta: ocupados <= capacidad,
    llena: ocupados >= capacidad,
    pasaA: ocupados >= capacidad ? (TIPO_SIGUIENTE[hab.tipo] || hab.tipo) : null,
  };
};

/** Tarjeta arrastrable de una persona. */
const TarjetaPersona = ({ persona, lado, destacada, moviendo, onArrastrar, onMoverClic, puedeMover, titular, recien }) => (
  <div
    draggable={puedeMover && !moviendo}
    onDragStart={(e) => {
      e.dataTransfer.setData('text/plain', String(persona.id));
      e.dataTransfer.effectAllowed = 'move';
      onArrastrar(persona.id, lado);
    }}
    onDragEnd={() => onArrastrar(null, null)}
    className={`group flex items-center gap-2.5 p-2.5 rounded-xl border bg-white transition-all select-none ${
      puedeMover && !moviendo ? 'cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-sm' : ''
    } ${destacada ? 'border-teal-600 ring-2 ring-teal-600/15' : 'border-slate-200'} ${moviendo ? 'opacity-50' : ''} ${recien ? 'destello-exito' : ''}`}
  >
    <GripVertical className={`h-4 w-4 shrink-0 ${puedeMover ? 'text-slate-400' : 'text-slate-200'}`} />
    <span className={`h-8 w-8 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center shrink-0 ${titular ? 'avatar-titular' : ''}`}
      title={titular ? 'Titular de la habitación' : undefined}>
      {persona.n?.charAt(0).toUpperCase()}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-medium text-slate-900 truncate">{persona.n}</span>
      <span className="flex gap-1 mt-0.5">
        {titular && <span className="text-[10px] font-semibold px-1.5 rounded-full leading-4" style={{ background: '#fbf1d3', color: '#8a5a00' }}>titular</span>}
        {esNino(persona) && <span className="text-[10px] font-semibold px-1.5 rounded-full bg-amber-50 text-amber-800 leading-4">niño</span>}
        {persona.esStack && <span className="text-[10px] font-semibold px-1.5 rounded-full bg-violet-50 text-violet-700 leading-4">stack</span>}
        {(persona.pagos?.length || 0) > 0 && (
          <span className="text-[10px] text-slate-500 leading-4">{persona.pagos.length} pago{persona.pagos.length !== 1 ? 's' : ''}</span>
        )}
      </span>
    </span>
    {moviendo ? (
      <Loader2 className="h-4 w-4 text-teal-700 animate-spin shrink-0" />
    ) : puedeMover && (
      // Alternativa al arrastre (pantallas táctiles y teclado)
      <button type="button" onClick={onMoverClic} title={lado === 'origen' ? 'Mover a la habitación destino' : 'Regresar a la habitación de origen'}
        aria-label={`Mover a ${persona.n} a la otra habitación`}
        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 transition-colors shrink-0">
        {lado === 'origen' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
      </button>
    )}
  </div>
);

/** Panel de una habitación que recibe personas soltadas. */
const PanelHabitacion = ({ titulo, hab, lado, arrastre, onSoltar, children, accion }) => {
  const [encima, setEncima] = useState(false);
  const cupo = hab ? infoCupo(hab) : null;
  // Se puede soltar aquí si se arrastra desde el otro panel
  const recibe = arrastre.personaId && arrastre.lado && arrastre.lado !== lado;
  const valido = recibe && cupo?.acepta;

  return (
    <div
      onDragOver={(e) => { if (recibe) { e.preventDefault(); e.dataTransfer.dropEffect = valido ? 'move' : 'none'; setEncima(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEncima(false); }}
      onDrop={(e) => { e.preventDefault(); setEncima(false); if (valido) onSoltar(lado); }}
      className={`flex flex-col min-h-[340px] rounded-2xl border-2 transition-colors ${
        encima && valido ? 'border-teal-600 bg-teal-50/60'
          : encima && !valido ? 'border-red-300 bg-red-50/50'
            : recibe ? 'border-dashed border-teal-400 bg-white' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <p className="label-mayus">{titulo}</p>
          {hab && (
            <>
              <p className="text-lg font-bold text-slate-900 mt-0.5">Hab. {hab.num} <span className="text-sm font-medium text-slate-500">· {hab.tipo}</span></p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Users className="h-3.5 w-3.5" /> {cupo.ocupados}/{cupo.capacidad} adultos
                {hab.etiqueta && <><span className="text-slate-300">·</span><Tag className="h-3 w-3" /> {hab.etiqueta}</>}
              </p>
            </>
          )}
        </div>
        {accion}
      </div>
      <div className="flex-1 px-4 pb-4">
        {children}
        {recibe && (
          <div className={`mt-2.5 rounded-xl border-2 border-dashed py-4 text-center text-xs font-medium ${
            valido ? 'border-teal-300 text-teal-700' : 'border-red-200 text-red-700'
          }`}>
            {valido
              ? cupo.pasaA && cupo.pasaA !== hab.tipo ? `Suelta aquí · la habitación pasará a ${cupo.pasaA}` : 'Suelta aquí para mover'
              : 'Esta habitación no tiene espacio'}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Mover personas entre habitaciones: a la izquierda la habitación de origen, a la derecha
 * se busca la de destino. Las personas se arrastran de un lado a otro (o con el botón de flecha).
 */
const ModalMoverPersona = ({ habOrigen, persona, onClose }) => {
  const { state, moverPersona } = useHabitacionesContext();
  const [destinoId, setDestinoId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [arrastre, setArrastre] = useState({ personaId: null, lado: null });
  const [moviendoId, setMoviendoId] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState('');
  const [recienId, setRecienId] = useState(null);

  const origen = state.habitaciones.find((h) => h.id === habOrigen);
  const destino = state.habitaciones.find((h) => h.id === destinoId);
  const personasDe = (hab) => (hab?.personas || []).filter((p) => p.n);

  const candidatas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return state.habitaciones
      .filter((h) => h.id !== habOrigen)
      .filter((h) => !q || normalizar(`${h.num} ${h.tipo} ${h.etiqueta || ''} ${h.personas.map((p) => p.n).join(' ')}`).includes(q))
      .sort((a, b) => String(a.num).localeCompare(String(b.num), undefined, { numeric: true }));
  }, [state.habitaciones, habOrigen, busqueda]);

  const mover = async (personaId, haciaLado) => {
    const habDestino = haciaLado === 'destino' ? destino : origen;
    const habDesde = haciaLado === 'destino' ? origen : destino;
    const p = personasDe(habDesde).find((x) => x.id === personaId);
    if (!p || !habDestino) return;
    if (!infoCupo(habDestino).acepta) { setError(`La Hab. ${habDestino.num} no tiene espacio.`); return; }
    setError('');
    setMoviendoId(personaId);
    try {
      await moverPersona(personaId, habDestino.id);
      setMovimientos((m) => [{ id: `${personaId}-${Date.now()}`, texto: `${p.n} → Hab. ${habDestino.num}` }, ...m]);
      setRecienId(personaId);
      setTimeout(() => setRecienId((r) => (r === personaId ? null : r)), 1200);
    } catch (e) {
      setError(`No se pudo mover a ${p.n}: ${e.message}`);
    } finally {
      setMoviendoId(null);
      setArrastre({ personaId: null, lado: null });
    }
  };

  const onArrastrar = (personaId, lado) => setArrastre({ personaId, lado });
  const onSoltar = (ladoDestino) => mover(arrastre.personaId, ladoDestino);

  const listaPersonas = (hab, lado) => {
    const personas = personasDe(hab);
    if (!personas.length) return <p className="text-sm text-slate-400 italic py-6 text-center">Sin personas</p>;
    return (
      <div className="space-y-2">
        {personas.map((p, i) => (
          <TarjetaPersona key={p.id} persona={p} lado={lado} titular={i === 0} recien={recienId === p.id}
            destacada={p.id === persona?.id}
            moviendo={moviendoId === p.id}
            puedeMover={lado === 'origen' ? !!destino : true}
            onArrastrar={onArrastrar}
            onMoverClic={() => mover(p.id, lado === 'origen' ? 'destino' : 'origen')} />
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay-dark" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal-card-dark w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Mover personas</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {destino
                  ? 'Arrastra a una persona de un lado al otro (o usa el botón de flecha).'
                  : 'Busca y elige la habitación de destino.'}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origen */}
              <PanelHabitacion titulo="Habitación de origen" hab={origen} lado="origen" arrastre={arrastre} onSoltar={onSoltar}>
                {listaPersonas(origen, 'origen')}
                {!destino && personasDe(origen).length > 0 && (
                  <p className="text-xs text-slate-500 mt-3">Elige la habitación de destino para poder mover.</p>
                )}
              </PanelHabitacion>

              {/* Destino */}
              {destino ? (
                <PanelHabitacion titulo="Habitación de destino" hab={destino} lado="destino" arrastre={arrastre} onSoltar={onSoltar}
                  accion={(
                    <button type="button" onClick={() => setDestinoId(null)} className="btn btn-borde btn-sm shrink-0">
                      <ChevronLeft className="h-3.5 w-3.5" /> Cambiar
                    </button>
                  )}>
                  {listaPersonas(destino, 'destino')}
                </PanelHabitacion>
              ) : (
                <div className="flex flex-col min-h-[340px] rounded-2xl border-2 border-slate-200">
                  <div className="px-4 pt-4 pb-3">
                    <p className="label-mayus">Habitación de destino</p>
                    <div className="relative mt-2">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} autoFocus
                        placeholder="Número, centro o persona..." aria-label="Buscar habitación de destino"
                        className="campo-buscar" />
                    </div>
                  </div>
                  <ul className="flex-1 overflow-y-auto max-h-[46vh] px-2 pb-2 scroll-fino">
                    {candidatas.map((h) => {
                      const cupo = infoCupo(h);
                      const nombres = personasDe(h).map((p) => p.n.split(' ')[0]).join(', ');
                      return (
                        <li key={h.id}>
                          <button type="button" disabled={!cupo.acepta} onClick={() => setDestinoId(h.id)}
                            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors disabled:opacity-45 disabled:cursor-not-allowed">
                            <span className="h-10 w-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-slate-900 leading-none">{h.num}</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">{h.tipo}</span>
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-slate-800 truncate">{nombres || <span className="italic text-slate-400">Vacía</span>}</span>
                              <span className="block text-xs text-slate-500 truncate">
                                {h.etiqueta || 'Sin centro'}
                              </span>
                            </span>
                            <span className={`etiqueta-tipo shrink-0 ${
                              !cupo.acepta ? 'bg-red-50 text-red-700' : cupo.llena ? 'etiqueta-ambar' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {!cupo.acepta ? 'Sin espacio' : cupo.llena ? `Llena → ${cupo.pasaA}` : `${cupo.ocupados}/${cupo.capacidad}`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    {candidatas.length === 0 && (
                      <li className="text-sm text-slate-400 text-center py-10">No hay habitaciones con “{busqueda}”</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>
            )}

            {movimientos.length > 0 && (
              <div className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-200 px-4 py-3">
                {movimientos.map((m) => (
                  <p key={m.id} className="flex items-center gap-2.5 py-0.5 text-sm text-emerald-800 aviso-entrada">
                    <CheckAnimado tamano={18} /> {m.texto}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end px-5 sm:px-6 py-4 border-t border-slate-100">
            <button type="button" className="btn-modal-primary" onClick={onClose}>
              {movimientos.length ? 'Listo' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalMoverPersona;
