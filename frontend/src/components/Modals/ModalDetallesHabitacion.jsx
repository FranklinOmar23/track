import { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useDivisa } from '../../hooks/useDivisa';
import { calcularTotalPagado, calcularCuotaPersona } from '../../utils/calculos';
import ModalRegistrarPago from './ModalRegistrarPago';
import ModalMoverPersona from './ModalMoverPersona';
import ModalEditarHabitacion from './ModalEditarHabitacion';
import PersonaDetalle from './PersonaDetalle';
import RevisionHabitacion, { BotonRevision } from './RevisionHabitacion';
import { X, Pencil, Trash2, Tag, Crown } from 'lucide-react';
import { avisarError } from '../../utils/avisos';

/** Caja de total (Total / Recaudado / Pendiente). */
/** Fila de total (Total / Recaudado / Pendiente): etiqueta a la izquierda, monto completo a la derecha. */
const CajaTotal = ({ label, value, tono }) => {
  const estilos = {
    neutro: { fila: 'bg-slate-50 border-slate-200', texto: 'text-slate-900', etiqueta: 'text-slate-600' },
    verde: { fila: 'bg-emerald-50/70 border-emerald-200', texto: 'text-emerald-700', etiqueta: 'text-emerald-800' },
    rojo: { fila: 'bg-red-50/70 border-red-200', texto: 'text-red-700', etiqueta: 'text-red-800' },
  }[tono];
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${estilos.fila}`}>
      <span className={`text-[13px] ${estilos.etiqueta}`}>{label}</span>
      <span className={`text-lg font-bold tabular-nums whitespace-nowrap ${estilos.texto}`}>{value}</span>
    </div>
  );
};

const ModalDetallesHabitacion = ({ habitacion: habitacionProp, onClose }) => {
  const { actualizarNota, actualizarEtiqueta, eliminarHabitacion, cambiarTitular, state, soloLectura, puedePagar } = useHabitacionesContext();
  const { fmt } = useDivisa();

  const habitacion = state.habitaciones.find((h) => h.id === habitacionProp.id) || habitacionProp;
  const viaje = state.viajes.find((v) => v.id === state.selectedViajeId);

  const [nota, setNota]                       = useState(habitacion.nota || '');
  const [etiqueta, setEtiqueta]               = useState(habitacion.etiqueta || '');
  const [etiquetaPersonalizada, setEtiquetaPersonalizada] = useState('');
  const [modalPago, setModalPago]             = useState(null);
  const [modalMover, setModalMover]           = useState(null);
  const [editarOpen, setEditarOpen]           = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [editandoRevision, setEditandoRevision] = useState(false);
  const [arrastrandoId, setArrastrandoId]     = useState(null);
  const [sobreTitular, setSobreTitular]       = useState(false);
  const [confirmarTitular, setConfirmarTitular] = useState(null); // persona que pasará a ser titular
  const [cambiandoTitular, setCambiandoTitular] = useState(false);
  const [errorTitular, setErrorTitular]       = useState('');
  const [destelloId, setDestelloId]           = useState(null);

  const etiquetasExistentes = [...new Set(state.habitaciones.map((h) => h.etiqueta).filter(Boolean))].sort();

  const handleSaveNota = () => {
    if (nota === (habitacion.nota || '')) return;
    actualizarNota(habitacion.id, nota).catch((error) => avisarError(`No se pudo guardar la nota: ${error.message}`));
  };

  const handleSaveEtiqueta = (valor) => {
    const nueva = valor === '__nueva__' ? etiquetaPersonalizada.trim() : valor;
    actualizarEtiqueta(habitacion.id, nueva).catch((error) => avisarError(`No se pudo cambiar la etiqueta: ${error.message}`));
    setEtiqueta(nueva);
    if (valor !== '__nueva__') setEtiquetaPersonalizada('');
  };

  const handleCambiarTitular = async () => {
    const nuevo = confirmarTitular;
    setCambiandoTitular(true);
    setErrorTitular('');
    try {
      await cambiarTitular(nuevo.id);
      setConfirmarTitular(null);
      setDestelloId(nuevo.id);
      setTimeout(() => setDestelloId(null), 1200);
    } catch (error) {
      setErrorTitular(error.message || 'No se pudo cambiar el titular. Intenta de nuevo.');
    } finally {
      setCambiandoTitular(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await eliminarHabitacion(habitacion.id);
      onClose();
    } catch (error) {
      avisarError(`No se pudo eliminar la habitación: ${error.message}`);
      setConfirmDelete(false);
    }
  };

  const personas    = habitacion.personas.filter((p) => p.n);
  const totalPagado = calcularTotalPagado(habitacion);
  const totalReal   = personas.reduce((sum, p) => sum + calcularCuotaPersona(habitacion, p), 0);
  const pendiente   = Math.max(0, totalReal - totalPagado);
  const porcentaje  = totalReal > 0 ? Math.min(100, Math.round((totalPagado / totalReal) * 100)) : 0;
  const colorBarra  = pendiente === 0 ? '#059669' : porcentaje >= 80 ? '#059669' : porcentaje >= 30 ? '#d97706' : '#dc2626';
  const subtitulo   = [habitacion.etiqueta, viaje?.nombre].filter(Boolean).join(' · ');
  const puedeCambiarTitular = !soloLectura && personas.length > 1;
  const mostrarBotonRevision = !soloLectura && !habitacion.enRevision && !editandoRevision;

  return (
    <>
      <div className="modal-overlay-dark" onClick={onClose}>
        <div className="modal-card-dark w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Habitación {habitacion.num}</h2>
                <span className="etiqueta-tipo etiqueta-gris !text-xs !px-2.5 !py-0.5">{habitacion.tipo}</span>
                {habitacion.stack && <span className="etiqueta-tipo bg-violet-50 text-violet-700">Stack</span>}
              </div>
              {subtitulo && (
                <p className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 truncate">
                  <Tag className="h-3.5 w-3.5 shrink-0" /> {subtitulo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!soloLectura && (
                <>
                  <button type="button" onClick={() => setEditarOpen(true)} title="Editar habitación" aria-label="Editar habitación"
                    className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={handleDelete} title="Eliminar habitación" aria-label="Eliminar habitación"
                    className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Contenido: resumen (izquierda) y personas (derecha). En pantallas grandes cada columna se desplaza sola */}
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            {/* ── Resumen ── */}
            <div className="px-5 sm:px-6 py-5 space-y-4 lg:overflow-y-auto scroll-fino lg:border-r border-slate-100">
              {confirmDelete && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 animate-fade-in-up">
                  <p className="text-sm text-red-800 font-semibold mb-2.5">¿Eliminar esta habitación y todos sus pagos?</p>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-borde flex-1" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                    <button type="button" className="btn flex-1 text-white bg-red-600 hover:bg-red-700" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4" /> Sí, eliminar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <CajaTotal label="Total" value={fmt(totalReal)} tono="neutro" />
                <CajaTotal label="Recaudado" value={fmt(totalPagado)} tono="verde" />
                <CajaTotal label="Pendiente" value={fmt(pendiente)} tono="rojo" />
              </div>

              {totalReal > 0 && (
                <div>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-slate-600">Progreso de pago</span>
                    <span className="font-semibold tabular-nums" style={{ color: colorBarra }}>{porcentaje}%</span>
                  </div>
                  <div className="barra !h-2"><span style={{ width: `${porcentaje}%`, background: colorBarra }} /></div>
                </div>
              )}

              {/* Centro / etiqueta + revisión */}
              <div className="space-y-2.5">
                <div>
                  <label className="modal-section-label" htmlFor={`centro-${habitacion.id}`}>Centro / etiqueta</label>
                  <select
                    id={`centro-${habitacion.id}`}
                    className="input-dark !py-2"
                    disabled={soloLectura}
                    value={etiqueta}
                    onChange={(e) => {
                      setEtiqueta(e.target.value);
                      if (e.target.value !== '__nueva__') handleSaveEtiqueta(e.target.value);
                    }}
                  >
                    <option value="">Sin etiqueta</option>
                    {etiquetasExistentes.map((e) => <option key={e} value={e}>{e}</option>)}
                    <option value="__nueva__">+ Nueva etiqueta...</option>
                  </select>
                  {etiqueta === '__nueva__' && (
                    <div className="flex gap-2 mt-2 animate-fade-in-up">
                      <input className="input-dark flex-1 !py-2" type="text" value={etiquetaPersonalizada}
                        onChange={(e) => setEtiquetaPersonalizada(e.target.value)} placeholder="Nombre de la etiqueta" autoFocus />
                      <button type="button" className="btn btn-primario shrink-0 !h-auto" onClick={() => handleSaveEtiqueta('__nueva__')}
                        disabled={!etiquetaPersonalizada.trim()}>
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
                {mostrarBotonRevision && <BotonRevision onClick={() => setEditandoRevision(true)} />}
                <RevisionHabitacion habitacion={habitacion} soloLectura={soloLectura}
                  editando={editandoRevision} onCerrarEdicion={() => setEditandoRevision(false)} />
              </div>

              {/* Notas */}
              <div>
                <label className="modal-section-label" htmlFor={`nota-${habitacion.id}`}>Notas</label>
                <textarea
                  id={`nota-${habitacion.id}`}
                  className="input-dark resize-none !py-2"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  onBlur={soloLectura ? undefined : handleSaveNota}
                  readOnly={soloLectura}
                  placeholder={soloLectura ? 'Sin notas' : 'Añadir notas...'}
                  rows={2}
                />
              </div>
            </div>

            {/* ── Personas ── */}
            <div className="px-5 sm:px-6 py-5 lg:overflow-y-auto scroll-fino border-t lg:border-t-0 border-slate-100">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <p className="label-mayus !text-xs">Personas ({personas.length})</p>
                {puedeCambiarTitular && (
                  <p className="text-xs text-slate-500 hidden sm:block">Arrastra a alguien sobre el titular para cambiarlo</p>
                )}
              </div>
              <div className="space-y-2.5">
                {personas.map((persona, i) => {
                  const esTitular = i === 0;
                  const arrastrable = puedeCambiarTitular && !esTitular;
                  const zonaActiva = esTitular && arrastrandoId && arrastrandoId !== persona.id;
                  return (
                    <div
                      key={persona.id}
                      draggable={arrastrable}
                      onDragStart={arrastrable ? (e) => {
                        e.dataTransfer.setData('text/plain', String(persona.id));
                        e.dataTransfer.effectAllowed = 'move';
                        setArrastrandoId(persona.id);
                      } : undefined}
                      onDragEnd={() => { setArrastrandoId(null); setSobreTitular(false); }}
                      onDragOver={zonaActiva ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setSobreTitular(true); } : undefined}
                      onDragLeave={zonaActiva ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSobreTitular(false); } : undefined}
                      onDrop={zonaActiva ? (e) => {
                        e.preventDefault();
                        const nuevo = personas.find((p) => p.id === arrastrandoId);
                        setArrastrandoId(null);
                        setSobreTitular(false);
                        if (nuevo) setConfirmarTitular(nuevo);
                      } : undefined}
                      className={`relative rounded-xl transition-all ${arrastrable ? 'cursor-grab active:cursor-grabbing' : ''} ${
                        arrastrandoId === persona.id ? 'opacity-40 scale-[0.98]' : ''
                      } ${persona.id === destelloId ? 'destello-exito' : ''}`}
                    >
                      <PersonaDetalle
                        persona={persona}
                        habitacion={habitacion}
                        fmt={fmt}
                        soloLectura={soloLectura}
                        puedePagar={puedePagar}
                        titular={esTitular}
                        arrastrable={arrastrable}
                        onHacerTitular={puedeCambiarTitular ? () => setConfirmarTitular(persona) : undefined}
                        onPago={(pago) => setModalPago({ habId: habitacion.id, persona, pago })}
                        onMover={() => setModalMover({ habOrigen: habitacion.id, persona })}
                      />
                      {zonaActiva && (
                        <div className={`absolute inset-0 rounded-xl border-2 border-dashed flex items-center justify-center text-sm font-semibold pointer-events-none transition-colors ${
                          sobreTitular ? 'border-amber-500 bg-amber-50/90 text-amber-900' : 'border-amber-300 bg-amber-50/60 text-amber-800'
                        }`}>
                          <Crown className="h-4 w-4 mr-1.5" /> Suelta aquí para hacerlo titular
                        </div>
                      )}
                    </div>
                  );
                })}
                {personas.length === 0 && <p className="text-sm text-slate-400 italic">Sin personas asignadas.</p>}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {modalPago && (
        <ModalRegistrarPago
          habId={modalPago.habId}
          persona={modalPago.persona}
          pago={modalPago.pago}
          onClose={() => setModalPago(null)}
        />
      )}

      {modalMover && (
        <ModalMoverPersona
          habOrigen={modalMover.habOrigen}
          persona={modalMover.persona}
          onClose={() => setModalMover(null)}
        />
      )}

      {confirmarTitular && (
        <div className="modal-overlay-dark" style={{ zIndex: 70 }} onClick={() => { if (!cambiandoTitular) { setConfirmarTitular(null); setErrorTitular(''); } }}>
          <div className="modal-card-dark w-full max-w-sm" role="alertdialog" aria-modal="true" aria-labelledby="titulo-cambiar-titular"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <span className="mx-auto h-12 w-12 rounded-full flex items-center justify-center animate-pop-in"
                style={{ background: 'var(--titular-fondo)', color: 'var(--titular-texto)' }}>
                <Crown className="h-6 w-6" />
              </span>
              <h3 id="titulo-cambiar-titular" className="mt-4 text-lg font-bold text-slate-900">
                ¿Cambiar el titular?
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Estás a punto de cambiar el titular de la <span className="font-semibold text-slate-900">Habitación {habitacion.num}</span>.
                {' '}<span className="font-semibold text-slate-900">{confirmarTitular.n}</span> pasará a ser el titular
                {personas[0] ? <> en lugar de <span className="font-semibold text-slate-900">{personas[0].n}</span></> : null}.
              </p>
            </div>
            {errorTitular && (
              <p className="mx-6 -mt-2 mb-4 flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 aviso-entrada" role="alert">
                <X className="h-4 w-4 mt-0.5 shrink-0 text-red-600" /> {errorTitular}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              <button type="button" className="btn-modal-secondary" onClick={() => { setConfirmarTitular(null); setErrorTitular(''); }} disabled={cambiandoTitular}>
                No
              </button>
              <button type="button" className="btn-modal-primary" onClick={handleCambiarTitular} disabled={cambiandoTitular} autoFocus>
                {cambiandoTitular ? 'Cambiando...' : errorTitular ? 'Reintentar' : 'Sí, cambiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalEditarHabitacion
        habitacion={habitacion}
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
      />
    </>
  );
};

export default ModalDetallesHabitacion;
