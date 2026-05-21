import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import styles from '../styles/components/habitaciones.module.css';

const PersonaRow = ({ persona, totalHabitacion, cantidadPersonas, onRegistrarPago, onMover, onEditarPago }) => {
  const pagadoPersona = persona.pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const cuotaIdeal = cantidadPersonas ? Math.round(totalHabitacion / cantidadPersonas) : 0;
  const pendiente = Math.max(0, cuotaIdeal - pagadoPersona);

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
                {pago.mes} {formatCurrency(pago.monto)}
              </button>
            ))
          ) : (
            'Sin pagos'
          )}
        </div>
      </div>
      <div className={styles.personaPagado}>{formatCurrency(pagadoPersona)}</div>
      <div className={pendiente > 0 ? styles.personaPendiente : styles.personaOk}>
        {pendiente > 0 ? `-${formatCurrency(pendiente)}` : '✓'}
      </div>
      <button className={styles.btnPago} type="button" onClick={onRegistrarPago}>
        + pago
      </button>
      <button className={styles.btnPago} type="button" onClick={onMover}>
        Mover
      </button>
    </div>
  );
};

export default PersonaRow;
