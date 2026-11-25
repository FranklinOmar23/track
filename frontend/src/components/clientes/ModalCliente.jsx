import { useState } from 'react';
import { X, Save, Star } from 'lucide-react';
import Portal from '../common/Portal';
import { crearCliente, editarCliente } from '../../utils/api';
import { avisarExito } from '../../utils/avisos';

const VACIO = {
  nombre: '', telefono: '', whatsapp: '', correo: '', documento: '',
  fechaNacimiento: '', ciudad: '', direccion: '', notas: '', esFijo: false,
};

const Campo = ({ label, children, ancho = '' }) => (
  <label className={`block ${ancho}`}>
    <span className="modal-section-label">{label}</span>
    {children}
  </label>
);

/**
 * Crear o editar la ficha de un cliente.
 * cliente: para editar. nombreInicial / personaIds: al crear desde una persona o un grupo de repetidos.
 */
const ModalCliente = ({ cliente, nombreInicial = '', personaIds = [], onClose, onGuardado }) => {
  const nuevo = !cliente;
  const [datos, setDatos] = useState(() => (cliente
    ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, cliente[k] ?? VACIO[k]]))
    : { ...VACIO, nombre: nombreInicial }));
  const [whatsappIgual, setWhatsappIgual] = useState(() => !cliente || !cliente.whatsapp || cliente.whatsapp === cliente.telefono);
  const [estado, setEstado] = useState({ guardando: false, error: '' });

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const guardar = async () => {
    if (!datos.nombre.trim()) { setEstado({ guardando: false, error: 'El nombre es obligatorio.' }); return; }
    setEstado({ guardando: true, error: '' });
    const cuerpo = { ...datos, whatsapp: whatsappIgual ? datos.telefono : datos.whatsapp, fechaNacimiento: datos.fechaNacimiento || null };
    try {
      const guardado = nuevo
        ? await crearCliente({ ...cuerpo, personaIds })
        : await editarCliente(cliente.id, cuerpo);
      avisarExito(nuevo ? 'Cliente creado' : 'Cliente actualizado');
      onGuardado?.(guardado);
    } catch (error) {
      setEstado({ guardando: false, error: error.message });
    }
  };

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="modal-card-dark w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{nuevo ? 'Nuevo cliente' : `Editar a ${cliente.nombre}`}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {personaIds.length
                    ? `Se enlazará con ${personaIds.length} persona${personaIds.length !== 1 ? 's' : ''} de tus viajes`
                    : 'Datos de contacto y notas'}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <form className="flex-1 overflow-y-auto px-6 py-5 space-y-4" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Campo label={<>Nombre completo <span className="text-red-600">*</span></>}>
                  <input className="input-dark" value={datos.nombre} onChange={cambiar('nombre')} placeholder="Ej: María Rodríguez" autoFocus />
                </Campo>
                <button type="button" onClick={() => setDatos((d) => ({ ...d, esFijo: !d.esFijo }))} aria-pressed={datos.esFijo}
                  className={`h-10 px-3.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${datos.esFijo
                    ? 'bg-amber-50 border-amber-300 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <Star className={`h-4 w-4 ${datos.esFijo ? 'fill-amber-400 text-amber-500' : ''}`} /> Cliente fijo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Teléfono">
                  <input className="input-dark" type="tel" value={datos.telefono} onChange={cambiar('telefono')} placeholder="809-555-1234" />
                </Campo>
                <div>
                  <span className="modal-section-label flex items-center justify-between gap-2">
                    WhatsApp
                    <label className="flex items-center gap-1.5 text-[11px] font-normal normal-case tracking-normal text-slate-500 cursor-pointer">
                      <input type="checkbox" className="accent-teal-700" checked={whatsappIgual} onChange={(e) => setWhatsappIgual(e.target.checked)} />
                      El mismo
                    </label>
                  </span>
                  <input className="input-dark" type="tel" value={whatsappIgual ? datos.telefono : datos.whatsapp}
                    onChange={cambiar('whatsapp')} disabled={whatsappIgual} placeholder="809-555-1234" />
                </div>
                <Campo label="Correo">
                  <input className="input-dark" type="email" value={datos.correo} onChange={cambiar('correo')} placeholder="correo@ejemplo.com" />
                </Campo>
                <Campo label="Cédula o pasaporte">
                  <input className="input-dark" value={datos.documento} onChange={cambiar('documento')} placeholder="001-0000000-0" />
                </Campo>
                <Campo label="Fecha de nacimiento">
                  <input className="input-dark" type="date" value={datos.fechaNacimiento || ''} onChange={cambiar('fechaNacimiento')} />
                </Campo>
                <Campo label="Ciudad">
                  <input className="input-dark" value={datos.ciudad} onChange={cambiar('ciudad')} placeholder="Santo Domingo" />
                </Campo>
                <Campo label="Dirección" ancho="sm:col-span-2">
                  <input className="input-dark" value={datos.direccion} onChange={cambiar('direccion')} />
                </Campo>
                <Campo label="Notas" ancho="sm:col-span-2">
                  <textarea className="input-dark !h-auto py-2 resize-none" rows={3} value={datos.notas} onChange={cambiar('notas')}
                    placeholder="Preferencias, cómo suele pagar, con quién viaja..." />
                </Campo>
              </div>
              <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
            </form>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-red-700 min-w-0" role="alert">{estado.error}</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={estado.guardando}>Cancelar</button>
                <button type="button" className="btn-modal-primary" onClick={guardar} disabled={estado.guardando || !datos.nombre.trim()}>
                  <Save className="h-4 w-4" /> {estado.guardando ? 'Guardando...' : nuevo ? 'Crear cliente' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ModalCliente;
