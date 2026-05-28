import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { formatCurrency } from '../../utils/formatters';
import { calcularTotalPagado } from '../../utils/calculos';
import ModalRegistrarPago from './ModalRegistrarPago';
import ModalMoverPersona from './ModalMoverPersona';
import styles from '../styles/components/modals.module.css';

const ModalDetallesHabitacion = ({ habitacion: habitacionProp, onClose }) => {
  const { actualizarNota, eliminarHabitacion, state, cargarHabitaciones } = useHabitacionesContext();

  // 🔑 Leer siempre del contexto para que se reactive al guardar/editar/eliminar pagos
  const habitacion =
    state.habitaciones.find((h) => h.id === habitacionProp.id) || habitacionProp;

  const [nota, setNota] = useState(habitacion.nota || '');
  const [modalPago, setModalPago] = useState(null);
  const [modalMover, setModalMover] = useState(null);

  const handleSaveNota = () => {
    actualizarNota(habitacion.id, nota);
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar esta habitación?')) {
      eliminarHabitacion(habitacion.id);
      onClose();
    }
  };

  const totalPagado = calcularTotalPagado(habitacion);
  const pendiente = Math.max(0, habitacion.total - totalPagado);
  const cantidadPersonas = habitacion.personas.filter((p) => p.n).length;

  const handleEditarPago = (persona, personaIndex, pago) => {
    setModalPago({ habId: habitacion.id, perIdx: personaIndex, persona, pago });
  };

  const handleNuevoPago = (persona, personaIndex) => {
    setModalPago({ habId: habitacion.id, perIdx: personaIndex, persona, pago: null });
  };

  const handleClosePagoModal = () => {
    setModalPago(null);
    // No hace falta recargar manualmente: el contexto ya actualizó el estado
    // y como leemos de state.habitaciones, el modal se re-renderiza solo
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Hab {habitacion.num} — {habitacion.tipo}</h2>
            <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
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
                      onClick={() => handleEditarPago(persona, personaIndex, pago)}
                    >
                      {pago.mes} ${pago.monto.toLocaleString()}
                    </button>
                  ))}
                  {(!persona.pagos || persona.pagos.length === 0) && (
                    <span className={styles.pagoItem}>Sin pagos</span>
                  )}
                </div>
                <div className={styles.personaTotals}>
                  <span>
                    Pagado:{' '}
                    <strong>
                      {formatCurrency(persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0)}
                    </strong>
                  </span>
                  <span>
                    Pendiente:{' '}
                    <strong className={styles.totalValueDanger}>
                      -{formatCurrency(
                        (habitacion.total / cantidadPersonas) -
                          (persona.pagos?.reduce((s, p) => s + p.monto, 0) || 0)
                      )}
                    </strong>
                  </span>
                </div>
                <div className={styles.personaActions}>
                  <button type="button" onClick={() => handleNuevoPago(persona, personaIndex)}>
                    + pago
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModalMover({ habOrigen: habitacion.id, perIdx: personaIndex, persona })
                    }
                  >
                    Mover
                  </button>
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
              <span className={styles.totalValue}>{formatCurrency(habitacion.total)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Recaudado</span>
              <span className={`${styles.totalValue} ${styles.totalValueSuccess}`}>
                {formatCurrency(totalPagado)}
              </span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Pendiente</span>
              <span
                className={`${styles.totalValue} ${
                  pendiente > 0 ? styles.totalValueDanger : styles.totalValueSuccess
                }`}
              >
                {pendiente > 0 ? `-${formatCurrency(pendiente)}` : '✓'}
              </span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Precio niño</span>
              <span className={styles.totalValue}>{formatCurrency(habitacion.precioNino)}</span>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className="button" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="button button-danger" onClick={handleDelete}>
              Eliminar hab
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
          onClose={handleClosePagoModal}
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
    </>
  );
};

export default ModalDetallesHabitacion;