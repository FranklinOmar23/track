import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useDivisa } from '../../hooks/useDivisa';
import { calcularTotalPagado, calcularCuotaPersona } from '../../utils/calculos';
import ModalRegistrarPago from './ModalRegistrarPago';
import ModalMoverPersona from './ModalMoverPersona';
import ModalEditarHabitacion from './ModalEditarHabitacion';
import styles from '../styles/components/modals.module.css';

const ModalDetallesHabitacion = ({ habitacion: habitacionProp, onClose }) => {
  const { actualizarNota, actualizarEtiqueta, eliminarHabitacion, state } = useHabitacionesContext();
  const { fmt } = useDivisa();

  // Leer siempre del contexto para reactividad
  const habitacion =
    state.habitaciones.find((h) => h.id === habitacionProp.id) || habitacionProp;

  const [nota, setNota] = useState(habitacion.nota || '');
  const [etiqueta, setEtiqueta] = useState(habitacion.etiqueta || '');
  const [etiquetaPersonalizada, setEtiquetaPersonalizada] = useState('');
  const [modalPago, setModalPago] = useState(null);
  const [modalMover, setModalMover] = useState(null);
  const [editarOpen, setEditarOpen] = useState(false); // ← nuevo

  const etiquetasExistentes = [...new Set(
    state.habitaciones.map((h) => h.etiqueta).filter(Boolean)
  )].sort();

  const handleSaveNota = () => actualizarNota(habitacion.id, nota);

  const handleSaveEtiqueta = (valor) => {
    const nueva = valor === '__nueva__' ? etiquetaPersonalizada.trim() : valor;
    actualizarEtiqueta(habitacion.id, nueva);
    setEtiqueta(nueva);
    if (valor !== '__nueva__') setEtiquetaPersonalizada('');
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar esta habitación?')) {
      eliminarHabitacion(habitacion.id);
      onClose();
    }
  };

  const totalPagado = calcularTotalPagado(habitacion);
  const cantidadNinos = habitacion.personas.filter(
    (p) => p.esNino || /\(\d+ años\)/.test(p.n || '')
  ).length;
  const totalReal = habitacion.total + (Number(habitacion.precioNino) || 0) * cantidadNinos;
  const pendiente = Math.max(0, totalReal - totalPagado);

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Hab {habitacion.num} — {habitacion.tipo}</h2>
            <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
          </div>

          {/* Etiqueta editable */}
          <div className={styles.detailsSection}>
            <h3 className={styles.sectionTitle}>ETIQUETA / CENTRO</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={etiqueta}
                onChange={(e) => {
                  setEtiqueta(e.target.value);
                  if (e.target.value !== '__nueva__') handleSaveEtiqueta(e.target.value);
                }}
                className={styles.formRow}
                style={{ flex: 1, minWidth: '150px' }}
              >
                <option value="">Sin etiqueta</option>
                {etiquetasExistentes.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
                <option value="__nueva__">+ Nueva etiqueta...</option>
              </select>

              {etiqueta === '__nueva__' && (
                <>
                  <input
                    type="text"
                    value={etiquetaPersonalizada}
                    onChange={(e) => setEtiquetaPersonalizada(e.target.value)}
                    placeholder="Nombre de la etiqueta"
                    className={styles.formRow}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleSaveEtiqueta('__nueva__')}
                    disabled={!etiquetaPersonalizada.trim()}
                  >
                    Guardar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.detailsSection}>
            <h3 className={styles.sectionTitle}>PERSONAS</h3>
            {habitacion.personas.filter((p) => p.n).map((persona, personaIndex) => (
              <div key={persona.id} className={styles.personaCard}>
                <div className={styles.personaName}>{persona.n}</div>
                <div className={styles.pagosList}>
                  {(persona.pagos || []).map((pago, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles.pagoItemButton}
                      onClick={() => setModalPago({ habId: habitacion.id, perIdx: personaIndex, persona, pago })}
                    >
                      {pago.mes} ${pago.monto.toLocaleString()}
                    </button>
                  ))}
                  {(!persona.pagos || persona.pagos.length === 0) && (
                    <span className={styles.pagoItem}>Sin pagos</span>
                  )}
                </div>
                <div className={styles.personaTotals}>
                  <span>Pagado: <strong>{fmt(persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0)}</strong></span>
                  <span>Pendiente: <strong className={styles.totalValueDanger}>
                    -{fmt(Math.max(0, calcularCuotaPersona(habitacion, persona) - (persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0)))}
                  </strong></span>
                </div>
                <div className={styles.personaActions}>
                  <button type="button" onClick={() => setModalPago({ habId: habitacion.id, perIdx: personaIndex, persona, pago: null })}>+ pago</button>
                  <button type="button" onClick={() => setModalMover({ habOrigen: habitacion.id, perIdx: personaIndex, persona })}>Mover</button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.detailsSection}>
            <h3 className={styles.sectionTitle}>NOTAS</h3>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={handleSaveNota}
              placeholder="Añadir notas..."
              rows={3}
              className={styles.formRow}
              style={{ width: '100%' }}
            />
          </div>

          <div className={styles.totalsGrid}>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Total habitación</span>
              <span className={styles.totalValue}>{fmt(habitacion.total)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Recaudado</span>
              <span className={`${styles.totalValue} ${styles.totalValueSuccess}`}>{fmt(totalPagado)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Pendiente</span>
              <span className={`${styles.totalValue} ${pendiente > 0 ? styles.totalValueDanger : styles.totalValueSuccess}`}>
                {pendiente > 0 ? `-${fmt(pendiente)}` : '✓'}
              </span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Precio niño</span>
              <span className={styles.totalValue}>{fmt(habitacion.precioNino)}</span>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className="button button-danger" onClick={handleDelete}>
              Eliminar hab
            </button>
            <button type="button" className="button" onClick={onClose}>
              Cerrar
            </button>
            {/* ← nuevo botón editar */}
            <button type="button" className="button button-primary" onClick={() => setEditarOpen(true)}>
              ✏ Editar habitación
            </button>
          </div>
        </div>
      </div>

      {modalPago && (
        <ModalRegistrarPago
          habId={modalPago.habId}
          perIdx={modalPago.perIdx}
          persona={modalPago.persona}
          pago={modalPago.pago}
          onClose={() => setModalPago(null)}
        />
      )}

      {modalMover && (
        <ModalMoverPersona
          habOrigen={modalMover.habOrigen}
          perIdx={modalMover.perIdx}
          persona={modalMover.persona}
          onClose={() => setModalMover(null)}
        />
      )}

      {/* ← nuevo modal editar */}
      <ModalEditarHabitacion
        habitacion={habitacion}
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
      />
    </>
  );
};

export default ModalDetallesHabitacion;