import React, { useMemo } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';
import { MESES } from '../../utils/formatters';
import { useDivisa } from '../../hooks/useDivisa';

const ModalDesgloseGeneral = ({ onClose }) => {
  const { state } = useHabitacionesContext();
  const { fmt } = useDivisa();

  const resumen = useMemo(() => {
    const map = new Map();
    MESES.forEach((m) => map.set(m, 0));

    state.habitaciones.forEach((hab) => {
      hab.personas.forEach((persona) => {
        (persona.pagos || []).forEach((pago) => {
          const mes = pago.mes || '';
          if (!map.has(mes)) map.set(mes, 0);
          map.set(mes, map.get(mes) + Number(pago.monto || 0));
        });
      });
    });

    // convertir a array y ordenar por meses definidos (MESES)
    return MESES.map((m) => ({ mes: m, total: map.get(m) || 0 }));
  }, [state.habitaciones]);

  const totalGeneral = resumen.reduce((s, r) => s + r.total, 0);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Desglose general de pagos</h3>

        <div style={{ marginTop: '0.5rem' }}>
          {resumen.map((r) => (
            <div key={r.mes} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: 600 }}>{r.mes}</div>
              <div>{fmt(r.total)}</div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #ddd', fontWeight: 700 }}>
            <div>Total</div>
            <div>{fmt(totalGeneral)}</div>
          </div>
        </div>

        <div className={styles.modalActions} style={{ marginTop: '1rem' }}>
          <button className="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalDesgloseGeneral;
