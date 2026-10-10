import { useMemo } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import styles from '../styles/components/modals.module.css';
import { clavePeriodo, etiquetaPeriodo } from '../../utils/formatters';
import { useDivisa } from '../../hooks/useDivisa';

const ModalDesgloseGeneral = ({ onClose }) => {
  const { state } = useHabitacionesContext();
  const { fmt } = useDivisa();

  const resumen = useMemo(() => {
    // Agrupar por mes + año (antes se mezclaban meses de años distintos)
    const map = new Map();
    state.habitaciones.forEach((hab) => {
      hab.personas.forEach((persona) => {
        (persona.pagos || []).forEach((pago) => {
          const clave = clavePeriodo(pago.mes, pago.anio);
          if (!map.has(clave)) map.set(clave, { mes: etiquetaPeriodo(pago.mes, pago.anio), total: 0 });
          map.get(clave).total += Number(pago.monto || 0);
        });
      });
    });

    return [...map.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);
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
