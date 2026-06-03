import React, { useEffect, useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';

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
  const [ninos, setNinos]             = useState([{ nombre: '', edad: '' }]);

  const etiquetasExistentes = [...new Set(
    state.habitaciones.map((h) => h.etiqueta).filter(Boolean)
  )].sort();

  useEffect(() => {
    if (!open) {
      setNumero('');
      setTipo('Single');
      setPersona1('');
      setPersona2('');
      setPersona3('');
      setTotal('');
      setPrecioNino('');
      setStackActivo(false);
      setEtiqueta('');
      setEtiquetaPersonalizada('');
      setHayNinos(false);
      setNinos([{ nombre: '', edad: '' }]);
    }
  }, [open]);

  if (!open) return null;

  const etiquetaFinal = etiqueta === '__nueva__' ? etiquetaPersonalizada.trim() : etiqueta;

  const agregarNino = () => setNinos([...ninos, { nombre: '', edad: '' }]);
  const eliminarNino = (idx) => setNinos(ninos.filter((_, i) => i !== idx));
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
      ninos
        .filter((n) => n.nombre.trim())
        .forEach((n) => {
          const label = n.edad ? `${n.nombre.trim()} (${n.edad} años)` : n.nombre.trim();
          personas.push({ n: label, pagos: [], esNino: true });
        });
    }

    agregarHabitacion({
      num: numero.trim(),
      tipo,
      total: stackActivo ? 0 : parseFloat(total) || 0,
      precioNino: parseFloat(precioNino) || 0,
      stack: stackActivo,
      nota: '',
      etiqueta: etiquetaFinal,
      personas,
    });

    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitulo}>Nueva habitación</h3>

        <div className={styles.formRow}>
          <label htmlFor="mHabNum">Número / ID</label>
          <input id="mHabNum" type="text" value={numero}
            onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 101" />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mTipo">Tipo</label>
          <select id="mTipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option>Single</option>
            <option>Doble</option>
            <option>Triple</option>
          </select>
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mEtiqueta">Centro / Etiqueta</label>
          <select id="mEtiqueta" value={etiqueta}
            onChange={(e) => {
              setEtiqueta(e.target.value);
              if (e.target.value !== '__nueva__') setEtiquetaPersonalizada('');
            }}>
            <option value="">Sin etiqueta</option>
            {etiquetasExistentes.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
            <option value="__nueva__">+ Nueva etiqueta...</option>
          </select>
        </div>

        {etiqueta === '__nueva__' && (
          <div className={styles.formRow}>
            <label htmlFor="mEtiquetaNueva">Nombre de la etiqueta</label>
            <input id="mEtiquetaNueva" type="text" value={etiquetaPersonalizada}
              onChange={(e) => setEtiquetaPersonalizada(e.target.value)}
              placeholder="Ej: Centro Nueva Isabela" autoFocus />
          </div>
        )}

        <div className={styles.formRow}>
          <label htmlFor="mP1">Persona 1</label>
          <input id="mP1" type="text" value={persona1}
            onChange={(e) => setPersona1(e.target.value)} placeholder="Nombre completo" />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mP2">
            Persona 2{' '}
            {tipo !== 'Single' && <span style={{ fontSize: '0.85em', color: '#666' }}>(opcional)</span>}
          </label>
          <input id="mP2" type="text" value={persona2}
            onChange={(e) => setPersona2(e.target.value)} placeholder="Nombre completo" />
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mP3">
            Persona 3{' '}
            {tipo === 'Triple' && <span style={{ fontSize: '0.85em', color: '#666' }}>(opcional)</span>}
          </label>
          <input id="mP3" type="text" value={persona3}
            onChange={(e) => setPersona3(e.target.value)}
            placeholder="Nombre completo" disabled={tipo !== 'Triple'} />
        </div>

        {/* ── NIÑOS ─────────────────────────────────────── */}
        <div className={styles.formRow}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hayNinos}
              onChange={(e) => {
                setHayNinos(e.target.checked);
                if (!e.target.checked) {
                  setNinos([{ nombre: '', edad: '' }]);
                  setPrecioNino('');
                }
              }}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>¿Hay niños en esta habitación?</span>
          </label>
        </div>

        {hayNinos && (
          <div style={{ marginBottom: '0.5rem' }}>
            {ninos.map((nino, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  value={nino.nombre}
                  onChange={(e) => actualizarNino(idx, 'nombre', e.target.value)}
                  placeholder={`Niño ${idx + 1} — nombre`}
                  className={styles.formRow}
                  style={{ flex: 2, margin: 0 }}
                />
                <input
                  type="number"
                  value={nino.edad}
                  onChange={(e) => actualizarNino(idx, 'edad', e.target.value)}
                  placeholder="Edad"
                  min="0" max="17"
                  className={styles.formRow}
                  style={{ flex: 1, minWidth: '70px', margin: 0 }}
                />
                {ninos.length > 1 && (
                  <button type="button" onClick={() => eliminarNino(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e', fontSize: '1.2rem', lineHeight: 1 }}
                    title="Quitar">×</button>
                )}
              </div>
            ))}
            <button type="button" className="button" onClick={agregarNino}
              style={{ fontSize: '0.8rem', padding: '4px 12px', marginTop: '0.25rem' }}>
              + Agregar otro niño
            </button>

            <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
              <label htmlFor="mPrecioNino">
                Precio por niño ($){' '}
                <span style={{ fontSize: '0.8em', color: '#888' }}>(opcional)</span>
              </label>
              <input id="mPrecioNino" type="number" value={precioNino}
                onChange={(e) => setPrecioNino(e.target.value)}
                placeholder="0" disabled={stackActivo} />
            </div>
          </div>
        )}
        {/* ── FIN NIÑOS ─────────────────────────────────── */}

        <div className={`${styles.formRow} ${styles.stackToggle}`}>
          <button type="button"
            className={stackActivo ? 'button button-primary' : 'button'}
            onClick={() => setStackActivo(!stackActivo)}>
            STACK
          </button>
          <span className={`${styles.stackLabel} ${stackActivo ? styles.stackLabelActive : ''}`}>
            {stackActivo ? 'Habitación stack (no paga)' : 'Habitación normal'}
          </span>
        </div>

        <div className={styles.formRow}>
          <label htmlFor="mTotal">Total habitación ($)</label>
          <input id="mTotal" type="number" value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="27700" disabled={stackActivo} />
        </div>

        <div className={styles.modalActions}>
          <button className="button" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="button" onClick={handleGuardar}>
            Guardar ↗
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarHabitacion;