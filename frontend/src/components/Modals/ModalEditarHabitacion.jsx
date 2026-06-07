import React, { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { X, Save, Plus, Minus, Gift } from 'lucide-react';
import * as api from '../../utils/api';

const ModalEditarHabitacion = ({ habitacion, open, onClose }) => {
  const { editarHabitacion, cargarHabitaciones, state } = useHabitacionesContext();

  const [num, setNum]               = useState('');
  const [tipo, setTipo]             = useState('Single');
  const [total, setTotal]           = useState('');
  const [precioNino, setPrecioNino] = useState('');
  const [etiqueta, setEtiqueta]     = useState('');
  const [etiquetaNueva, setEtiquetaNueva] = useState('');
  const [stackActivo, setStackActivo] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [hayNinos, setHayNinos]     = useState(false);
  const [ninos, setNinos]           = useState([{ nombre: '', edad: '', gratis: false }]);
  const [personas, setPersonas]     = useState([]);

  const etiquetasExistentes = [...new Set(
    state.habitaciones.map((h) => h.etiqueta).filter(Boolean)
  )].sort();

  const habActual = state.habitaciones.find((h) => h.id === habitacion?.id) || habitacion;

  useEffect(() => {
    if (habActual && open) {
      setNum(habActual.num || '');
      setTipo(habActual.tipo || 'Single');
      setTotal(habActual.total ?? '');
      setEtiqueta(habActual.etiqueta || '');
      setEtiquetaNueva('');
      setStackActivo(!!habActual.stack);

      const todasPersonas = habActual.personas || [];
      const ninosExistentes = todasPersonas.filter((p) => p.esNino || /\(\d+ años\)/.test(p.n));
      const adultos = todasPersonas.filter((p) => !p.esNino && !/\(\d+ años\)/.test(p.n));

      const slots = (habActual.tipo === 'Triple' ? 3 : habActual.tipo === 'Doble' ? 2 : 1);
      const loaded = adultos.map((p) => ({ id: p.id, nombre: p.n }));
      while (loaded.length < slots) loaded.push({ nombre: '' });
      setPersonas(loaded);

      if (ninosExistentes.length > 0) {
        setHayNinos(true);
        setNinos(ninosExistentes.map((p) => {
          const match = p.n.match(/^(.+?)\s*\((\d+) años\)$/);
          return match
            ? { id: p.id, nombre: match[1].trim(), edad: match[2], gratis: !!p.esGratis }
            : { id: p.id, nombre: p.n, edad: '', gratis: !!p.esGratis };
        }));
        setPrecioNino(habActual.precioNino ?? '');
      } else {
        setHayNinos(false);
        setNinos([{ nombre: '', edad: '', gratis: false }]);
        setPrecioNino('');
      }
    }
  }, [habActual, open]);

  if (!open || !habitacion) return null;

  const numSlots = tipo === 'Triple' ? 3 : tipo === 'Doble' ? 2 : 1;

  const etiquetaFinal    = etiqueta === '__nueva__' ? etiquetaNueva.trim() : etiqueta;
  const agregarNino      = () => setNinos([...ninos, { nombre: '', edad: '', gratis: false }]);
  const eliminarNino     = (idx) => setNinos(ninos.filter((_, i) => i !== idx));
  const actualizarNino   = (idx, campo, valor) => setNinos(ninos.map((n, i) => i === idx ? { ...n, [campo]: valor } : n));
  const actualizarPersona = (idx, valor) => setPersonas(personas.map((p, i) => i === idx ? { ...p, nombre: valor } : p));

  const handleTipoChange = (nuevoTipo) => {
    setTipo(nuevoTipo);
    const slots = nuevoTipo === 'Triple' ? 3 : nuevoTipo === 'Doble' ? 2 : 1;
    setPersonas((prev) => {
      const copy = [...prev];
      while (copy.length < slots) copy.push({ nombre: '' });
      return copy;
    });
  };

  const handleGuardar = async () => {
    if (!num.trim() || !tipo) return;
    setLoading(true);
    try {
      await editarHabitacion(habActual.id, {
        num: num.trim(), tipo,
        total: stackActivo ? 0 : parseFloat(total) || 0,
        precioNino: hayNinos ? (parseFloat(precioNino) || 0) : 0,
        etiqueta: etiquetaFinal, stack: stackActivo,
      });

      const personasOriginales = (habActual.personas || []).filter(
        (p) => !p.esNino && !/\(\d+ años\)/.test(p.n)
      );
      for (let i = 0; i < personas.length; i++) {
        const original = personasOriginales[i];
        const editada  = personas[i];
        if (!editada.nombre.trim()) continue;
        if (original && editada.nombre.trim() !== original.n) {
          await api.actualizarNombrePersona(original.id, editada.nombre.trim());
        } else if (!original) {
          await api.agregarPersonaHabitacion(habActual.id, { nombre: editada.nombre.trim(), esNino: false });
        }
      }

      const ninosOriginales = (habActual.personas || []).filter((p) => p.esNino || /\(\d+ años\)/.test(p.n));
      const ninosValidos = hayNinos ? ninos.filter((n) => n.nombre.trim()) : [];

      for (const original of ninosOriginales) {
        const sigue = ninosValidos.find((n) => n.id === original.id);
        if (!sigue) await api.eliminarPersona(original.id);
      }

      for (const nino of ninosValidos) {
        const label = nino.edad ? `${nino.nombre.trim()} (${nino.edad} años)` : nino.nombre.trim();
        if (nino.id) {
          const original = ninosOriginales.find((n) => n.id === nino.id);
          if (original && label !== original.n) await api.actualizarNombrePersona(nino.id, label);
          if (original && !!nino.gratis !== !!original.esGratis) await api.actualizarGratisPersona(nino.id, !!nino.gratis);
        } else {
          await api.agregarPersonaHabitacion(habActual.id, { nombre: label, esNino: true, esGratis: !!nino.gratis });
        }
      }

      if (state.selectedViajeId) await cargarHabitaciones(state.selectedViajeId);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la habitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-dark" onClick={onClose}>
      <div className="modal-card-dark w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Cyan orb */}
        <div className="orb w-36 h-36 pointer-events-none" style={{ top: '-30px', right: '-30px', background: '#06b6d4', opacity: 0.09 }} />

        {/* Scroll container */}
        <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
          style={{ background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">Editar habitación</h2>
            <p className="text-xs text-gray-600 mt-0.5">Hab. {habitacion.num}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-6 py-5 space-y-4">

          <div>
            <label className="modal-section-label">Número / ID</label>
            <input className="input-dark" type="text" value={num}
              onChange={(e) => setNum(e.target.value)} placeholder="Ej: 101" disabled={loading} />
          </div>

          <div>
            <label className="modal-section-label">Tipo</label>
            <select className="input-dark" value={tipo} onChange={(e) => handleTipoChange(e.target.value)} disabled={loading}>
              <option>Single</option>
              <option>Doble</option>
              <option>Triple</option>
            </select>
          </div>

          <div>
            <label className="modal-section-label">Centro / Etiqueta</label>
            <select className="input-dark" value={etiqueta}
              onChange={(e) => { setEtiqueta(e.target.value); if (e.target.value !== '__nueva__') setEtiquetaNueva(''); }}
              disabled={loading}>
              <option value="">Sin etiqueta</option>
              {etiquetasExistentes.map((e) => <option key={e} value={e}>{e}</option>)}
              <option value="__nueva__">+ Nueva etiqueta...</option>
            </select>
          </div>

          {etiqueta === '__nueva__' && (
            <div>
              <label className="modal-section-label">Nombre de la etiqueta</label>
              <input className="input-dark" type="text" value={etiquetaNueva}
                onChange={(e) => setEtiquetaNueva(e.target.value)}
                placeholder="Ej: Centro Nueva Isabela" autoFocus disabled={loading} />
            </div>
          )}

          {/* Personas adultas */}
          <div>
            <label className="modal-section-label">Personas</label>
            <div className="space-y-2">
              {Array.from({ length: numSlots }).map((_, idx) => (
                <input
                  key={idx}
                  className="input-dark"
                  type="text"
                  value={personas[idx]?.nombre ?? ''}
                  onChange={(e) => actualizarPersona(idx, e.target.value)}
                  placeholder={`Persona ${idx + 1}${idx === 0 ? ' (obligatorio)' : ' (opcional)'}`}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Niños toggle */}
          <div>
            <button type="button" disabled={loading}
              onClick={() => { setHayNinos(!hayNinos); if (hayNinos) { setNinos([{ nombre: '', edad: '', gratis: false }]); setPrecioNino(''); } }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: hayNinos ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hayNinos ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{ background: hayNinos ? '#f59e0b' : 'rgba(255,255,255,0.1)', transition: 'background 150ms' }}>
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
                      placeholder={`Niño ${idx + 1} — nombre`} disabled={loading} />
                    <input className="input-dark" type="number" value={nino.edad}
                      onChange={(e) => actualizarNino(idx, 'edad', e.target.value)}
                      placeholder="Edad" min="0" max="17" style={{ width: '70px' }} disabled={loading} />
                    {ninos.length > 1 && (
                      <button type="button" onClick={() => eliminarNino(idx)} disabled={loading}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button type="button" disabled={loading}
                    onClick={() => actualizarNino(idx, 'gratis', !nino.gratis)}
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
              <button type="button" onClick={agregarNino} disabled={loading}
                className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors px-1 py-0.5">
                <Plus className="h-3 w-3" /> Agregar otro niño
              </button>
              <div className="mt-2">
                <label className="modal-section-label">Precio por niño ($)</label>
                <input className="input-dark" type="number" value={precioNino}
                  onChange={(e) => setPrecioNino(e.target.value)} placeholder="0"
                  disabled={stackActivo || loading} />
              </div>
            </div>
          )}

          {/* STACK toggle */}
          <div>
            <button type="button" disabled={loading}
              onClick={() => setStackActivo(!stackActivo)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: stackActivo ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${stackActivo ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{ background: stackActivo ? '#10b981' : 'rgba(255,255,255,0.1)', transition: 'background 150ms' }}>
                {stackActivo && <span className="text-[10px] font-bold text-black">✓</span>}
              </div>
              <span className="text-sm font-bold" style={{ color: stackActivo ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
                STACK
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {stackActivo ? '— no paga' : '— habitación normal'}
              </span>
            </button>
          </div>

          <div>
            <label className="modal-section-label">Total habitación ($)</label>
            <input className="input-dark" type="number" value={total}
              onChange={(e) => setTotal(e.target.value)} placeholder="0"
              disabled={stackActivo || loading} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="button" className="btn-modal-primary" onClick={handleGuardar}
              disabled={loading || !num.trim()}>
              <Save className="h-3.5 w-3.5" />
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
        </div>{/* fin scroll container */}
      </div>
    </div>
  );
};

export default ModalEditarHabitacion;
