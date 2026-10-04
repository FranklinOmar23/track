import { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { X, Plus } from 'lucide-react';
import { EtiquetaFields, NinosFields, StackToggle } from './HabitacionFormFields';

const ModalAgregarHabitacion = ({ open, onClose }) => {
  const { agregarHabitacion, state } = useHabitacionesContext();
  const [numero, setNumero]           = useState('');
  const [tipo, setTipo]               = useState('Single');
  const [persona1, setPersona1]       = useState('');
  const [persona2, setPersona2]       = useState('');
  const [persona3, setPersona3]       = useState('');
  const [total, setTotal]             = useState('');
  const [precioNino, setPrecioNino]   = useState('');
  const [stackActivo, setStackActivo] = useState(false);
  const [etiqueta, setEtiqueta]       = useState('');
  const [etiquetaPersonalizada, setEtiquetaPersonalizada] = useState('');
  const [hayNinos, setHayNinos]       = useState(false);
  const [ninos, setNinos]             = useState([{ nombre: '', edad: '', gratis: false }]);

  const etiquetasExistentes = [...new Set(
    state.habitaciones.map((h) => h.etiqueta).filter(Boolean)
  )].sort();

  useEffect(() => {
    if (!open) {
      setNumero(''); setTipo('Single'); setPersona1(''); setPersona2(''); setPersona3('');
      setTotal(''); setPrecioNino(''); setStackActivo(false); setEtiqueta('');
      setEtiquetaPersonalizada(''); setHayNinos(false); setNinos([{ nombre: '', edad: '', gratis: false }]);
    }
  }, [open]);

  if (!open) return null;

  const etiquetaFinal = etiqueta === '__nueva__' ? etiquetaPersonalizada.trim() : etiqueta;

  const handleGuardar = () => {
    if (!numero.trim() || !persona1.trim() || (!stackActivo && !total)) {
      alert('Complete los datos obligatorios.');
      return;
    }
    const personas = [];
    if (persona1.trim()) personas.push({ n: persona1.trim(), pagos: [] });
    if (persona2.trim()) personas.push({ n: persona2.trim(), pagos: [] });
    if (tipo === 'Triple' && persona3.trim()) personas.push({ n: persona3.trim(), pagos: [] });
    if (hayNinos) {
      ninos.filter((n) => n.nombre.trim()).forEach((n) => {
        const label = n.edad ? `${n.nombre.trim()} (${n.edad} años)` : n.nombre.trim();
        personas.push({ n: label, pagos: [], esNino: true, esGratis: !!n.gratis });
      });
    }
    agregarHabitacion({
      num: numero.trim(), tipo,
      total: stackActivo ? 0 : parseFloat(total) || 0,
      precioNino: parseFloat(precioNino) || 0,
      stack: stackActivo, nota: '', etiqueta: etiquetaFinal, personas,
    });
    onClose();
  };

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Teal orb */}
        <div className="orb w-40 h-40 pointer-events-none" style={{ top: '-40px', left: '-40px', background: '#0d9488', opacity: 0.1 }} />

        {/* Scroll container */}
        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
          style={{ background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">Nueva habitación</h2>
            <p className="text-xs text-gray-600 mt-0.5">Completa los datos</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-6 py-5 space-y-4">

          {/* Número */}
          <div>
            <label className="modal-section-label">Número / ID *</label>
            <input className="input-dark" type="text" value={numero}
              onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 101" autoFocus />
          </div>

          {/* Tipo */}
          <div>
            <label className="modal-section-label">Tipo</label>
            <select className="input-dark" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Single</option>
              <option>Doble</option>
              <option>Triple</option>
            </select>
          </div>

          <EtiquetaFields
            etiqueta={etiqueta}
            onEtiquetaChange={setEtiqueta}
            nueva={etiquetaPersonalizada}
            onNuevaChange={setEtiquetaPersonalizada}
            opciones={etiquetasExistentes}
          />

          {/* Personas */}
          <div>
            <label className="modal-section-label">Personas</label>
            <div className="space-y-2">
              <input className="input-dark" type="text" value={persona1}
                onChange={(e) => setPersona1(e.target.value)} placeholder="Persona 1 (obligatorio)" />
              <input className="input-dark" type="text" value={persona2}
                onChange={(e) => setPersona2(e.target.value)} placeholder="Persona 2 (opcional)" />
              {tipo === 'Triple' && (
                <input className="input-dark" type="text" value={persona3}
                  onChange={(e) => setPersona3(e.target.value)} placeholder="Persona 3 (opcional)" />
              )}
            </div>
          </div>

          <NinosFields
            hayNinos={hayNinos}
            onHayNinosChange={setHayNinos}
            ninos={ninos}
            onNinosChange={setNinos}
            precioNino={precioNino}
            onPrecioNinoChange={setPrecioNino}
            stackActivo={stackActivo}
          />

          <StackToggle activo={stackActivo} onChange={setStackActivo} />

          {/* Total */}
          <div>
            <label className="modal-section-label">Total habitación *</label>
            <input className="input-dark" type="number" value={total}
              onChange={(e) => setTotal(e.target.value)} placeholder="27700" disabled={stackActivo} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="button" className="btn-modal-secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn-modal-primary" onClick={handleGuardar}>
              <Plus className="h-4 w-4" />
              Guardar habitación
            </button>
          </div>
        </div>
        </div>{/* fin scroll container */}
      </div>
    </div>
  );
};

export default ModalAgregarHabitacion;
