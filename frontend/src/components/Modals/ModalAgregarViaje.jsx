import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import GananciaFields from './GananciaFields';
import PoliticaNinosFields from './PoliticaNinosFields';
import { DIVISAS } from '../../utils/viajeOpciones';

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
      alert('Error al crear el viaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div
        className="modal-card-dark w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Teal orb top-right */}
        <div className="orb w-48 h-48 pointer-events-none" style={{ top: '-60px', right: '-60px', background: '#0d9488', opacity: 0.1 }} />

        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">Crear nuevo viaje</h2>
            <p className="text-xs text-gray-600 mt-0.5">Completa los datos del viaje</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative px-6 py-5 space-y-4">

          {/* Nombre */}
          <div>
            <label className="modal-section-label">Nombre del viaje *</label>
            <input
              className="input-dark"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Tour Buggie Punta Cana"
              required
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="modal-section-label">Tipo de viaje</label>
            <select className="input-dark" value={tipo} onChange={(e) => {
              setTipo(e.target.value);
              if (!gananciaTocada) setGananciaTipo(gananciaPorDefecto(e.target.value));
            }}>
              <option value="resort">🏨 Resort</option>
              <option value="tour">🚐 Tour</option>
            </select>
          </div>

          {/* Divisa */}
          <div>
            <label className="modal-section-label">Divisa</label>
            <select className="input-dark" value={divisa} onChange={(e) => setDivisa(e.target.value)}>
              {DIVISAS.map((d) => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="modal-section-label">Fecha inicio</label>
              <input className="input-dark" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="modal-section-label">Fecha fin</label>
              <input className="input-dark" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
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

          {/* Nota */}
          <div>
            <label className="modal-section-label">Nota (opcional)</label>
            <textarea
              className="input-dark resize-none"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Información adicional..."
              style={{ minHeight: '72px' }}
            />
          </div>

          <PoliticaNinosFields
            edadMinimaPago={edadMinimaPago}
            onChange={setEdadMinimaPago}
            tipo={tipo}
            disabled={loading}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="button" className="btn-modal-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-primary" disabled={loading || !nombre.trim()}>
              <Plus className="h-4 w-4" />
              {loading ? 'Creando...' : 'Crear viaje'}
            </button>
          </div>
        </form>
        </div>{/* fin scroll container */}
      </div>
    </div>
  );
};

export default ModalAgregarViaje;
