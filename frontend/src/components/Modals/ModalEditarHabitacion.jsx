import { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { X, Save, Minus } from 'lucide-react';
import { EtiquetaFields, NinosFields, StackToggle } from './HabitacionFormFields';
import * as api from '../../utils/api';
import { capacidadPorTipo } from '../../utils/calculos';

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

      const slots = capacidadPorTipo(habActual.tipo);
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

  const numSlots = capacidadPorTipo(tipo);

  const etiquetaFinal    = etiqueta === '__nueva__' ? etiquetaNueva.trim() : etiqueta;
  const actualizarPersona = (idx, valor) => setPersonas((prev) => {
    const copy = [...prev];
    copy[idx] = { ...(copy[idx] || {}), nombre: valor };
    return copy;
  });
  const quitarPersona = (idx) => setPersonas((prev) => {
    const copy = prev.filter((_, i) => i !== idx);
    while (copy.length < numSlots) copy.push({ nombre: '' });
    return copy;
  });
  const numInputs = Math.max(numSlots, personas.length);

  const handleTipoChange = (nuevoTipo) => {
    setTipo(nuevoTipo);
    const slots = capacidadPorTipo(nuevoTipo);
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
      const personasOriginales = (habActual.personas || []).filter(
        (p) => !p.esNino && !/\(\d+ años\)/.test(p.n)
      );
      for (const original of personasOriginales) {
        const editada = personas.find((p) => p.id === original.id);
        const nombre  = editada?.nombre.trim() || '';
        if (!nombre) {
          await api.eliminarPersona(original.id);
        } else if (nombre !== original.n) {
          await api.actualizarNombrePersona(original.id, nombre);
        }
      }
      for (const editada of personas) {
        if (!editada.id && editada.nombre.trim()) {
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

      // Al final: el backend ajusta el tipo al borrar personas; el tipo elegido aquí debe prevalecer
      await editarHabitacion(habActual.id, {
        num: num.trim(), tipo,
        total: stackActivo ? 0 : parseFloat(total) || 0,
        precioNino: hayNinos ? (parseFloat(precioNino) || 0) : 0,
        etiqueta: etiquetaFinal, stack: stackActivo,
      });

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

          <EtiquetaFields
            etiqueta={etiqueta}
            onEtiquetaChange={setEtiqueta}
            nueva={etiquetaNueva}
            onNuevaChange={setEtiquetaNueva}
            opciones={etiquetasExistentes}
            disabled={loading}
          />

          {/* Personas adultas */}
          <div>
            <label className="modal-section-label">Personas</label>
            <div className="space-y-2">
              {Array.from({ length: numInputs }).map((_, idx) => (
                <div key={personas[idx]?.id ?? `nuevo-${idx}`} className="flex items-center gap-2">
                  <input
                    className="input-dark flex-1"
                    type="text"
                    value={personas[idx]?.nombre ?? ''}
                    onChange={(e) => actualizarPersona(idx, e.target.value)}
                    placeholder={`Persona ${idx + 1}${idx === 0 ? ' (obligatorio)' : ' (opcional)'}`}
                    disabled={loading}
                  />
                  {personas[idx]?.nombre && (
                    <button type="button" onClick={() => quitarPersona(idx)} disabled={loading}
                      title="Quitar persona"
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
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
            disabled={loading}
          />

          <StackToggle activo={stackActivo} onChange={setStackActivo} disabled={loading} />

          <div>
            <label className="modal-section-label">Total habitación</label>
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
