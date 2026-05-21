import React, { useMemo } from 'react';
import styles from '../styles/components/modals.module.css';
import { MESES, formatCurrency } from '../../utils/formatters';

const ModalDesglosePagos = ({ habitacion, onClose }) => {
  const mesesTotales = useMemo(() => {
    const map = new Map();
    // inicializar todos los meses en 0
    MESES.forEach((m) => map.set(m, 0));

    habitacion.personas.forEach((persona) => {
      (persona.pagos || []).forEach((pago) => {
        const clave = pago.mes || '';
        if (!map.has(clave)) map.set(clave, 0);
        map.set(clave, map.get(clave) + Number(pago.monto || 0));
      });
    });

    return Array.from(map.entries());
  }, [habitacion]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Desglose de pagos — Habitación {habitacion.num}</h3>

        <div style={{ maxHeight: '60vh', overflow: 'auto', marginTop: '0.5rem' }}>
          {mesesTotales.map(([mes, total]) => (
            <div key={mes} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: 600 }}>{mes}</div>
              <div>{formatCurrency(total)}</div>
            </div>
          ))}
        </div>

        <div className={styles.modalActions} style={{ marginTop: '1rem' }}>
          <button className="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalDesglosePagos;
