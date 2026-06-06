import React from 'react';
import { useDivisa } from '../../hooks/useDivisa';
import styles from '../styles/components/habitaciones.module.css';

const PersonaRow = ({ persona, cuota, onRegistrarPago, onMover, onEditarPago, onEliminar }) => {
  const { fmt } = useDivisa();
  const pagadoPersona = persona.pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const pendiente = Math.max(0, cuota - pagadoPersona);

  return (
    <div className={styles.personaRow}>
      <div>
        <div className={styles.personaNombre}>{persona.n || '(sin nombre)'}</div>
        <div className={styles.personaPagos}>
          {persona.pagos.length > 0 ? (
            persona.pagos.map((pago) => (
              <button
                key={pago.id}
                type="button"
                className={styles.pagoChip}
                onClick={() => onEditarPago(pago)}
              >
                {pago.mes} {fmt(pago.monto)}
              </button>
            ))
          ) : (
            'Sin pagos'
          )}
        </div>
      </div>
      <div className={styles.personaPagado}>{fmt(pagadoPersona)}</div>
      <div className={pendiente > 0 ? styles.personaPendiente : styles.personaOk}>
        {pendiente > 0 ? `-${fmt(pendiente)}` : '✓'}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button className={styles.btnPago} type="button" onClick={onRegistrarPago}>
          + pago
        </button>
        <button className={styles.btnPago} type="button" onClick={onMover}>
          Mover
        </button>
        <button className={`${styles.btnPago} ${styles.btnEliminar}`} type="button" onClick={onEliminar}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default PersonaRow;
