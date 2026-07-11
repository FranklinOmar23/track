import { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useDivisa } from '../../hooks/useDivisa';
import { calcularTotalPagado, calcularCuotaPersona } from '../../utils/calculos';
import ModalRegistrarPago from './ModalRegistrarPago';
import ModalMoverPersona from './ModalMoverPersona';
import ModalEditarHabitacion from './ModalEditarHabitacion';
import { X, Pencil, Plus, ArrowRightLeft, CreditCard, Trash2, Tag, Gift } from 'lucide-react';
import { ninoDebePagar } from '../../utils/calculos';

const ModalDetallesHabitacion = ({ habitacion: habitacionProp, onClose }) => {
  const { actualizarNota, actualizarEtiqueta, eliminarHabitacion, state } = useHabitacionesContext();
  const { fmt } = useDivisa();

  const habitacion = state.habitaciones.find((h) => h.id === habitacionProp.id) || habitacionProp;

  const [nota, setNota]                       = useState(habitacion.nota || '');
  const [etiqueta, setEtiqueta]               = useState(habitacion.etiqueta || '');
  const [etiquetaPersonalizada, setEtiquetaPersonalizada] = useState('');
  const [modalPago, setModalPago]             = useState(null);
  const [modalMover, setModalMover]           = useState(null);
  const [editarOpen, setEditarOpen]           = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);

  const etiquetasExistentes = [...new Set(
    state.habitaciones.map((h) => h.etiqueta).filter(Boolean)
  )].sort();

  const handleSaveNota = () => actualizarNota(habitacion.id, nota);

  const handleSaveEtiqueta = (valor) => {
    const nueva = valor === '__nueva__' ? etiquetaPersonalizada.trim() : valor;
    actualizarEtiqueta(habitacion.id, nueva);
    setEtiqueta(nueva);
    if (valor !== '__nueva__') setEtiquetaPersonalizada('');
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    eliminarHabitacion(habitacion.id);
    onClose();
  };

  const totalPagado = calcularTotalPagado(habitacion);
  const totalReal   = habitacion.personas.filter((p) => p.n)
    .reduce((sum, p) => sum + calcularCuotaPersona(habitacion, p), 0);
  const pendiente   = Math.max(0, totalReal - totalPagado);
  const porcentaje  = totalReal > 0 ? Math.min(100, Math.round((totalPagado / totalReal) * 100)) : 0;

  const payBar = pendiente === 0 ? '#10b981' : porcentaje >= 50 ? '#0d9488' : porcentaje > 0 ? '#f59e0b' : '#f43f5e';

  return (
    <>
      <div className="modal-overlay-dark" onClick={onClose}>
        <div
          className="modal-card-dark w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Orb decoration */}
          <div className="orb w-56 h-56 pointer-events-none" style={{ top: '-70px', right: '-70px', background: '#0d9488', opacity: 0.08 }} />

          {/* ── Scroll container (contiene header sticky + contenido) ── */}
          <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>

          {/* ── Header ── */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
            style={{ background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white">Hab. {habitacion.num}</h2>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                >
                  {habitacion.tipo}
                </span>
                {habitacion.stack && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    STACK
                  </span>
                )}
              </div>
              {habitacion.etiqueta && (
                <div className="flex items-center gap-1 mt-1">
                  <Tag className="h-3 w-3 text-gray-600" />
                  <span className="text-xs text-gray-600">{habitacion.etiqueta}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setEditarOpen(true)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-teal-300 hover:bg-teal-500/10 transition-colors"
                title="Editar habitación">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative px-6 py-5 space-y-5">

            {/* ── Totals summary ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: fmt(totalReal), color: 'text-white' },
                { label: 'Recaudado', value: fmt(totalPagado), color: 'text-emerald-400' },
                { label: 'Pendiente', value: pendiente > 0 ? fmt(pendiente) : '✓', color: pendiente > 0 ? 'text-rose-400' : 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">{label}</div>
                  <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {totalReal > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600">Progreso de pago</span>
                  <span className="font-semibold tabular-nums" style={{ color: payBar }}>{porcentaje}%</span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${porcentaje}%`, background: payBar }} />
                </div>
              </div>
            )}

            {/* ── Etiqueta ── */}
            <div>
              <label className="modal-section-label flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> Centro / Etiqueta
              </label>
              <div className="flex gap-2">
                <select
                  className="input-dark flex-1"
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
                  <>
                    <input
                      className="input-dark flex-1"
                      type="text"
                      value={etiquetaPersonalizada}
                      onChange={(e) => setEtiquetaPersonalizada(e.target.value)}
                      placeholder="Nombre de la etiqueta"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-modal-primary shrink-0"
                      onClick={() => handleSaveEtiqueta('__nueva__')}
                      disabled={!etiquetaPersonalizada.trim()}
                    >
                      OK
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Personas ── */}
            <div>
              <label className="modal-section-label">Personas ({habitacion.personas.filter((p) => p.n).length})</label>
              <div className="space-y-2">
                {habitacion.personas.filter((p) => p.n).map((persona, personaIndex) => {
                  const pagadoPersona = persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
                  const cuota         = calcularCuotaPersona(habitacion, persona);
                  const pendienteP    = Math.max(0, cuota - pagadoPersona);
                  const esNino        = persona.esNino || /\(\d+ años\)/.test(persona.n || '');
                  const esGratis      = esNino && (persona.esGratis || !ninoDebePagar(persona, habitacion.edadMinimaPago));

                  return (
                    <div
                      key={persona.id}
                      className="rounded-xl p-3.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: esNino ? 'rgba(245,158,11,0.25)' : 'rgba(13,148,136,0.25)' }}
                          >
                            {persona.n?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">{persona.n}</span>
                            {esNino && (
                              <span className="ml-1.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">niño</span>
                            )}
                          {esGratis && (
                              <span className="ml-1 flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                <Gift className="h-2.5 w-2.5" /> gratis
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModalPago({ habId: habitacion.id, perIdx: personaIndex, persona, pago: null })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-teal-400 hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20 transition-all"
                          >
                            <Plus className="h-3 w-3" /> Pago
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalMover({ habOrigen: habitacion.id, perIdx: personaIndex, persona })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all"
                          >
                            <ArrowRightLeft className="h-3 w-3" /> Mover
                          </button>
                        </div>
                      </div>

                      {/* Pagos list */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {(persona.pagos || []).map((pago, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setModalPago({ habId: habitacion.id, perIdx: personaIndex, persona, pago })}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: 'rgba(13,148,136,0.12)',
                              border: '1px solid rgba(13,148,136,0.2)',
                              color: '#5eead4',
                            }}
                            title="Click para editar/eliminar pago"
                          >
                            <CreditCard className="h-2.5 w-2.5" />
                            {pago.mes} — {fmt(pago.monto)}
                          </button>
                        ))}
                        {(!persona.pagos || persona.pagos.length === 0) && (
                          <span className="text-xs text-gray-600 italic px-1">Sin pagos registrados</span>
                        )}
                      </div>

                      {/* Person totals */}
                      <div className="flex items-center gap-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {esGratis ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <Gift className="h-3 w-3" />
                            Sin costo · entra gratis
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-wide">Cuota</div>
                              <div className="text-xs font-bold text-gray-300 tabular-nums">{fmt(cuota)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-wide">Pagado</div>
                              <div className="text-xs font-bold text-emerald-400 tabular-nums">{fmt(pagadoPersona)}</div>
                            </div>
                            {pendienteP > 0 && (
                              <div>
                                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Pendiente</div>
                                <div className="text-xs font-bold text-rose-400 tabular-nums">-{fmt(pendienteP)}</div>
                              </div>
                            )}
                            {pendienteP === 0 && cuota > 0 && (
                              <div className="text-xs font-bold text-emerald-400">✓ Completo</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Notas ── */}
            <div>
              <label className="modal-section-label">Notas</label>
              <textarea
                className="input-dark resize-none"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onBlur={handleSaveNota}
                placeholder="Añadir notas..."
                rows={3}
                style={{ minHeight: '72px' }}
              />
            </div>

            {/* ── Actions ── */}
            <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {confirmDelete ? (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                  <p className="text-sm text-rose-300 font-semibold mb-2">¿Eliminar esta habitación y todos sus pagos?</p>
                  <div className="flex gap-2">
                    <button className="btn-modal-danger flex-1" onClick={handleDelete}>
                      <Trash2 className="h-3.5 w-3.5" /> Confirmar eliminación
                    </button>
                    <button className="btn-modal-secondary flex-1" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button className="btn-modal-danger" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar hab.
                  </button>
                  <button className="btn-modal-secondary" onClick={onClose}>
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>{/* fin scroll container */}
        </div>
      </div>

      {modalPago && (
        <ModalRegistrarPago
          habId={modalPago.habId}
          perIdx={modalPago.perIdx}
          persona={modalPago.persona}
          pago={modalPago.pago}
          onClose={() => setModalPago(null)}
        />
      )}

      {modalMover && (
        <ModalMoverPersona
          habOrigen={modalMover.habOrigen}
          perIdx={modalMover.perIdx}
          persona={modalMover.persona}
          onClose={() => setModalMover(null)}
        />
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
