import React, { useState, useEffect } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';
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
  const [ninos, setNinos]           = useState([{ nombre: '', edad: '' }]);
  // Personas adultas editables: [{ id, nombre }]
  const [personas, setPersonas]     = useState([]);

  const etiquetasExistentes = [...new Set(
    state.habitaciones.map((h) => h.etiqueta).filter(Boolean)
  )].sort();

  // Habitación fresca del contexto
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
      const ninosExistentes = todasPersonas.filter(
        (p) => p.esNino || /\(\d+ años\)/.test(p.n)
      );
      const adultos = todasPersonas.filter(
        (p) => !p.esNino && !/\(\d+ años\)/.test(p.n)
      );

      // Personas adultas editables
      setPersonas(adultos.map((p) => ({ id: p.id, nombre: p.n })));

      if (ninosExistentes.length > 0) {
        setHayNinos(true);
        setNinos(ninosExistentes.map((p) => {
          const match = p.n.match(/^(.+?)\s*\((\d+) años\)$/);
          return match
            ? { id: p.id, nombre: match[1].trim(), edad: match[2] }
            : { id: p.id, nombre: p.n, edad: '' };
        }));
        setPrecioNino(habActual.precioNino ?? '');
      } else {
        setHayNinos(false);
        setNinos([{ nombre: '', edad: '' }]);
        setPrecioNino('');
      }
    }
  }, [habActual, open]);

  if (!open || !habitacion) return null;

  const etiquetaFinal = etiqueta === '__nueva__' ? etiquetaNueva.trim() : etiqueta;

  const agregarNino    = () => setNinos([...ninos, { nombre: '', edad: '' }]);
  const eliminarNino   = (idx) => setNinos(ninos.filter((_, i) => i !== idx));
  const actualizarNino = (idx, campo, valor) =>
    setNinos(ninos.map((n, i) => i === idx ? { ...n, [campo]: valor } : n));
  const actualizarPersona = (idx, valor) =>
    setPersonas(personas.map((p, i) => i === idx ? { ...p, nombre: valor } : p));

  const handleGuardar = async () => {
    if (!num.trim() || !tipo) return;
    setLoading(true);
    try {
      // 1. Editar campos de la habitación
      await editarHabitacion(habActual.id, {
        num: num.trim(),
        tipo,
        total: stackActivo ? 0 : parseFloat(total) || 0,
        precioNino: hayNinos ? (parseFloat(precioNino) || 0) : 0,
        etiqueta: etiquetaFinal,
        stack: stackActivo,
      });

      // 2. Editar nombres de personas adultas que hayan cambiado
      const personasOriginales = (habActual.personas || []).filter(
        (p) => !p.esNino && !/\(\d+ años\)/.test(p.n)
      );
      for (let i = 0; i < personas.length; i++) {
        const original = personasOriginales[i];
        const editada  = personas[i];
        if (original && editada.nombre.trim() && editada.nombre.trim() !== original.n) {
          await api.actualizarNombrePersona(original.id, editada.nombre.trim());
        }
      }

      // 3. Sincronizar niños
      const ninosOriginales = (habActual.personas || []).filter(
        (p) => p.esNino || /\(\d+ años\)/.test(p.n)
      );
      const ninosValidos = hayNinos ? ninos.filter((n) => n.nombre.trim()) : [];

      // 3a. Eliminar los niños que ya no están en la lista
      for (const original of ninosOriginales) {
        const sigue = ninosValidos.find((n) => n.id === original.id);
        if (!sigue) {
          await api.eliminarPersona(original.id);
        }
      }

      // 3b. Actualizar nombres de niños existentes o crear los nuevos
      for (const nino of ninosValidos) {
        const label = nino.edad ? `${nino.nombre.trim()} (${nino.edad} años)` : nino.nombre.trim();
        if (nino.id) {
          const original = ninosOriginales.find((n) => n.id === nino.id);
          if (original && label !== original.n) {
            await api.actualizarNombrePersona(nino.id, label);
          }
        } else {
          await api.agregarPersonaHabitacion(habActual.id, { nombre: label, esNino: true });
        }
      }

      // 4. Recargar habitaciones para reflejar todos los cambios
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Editar habitación {habitacion.num}</h2>
          <button className={styles.closeBtn} type="button" onClick={onClose}>×</button>
        </div>

        {/* Número e ID */}
        <div className={styles.formRow}>
          <label>Número / ID</label>
          <input type="text" value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="Ej: 101" disabled={loading} />
        </div>

        {/* Tipo */}
        <div className={styles.formRow}>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={loading}>
            <option>Single</option>
            <option>Doble</option>
            <option>Triple</option>
          </select>
        </div>

        {/* Etiqueta */}
        <div className={styles.formRow}>
          <label>Centro / Etiqueta</label>
          <select value={etiqueta}
            onChange={(e) => {
              setEtiqueta(e.target.value);
              if (e.target.value !== '__nueva__') setEtiquetaNueva('');
            }}
            disabled={loading}>
            <option value="">Sin etiqueta</option>
            {etiquetasExistentes.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
            <option value="__nueva__">+ Nueva etiqueta...</option>
          </select>
        </div>
        {etiqueta === '__nueva__' && (
          <div className={styles.formRow}>
            <label>Nombre de la etiqueta</label>
            <input type="text" value={etiquetaNueva}
              onChange={(e) => setEtiquetaNueva(e.target.value)}
              placeholder="Ej: Centro Nueva Isabela"
              autoFocus disabled={loading} />
          </div>
        )}

        {/* ── PERSONAS ADULTAS ──────────────────────────── */}
        {personas.length > 0 && (
          <div className={styles.detailsSection || ''} style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: '0.4rem' }}>
              Personas
            </label>
            {personas.map((p, idx) => (
              <div key={p.id || idx} className={styles.formRow}>
                <label>Persona {idx + 1}</label>
                <input type="text" value={p.nombre}
                  onChange={(e) => actualizarPersona(idx, e.target.value)}
                  placeholder="Nombre completo" disabled={loading} />
              </div>
            ))}
          </div>
        )}

        {/* ── NIÑOS ─────────────────────────────────────── */}
        <div className={styles.formRow}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={hayNinos}
              onChange={(e) => {
                setHayNinos(e.target.checked);
                if (!e.target.checked) {
                  setNinos([{ nombre: '', edad: '' }]);
                  setPrecioNino('');
                }
              }}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              disabled={loading} />
            <span>¿Hay niños en esta habitación?</span>
          </label>
        </div>

        {hayNinos && (
          <div style={{ marginBottom: '0.5rem' }}>
            {ninos.map((nino, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input type="text" value={nino.nombre}
                  onChange={(e) => actualizarNino(idx, 'nombre', e.target.value)}
                  placeholder={`Niño ${idx + 1} — nombre`}
                  className={styles.formRow}
                  style={{ flex: 2, margin: 0 }}
                  disabled={loading} />
                <input type="number" value={nino.edad}
                  onChange={(e) => actualizarNino(idx, 'edad', e.target.value)}
                  placeholder="Edad" min="0" max="17"
                  className={styles.formRow}
                  style={{ flex: 1, minWidth: '70px', margin: 0 }}
                  disabled={loading} />
                {ninos.length > 1 && (
                  <button type="button" onClick={() => eliminarNino(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e', fontSize: '1.2rem', lineHeight: 1 }}
                    disabled={loading}>×</button>
                )}
              </div>
            ))}
            <button type="button" className="button" onClick={agregarNino}
              style={{ fontSize: '0.8rem', padding: '4px 12px', marginTop: '0.25rem' }}
              disabled={loading}>
              + Agregar otro niño
            </button>
            <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
              <label>
                Precio por niño ($){' '}
                <span style={{ fontSize: '0.8em', color: '#888' }}>(opcional)</span>
              </label>
              <input type="number" value={precioNino}
                onChange={(e) => setPrecioNino(e.target.value)}
                placeholder="0" disabled={stackActivo || loading} />
            </div>
          </div>
        )}
        {/* ── FIN NIÑOS ─────────────────────────────────── */}

        {/* Stack */}
        <div className={`${styles.formRow} ${styles.stackToggle}`}>
          <button type="button"
            className={stackActivo ? 'button button-primary' : 'button'}
            onClick={() => setStackActivo(!stackActivo)}
            disabled={loading}>
            STACK
          </button>
          <span className={`${styles.stackLabel} ${stackActivo ? styles.stackLabelActive : ''}`}>
            {stackActivo ? 'Habitación stack (no paga)' : 'Habitación normal'}
          </span>
        </div>

        {/* Total */}
        <div className={styles.formRow}>
          <label>Total habitación ($)</label>
          <input type="number" value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0" disabled={stackActivo || loading} />
        </div>

        <div className={styles.modalActions}>
          <button type="button" className="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="button button-primary"
            onClick={handleGuardar}
            disabled={loading || !num.trim()}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarHabitacion;