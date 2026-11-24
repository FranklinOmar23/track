import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import GananciaFields from './GananciaFields';
import PoliticaNinosFields from './PoliticaNinosFields';
import TipoViajeSelector from './TipoViajeSelector';
import Portal from '../common/Portal';
import { DIVISAS } from '../../utils/viajeOpciones';
import { avisarError } from '../../utils/avisos';

const gananciaPorDefecto = (tipo) => (tipo === 'tour' ? 'por_persona' : 'porcentaje');

const ModalAgregarViaje = ({ open, onClose, onCreate }) => {
  const [nombre, setNombre]               = useState('');
  const [tipo, setTipo]                   = useState('resort');
  const [divisa, setDivisa]               = useState('USD');
  const [fechaInicio, setFechaInicio]     = useState('');
  const [fechaFin, setFechaFin]           = useState('');
  const [nota, setNota]                   = useState('');
  const [edadMinimaPago, setEdadMinimaPago] = useState(0);
  const [gananciaTipo, setGananciaTipo]   = useState(gananciaPorDefecto('resort'));
  const [gananciaValor, setGananciaValor] = useState('');
  const [gananciaTocada, setGananciaTocada] = useState(false);
  const [loading, setLoading]             = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      // onCreate crea el viaje (vía contexto); no llamar a la API aquí para no duplicarlo
      await onCreate({
        nombre: nombre.trim(), tipo, divisa,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        nota: nota || null,
        edadMinimaPago: Number(edadMinimaPago) || 0,
        gananciaTipo,
        gananciaValor: Number(gananciaValor) || 0,
      });
      setNombre(''); setTipo('resort'); setDivisa('USD');
      setFechaInicio(''); setFechaFin(''); setNota(''); setEdadMinimaPago(0);
      setGananciaTipo(gananciaPorDefecto('resort')); setGananciaValor(''); setGananciaTocada(false);
      onClose();
    } catch (error) {
      console.error(error);
      avisarError('Error al crear el viaje');
    } finally {
      setLoading(false);
    }
  };

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    if (!gananciaTocada) setGananciaTipo(gananciaPorDefecto(nuevo));
  };

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={onClose}>
        <div className="modal-card-dark w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            {/* Encabezado */}
            <div className="flex items-start justify-between px-6 sm:px-7 pt-6 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Crear nuevo viaje</h2>
                <p className="text-sm text-slate-500 mt-0.5">Completa los datos del viaje.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-6 space-y-5 modal-stagger">
              <div>
                <label className="modal-section-label" htmlFor="nv-nombre">
                  Nombre del viaje <span className="text-red-600">*</span>
                </label>
                <input id="nv-nombre" className="input-dark" type="text" value={nombre}
                  onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Tour Buggie Punta Cana" required autoFocus />
              </div>

              <TipoViajeSelector valor={tipo} onChange={cambiarTipo} disabled={loading} />

              <div>
                <label className="modal-section-label" htmlFor="nv-divisa">Divisa</label>
                <select id="nv-divisa" className="input-dark" value={divisa} onChange={(e) => setDivisa(e.target.value)}>
                  {DIVISAS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="modal-section-label" htmlFor="nv-inicio">Fecha de inicio</label>
                  <input id="nv-inicio" className="input-dark" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div>
                  <label className="modal-section-label" htmlFor="nv-fin">Fecha de fin</label>
                  <input id="nv-fin" className="input-dark" type="date" value={fechaFin} min={fechaInicio || undefined}
                    onChange={(e) => setFechaFin(e.target.value)} />
                </div>
              </div>

              <GananciaFields
                tipo={gananciaTipo}
                valor={gananciaValor}
                divisa={divisa}
                onTipoChange={(t) => { setGananciaTipo(t); setGananciaTocada(true); }}
                onValorChange={setGananciaValor}
                disabled={loading}
              />

              <PoliticaNinosFields edadMinimaPago={edadMinimaPago} onChange={setEdadMinimaPago} tipo={tipo} disabled={loading} />

              <div>
                <label className="modal-section-label" htmlFor="nv-nota">Nota <span className="font-normal text-slate-400">(opcional)</span></label>
                <textarea id="nv-nota" className="input-dark resize-none" value={nota} onChange={(e) => setNota(e.target.value)}
                  rows={3} placeholder="Información adicional..." style={{ minHeight: '72px' }} />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 px-6 sm:px-7 py-4 border-t border-slate-100">
              <button type="button" className="btn-modal-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn-modal-primary" disabled={loading || !nombre.trim()}>
                <Plus className="h-4 w-4" />
                {loading ? 'Creando...' : 'Crear viaje'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default ModalAgregarViaje;
