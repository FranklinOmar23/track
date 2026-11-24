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
const CajaTotal = ({ label, value, tono }) => {
  const estilos = {
    neutro: 'bg-slate-50 border-slate-200 text-slate-900',
    verde: 'bg-emerald-50/70 border-emerald-200 text-emerald-700',
    rojo: 'bg-red-50/70 border-red-200 text-red-700',
  }[tono];
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${estilos}`}>
      <p className={`text-xs sm:text-[13px] ${tono === 'neutro' ? 'text-slate-600' : tono === 'verde' ? 'text-emerald-800' : 'text-red-800'}`}>{label}</p>
      <p className="text-base sm:text-xl font-bold tabular-nums mt-0.5 whitespace-nowrap">{value}</p>
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
        <div className="modal-card-dark w-full max-w-[600px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-6 pb-5 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Habitación {habitacion.num}</h2>
                <span className="etiqueta-tipo etiqueta-gris !text-xs !px-2.5 !py-0.5">{habitacion.tipo}</span>
                {habitacion.stack && <span className="etiqueta-tipo bg-violet-50 text-violet-700">Stack</span>}
              </div>
              {subtitulo && (
                <p className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500 truncate">
                  <Tag className="h-3.5 w-3.5 shrink-0" /> {subtitulo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!soloLectura && (
                <button type="button" onClick={() => setEditarOpen(true)} title="Editar habitación" aria-label="Editar habitación"
                  className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <CajaTotal label="Total" value={fmt(totalReal)} tono="neutro" />
              <CajaTotal label="Recaudado" value={fmt(totalPagado)} tono="verde" />
              <CajaTotal label="Pendiente" value={fmt(pendiente)} tono="rojo" />
            </div>

            {totalReal > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progreso de pago</span>
                  <span className="font-semibold tabular-nums" style={{ color: colorBarra }}>{porcentaje}%</span>
                </div>
                <div className="barra !h-2"><span style={{ width: `${porcentaje}%`, background: colorBarra }} /></div>
              </div>
            )}

            {/* Centro / etiqueta + revisión */}
            <div className="space-y-3">
              <div>
                <label className="modal-section-label" htmlFor={`centro-${habitacion.id}`}>Centro / etiqueta</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    id={`centro-${habitacion.id}`}
                    className="input-dark flex-1"
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
                  {mostrarBotonRevision && <BotonRevision onClick={() => setEditandoRevision(true)} />}
                </div>
                {etiqueta === '__nueva__' && (
                  <div className="flex gap-2 mt-2 animate-fade-in-up">
                    <input className="input-dark flex-1" type="text" value={etiquetaPersonalizada}
                      onChange={(e) => setEtiquetaPersonalizada(e.target.value)} placeholder="Nombre de la etiqueta" autoFocus />
                    <button type="button" className="btn-modal-primary shrink-0" onClick={() => handleSaveEtiqueta('__nueva__')}
                      disabled={!etiquetaPersonalizada.trim()}>
                      Guardar
                    </button>
                  </div>
                )}
              </div>
              <RevisionHabitacion habitacion={habitacion} soloLectura={soloLectura}
                editando={editandoRevision} onCerrarEdicion={() => setEditandoRevision(false)} />
            </div>

            {/* Personas */}
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <p className="label-mayus !text-xs">Personas ({personas.length})</p>
                {puedeCambiarTitular && (
                  <p className="text-xs text-slate-500">Arrastra a alguien sobre el titular para cambiarlo</p>
                )}
              </div>
              <div className="space-y-3">
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

            {/* Notas */}
            <div>
              <label className="modal-section-label" htmlFor={`nota-${habitacion.id}`}>Notas</label>
              <textarea
                id={`nota-${habitacion.id}`}
                className="input-dark resize-none"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onBlur={soloLectura ? undefined : handleSaveNota}
                readOnly={soloLectura}
                placeholder={soloLectura ? 'Sin notas' : 'Añadir notas...'}
                rows={3}
                style={{ minHeight: '72px' }}
              />
            </div>

            {confirmDelete && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in-up">
                <p className="text-sm text-red-800 font-semibold mb-3">¿Eliminar esta habitación y todos sus pagos?</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-modal-secondary flex-1" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                  <button type="button" className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[0.6rem] text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                    onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" /> Sí, eliminar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pie */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-slate-100">
            {!soloLectura && !confirmDelete ? (
              <button type="button" onClick={handleDelete}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-700 transition-colors">
                <Trash2 className="h-4 w-4" /> Eliminar habitación
              </button>
            ) : <span />}
            <button type="button" className="btn-modal-secondary" onClick={onClose}>Cerrar</button>
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
                style={{ background: '#fbf1d3', color: '#a16207' }}>
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
