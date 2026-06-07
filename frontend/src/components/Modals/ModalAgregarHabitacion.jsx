import React, { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { X, Plus, Minus, Gift } from 'lucide-react';

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
  const agregarNino   = () => setNinos([...ninos, { nombre: '', edad: '', gratis: false }]);
  const eliminarNino  = (idx) => setNinos(ninos.filter((_, i) => i !== idx));
  const actualizarNino = (idx, campo, valor) =>
    setNinos(ninos.map((n, i) => i === idx ? { ...n, [campo]: valor } : n));

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

          {/* Etiqueta */}
          <div>
            <label className="modal-section-label">Centro / Etiqueta</label>
            <select className="input-dark" value={etiqueta}
              onChange={(e) => { setEtiqueta(e.target.value); if (e.target.value !== '__nueva__') setEtiquetaPersonalizada(''); }}>
              <option value="">Sin etiqueta</option>
              {etiquetasExistentes.map((e) => <option key={e} value={e}>{e}</option>)}
              <option value="__nueva__">+ Nueva etiqueta...</option>
            </select>
          </div>

          {etiqueta === '__nueva__' && (
            <div>
              <label className="modal-section-label">Nombre de la etiqueta</label>
              <input className="input-dark" type="text" value={etiquetaPersonalizada}
                onChange={(e) => setEtiquetaPersonalizada(e.target.value)}
                placeholder="Ej: Centro Nueva Isabela" autoFocus />
            </div>
          )}

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

          {/* Niños toggle */}
          <div>
            <button
              type="button"
              onClick={() => { setHayNinos(!hayNinos); if (hayNinos) { setNinos([{ nombre: '', edad: '', gratis: false }]); setPrecioNino(''); } }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: hayNinos ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hayNinos ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{ background: hayNinos ? '#f59e0b' : 'rgba(255,255,255,0.1)', transition: 'background 150ms' }}
              >
                {hayNinos && <span className="text-[10px] font-bold text-black">✓</span>}
              </div>
              <span className="text-sm font-medium" style={{ color: hayNinos ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
                ¿Hay niños en esta habitación?
              </span>
            </button>
          </div>

          {hayNinos && (
            <div className="space-y-2 pl-1">
              {ninos.map((nino, idx) => (
                <div key={idx} className="rounded-xl p-3 space-y-2"
                  style={{ background: nino.gratis ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${nino.gratis ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 200ms' }}>
                  <div className="flex gap-2 items-center">
                    <input className="input-dark flex-1" type="text" value={nino.nombre}
                      onChange={(e) => actualizarNino(idx, 'nombre', e.target.value)}
                      placeholder={`Niño ${idx + 1} — nombre`} />
                    <input className="input-dark" type="number" value={nino.edad}
                      onChange={(e) => actualizarNino(idx, 'edad', e.target.value)}
                      placeholder="Edad" min="0" max="17" style={{ width: '70px' }} />
                    {ninos.length > 1 && (
                      <button type="button" onClick={() => eliminarNino(idx)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => actualizarNino(idx, 'gratis', !nino.gratis)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-left w-full"
                    style={{ background: nino.gratis ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${nino.gratis ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
                      style={{ background: nino.gratis ? '#10b981' : 'rgba(255,255,255,0.1)', transition: 'background 150ms' }}>
                      {nino.gratis && <span className="text-[9px] font-bold text-black">✓</span>}
                    </div>
                    <Gift className="h-3 w-3 shrink-0" style={{ color: nino.gratis ? '#34d399' : 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs" style={{ color: nino.gratis ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
                      {nino.gratis ? 'No paga — entra gratis' : 'Marcar como gratis (no paga)'}
                    </span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={agregarNino}
                className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors px-1 py-0.5">
                <Plus className="h-3 w-3" /> Agregar otro niño
              </button>
              <div className="mt-2">
                <label className="modal-section-label">Precio por niño ($) (opcional)</label>
                <input className="input-dark" type="number" value={precioNino}
                  onChange={(e) => setPrecioNino(e.target.value)} placeholder="0" disabled={stackActivo} />
              </div>
            </div>
          )}

          {/* STACK toggle */}
          <div>
            <button
              type="button"
              onClick={() => setStackActivo(!stackActivo)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: stackActivo ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${stackActivo ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{ background: stackActivo ? '#10b981' : 'rgba(255,255,255,0.1)', transition: 'background 150ms' }}
              >
                {stackActivo && <span className="text-[10px] font-bold text-black">✓</span>}
              </div>
              <div className="text-left">
                <span className="text-sm font-bold" style={{ color: stackActivo ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
                  STACK
                </span>
                <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {stackActivo ? 'Habitación stack (no paga)' : 'Habitación normal'}
                </span>
              </div>
            </button>
          </div>

          {/* Total */}
          <div>
            <label className="modal-section-label">Total habitación ($) *</label>
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
