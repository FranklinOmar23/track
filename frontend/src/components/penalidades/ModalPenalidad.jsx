import { useEffect, useMemo, useState } from 'react';
import { X, Save, CircleAlert } from 'lucide-react';
import InputMonto from '../common/InputMonto';
import Comprobantes from '../common/Comprobantes';
import { crearPenalidad, editarPenalidad, fetchPersonasEliminadas } from '../../utils/api';
import SelectorPersona from './SelectorPersona';
import { MOTIVOS } from './motivos';
import { subirPendientes } from '../../utils/comprobantes';
import { formatCurrency } from '../../utils/formatters';
import { avisarError, avisarExito } from '../../utils/avisos';

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Registrar o editar una penalidad del hotel (no se suma a los montos del viaje). */
const ModalPenalidad = ({ viaje, penalidad, habitaciones, onGuardado, onClose }) => {
  const editando = !!penalidad;
  const divisa = viaje.divisa || 'USD';
  const fmt = (n) => formatCurrency(n, divisa);

  const [persona, setPersona] = useState(penalidad ? {
    personaId: penalidad.personaId, nombre: penalidad.personaNombre, habitacion: penalidad.habitacion, estado: penalidad.personaEstado,
  } : null);
  const [motivo, setMotivo] = useState(penalidad?.motivo || 'salida');
  const [eliminadas, setEliminadas] = useState([]);
  const [cargandoEliminadas, setCargandoEliminadas] = useState(true);
  const [fecha, setFecha] = useState(penalidad?.fecha ? String(penalidad.fecha).slice(0, 10) : hoyISO());
  const [monto, setMonto] = useState(penalidad ? String(penalidad.monto) : '');
  const [cobrado, setCobrado] = useState(penalidad?.cobrado ? String(penalidad.cobrado) : '');
  const [pagadaHotel, setPagadaHotel] = useState(!!penalidad?.pagadaHotel);
  const [nota, setNota] = useState(penalidad?.nota || '');
  const [pendientes, setPendientes] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // Personas que siguen en el viaje
  const vigentes = useMemo(() => habitaciones.flatMap((h) =>
    h.personas.filter((p) => p.n).map((p) => ({ id: p.id, nombre: p.n, habitacion: String(h.num ?? '') }))), [habitaciones]);

  // Personas eliminadas del viaje (sacadas del registro de actividad)
  useEffect(() => {
    let cancelado = false;
    fetchPersonasEliminadas(viaje.id)
      .then((d) => { if (!cancelado) setEliminadas(d.personas); })
      .catch(() => {})
      .finally(() => { if (!cancelado) setCargandoEliminadas(false); });
    return () => { cancelado = true; };
  }, [viaje.id]);

  const personaNombre = persona?.nombre || '';
  const asociada = persona?.personaId
    ? vigentes.find((p) => p.id === persona.personaId) || eliminadas.find((p) => p.id === persona.personaId)
    : null;
  if (asociada && persona && !persona.nombreOriginal) setPersona({ ...persona, nombreOriginal: asociada.nombre });

  const montoNum = Number(monto) || 0;
  const cobradoNum = Number(cobrado) || 0;
  const falta = Math.max(0, montoNum - cobradoNum);

  const guardar = async () => {
    if (!personaNombre.trim()) { avisarError('Escribe el nombre de la persona.'); return; }
    if (!(montoNum > 0)) { avisarError('Escribe el monto de la penalidad.'); return; }
    setGuardando(true);
    const datos = { viajeId: viaje.id, personaId: persona?.personaId || null, personaNombre, habitacion: persona?.habitacion || '', motivo, fecha, monto: montoNum, cobrado: cobradoNum, pagadaHotel, nota };
    try {
      const guardada = editando ? await editarPenalidad(penalidad.id, datos) : await crearPenalidad(datos);
      if (!editando && pendientes.length) {
        try {
          const subidos = await subirPendientes('penalidad', guardada.id, pendientes);
          guardada.comprobantes = subidos.length;
        } catch (e) {
          avisarError(`La penalidad se guardó, pero no se pudo subir el comprobante: ${e.message}`);
        }
      }
      avisarExito(editando ? 'Penalidad actualizada' : 'Penalidad registrada');
      onGuardado(guardada);
    } catch (e) {
      avisarError(`No se pudo guardar la penalidad: ${e.message}`);
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{editando ? 'Editar penalidad' : 'Registrar penalidad del hotel'}</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{viaje.nombre}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Las penalidades van <strong>por fuera</strong>: no se suman al total por cobrar, a lo pagado ni a lo pendiente del viaje.</p>
            </div>

            <div>
              <span className="modal-section-label">Persona <span className="text-red-600">*</span></span>
              <SelectorPersona viajeNombre={viaje.nombre} vigentes={vigentes} eliminadas={eliminadas} cargandoEliminadas={cargandoEliminadas}
                valor={persona} onCambiar={setPersona} />
              {persona && (persona.nombre || persona.personaId) && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="text-xs font-medium text-slate-600" htmlFor="pe-nombre">Nombre en la penalidad</label>
                      {persona.personaId && persona.nombreOriginal && persona.nombre !== persona.nombreOriginal && (
                        <button type="button" onClick={() => setPersona((p) => ({ ...p, nombre: p.nombreOriginal }))}
                          className="text-[11px] font-semibold text-teal-700 hover:underline">Usar «{persona.nombreOriginal}»</button>
                      )}
                    </div>
                    <input id="pe-nombre" className="input-dark !h-9" value={persona.nombre || ''} maxLength={150}
                      onChange={(e) => setPersona((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: quien pagó la penalidad" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="pe-hab">Habitación</label>
                    <input id="pe-hab" className="input-dark !h-9" value={persona.habitacion || ''} maxLength={30}
                      onChange={(e) => setPersona((p) => ({ ...p, habitacion: e.target.value }))} placeholder="Ej: 12" />
                  </div>
                  {persona.personaId && (
                    <p className="sm:col-span-2 -mt-1 text-[11px] text-slate-500">
                      Puedes cambiar el nombre (p. ej. si lo pagó otra persona o le cambiaron el nombre); la penalidad sigue asociada a la persona del viaje.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <span className="modal-section-label">Motivo</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Motivo de la penalidad">
                {MOTIVOS.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={motivo === m.id} onClick={() => setMotivo(m.id)}
                    className={`h-10 px-2 rounded-xl border text-xs font-semibold transition-colors ${
                      motivo === m.id ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="modal-section-label" htmlFor="pe-fecha">Fecha de la salida / penalidad</label>
                <input id="pe-fecha" type="date" className="input-dark" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <label className="modal-section-label" htmlFor="pe-monto">Monto de la penalidad <span className="text-red-600">*</span></label>
                <InputMonto id="pe-monto" divisa={divisa} value={monto} min="0.01" onChange={setMonto} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="modal-section-label !mb-0" htmlFor="pe-cobrado">Cobrado al cliente</label>
                {montoNum > 0 && cobradoNum !== montoNum && (
                  <button type="button" onClick={() => setCobrado(String(montoNum))}
                    className="text-xs font-semibold text-teal-700 hover:underline">Cobrada completa</button>
                )}
              </div>
              <InputMonto id="pe-cobrado" divisa={divisa} value={cobrado} onChange={setCobrado} />
              {montoNum > 0 && (
                <p className={`text-xs mt-1.5 ${cobradoNum > montoNum ? 'text-amber-700' : falta > 0 ? 'text-slate-500' : 'text-emerald-700 font-semibold'}`}>
                  {cobradoNum > montoNum
                    ? `Se cobró ${fmt(cobradoNum - montoNum)} más que la penalidad.`
                    : falta > 0 ? `Falta por cobrar: ${fmt(falta)}` : '✓ Penalidad cobrada completa'}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer select-none">
              <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={pagadaHotel} onChange={(e) => setPagadaHotel(e.target.checked)} />
              Ya se le pagó la penalidad al hotel
            </label>

            <div>
              <label className="modal-section-label" htmlFor="pe-nota">Nota <span className="font-normal text-slate-400">(opcional)</span></label>
              <input id="pe-nota" className="input-dark" value={nota} maxLength={255}
                onChange={(e) => setNota(e.target.value)} placeholder="Ej: avisó 10 días antes de la salida" />
            </div>

            <Comprobantes
              entidad="penalidad"
              entidadId={penalidad?.id || null}
              titulo="Comprobante de la penalidad"
              pendientes={pendientes}
              onPendientes={setPendientes}
            />
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="button" className="btn-modal-primary" onClick={guardar}
              disabled={guardando || !(montoNum > 0) || !personaNombre.trim()}>
              <Save className="h-4 w-4" />
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar penalidad'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPenalidad;
