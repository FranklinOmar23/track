import React, { useState } from 'react';
import { useHabitacionesContext } from '../../context/HabitacionesContext';
import PersonaRow from './PersonaRow';
import ModalRegistrarPago from '../Modals/ModalRegistrarPago';
import ModalMoverPersona from '../Modals/ModalMoverPersona';
import ModalDesglosePagos from '../Modals/ModalDesglosePagos';
import styles from '../styles/components/habitaciones.module.css';
import { calcularTotalPagado } from '../../utils/calculos';
import { formatCurrency } from '../../utils/formatters';

const HabitacionBody = ({ habitacion }) => {
  const { actualizarNota, eliminarHabitacion } = useHabitacionesContext();
  const [modalPago, setModalPago] = useState(null);
  const [modalMover, setModalMover] = useState(null);
  const [modalDesglose, setModalDesglose] = useState(false);

  const totalPagado = calcularTotalPagado(habitacion);
  const cantidadPersonas = habitacion.personas.filter((persona) => persona.n).length;
  const pendienteHabitacion = Math.max(0, habitacion.total - totalPagado);

  return (
    <div className={styles.habBody}>
      {habitacion.personas.filter((persona) => persona.n).map((persona, index) => (
        <PersonaRow
          key={`${habitacion.id}-${index}`}
          persona={persona}
          totalHabitacion={habitacion.total}
          cantidadPersonas={cantidadPersonas}
          onRegistrarPago={() => setModalPago({ perIdx: index, persona, pago: null })}
          onMover={() => setModalMover({ perIdx: index, persona })}
          onEditarPago={(pago) => setModalPago({ perIdx: index, persona, pago })}
        />
      ))}

      <textarea
        className={styles.notaArea}
        placeholder="Notas..."
        value={habitacion.nota || ''}
        onChange={(event) => actualizarNota(habitacion.id, event.target.value)}
      />

      <div className={styles.totalHab}>
        <div className={styles.totalHabItem}>
          <span className={styles.totalHabLabel}>Total hab</span>
          <span className={styles.totalHabValue}>{habitacion.stack ? 'STACK' : formatCurrency(habitacion.total)}</span>
        </div>
        {!habitacion.stack && (
          <div className={styles.totalHabItem}>
            <span className={styles.totalHabLabel}>Precio niño</span>
            <span className={styles.totalHabValue}>{formatCurrency(habitacion.precioNino || 0)}</span>
          </div>
        )}
        <div className={styles.totalHabItem}>
          <span className={styles.totalHabLabel}>Recaudado</span>
          <span className={styles.totalHabValue}>{formatCurrency(totalPagado)}</span>
        </div>
        <div className={styles.totalHabItem}>
          <span className={styles.totalHabLabel}>Pendiente</span>
          <span className={styles.totalHabValue}>{formatCurrency(habitacion.stack ? 0 : pendienteHabitacion)}</span>
        </div>
      </div>

      <div className={styles.accionesHab}>
        <button className="button button-danger" type="button" onClick={() => eliminarHabitacion(habitacion.id)}>
          Eliminar habitación
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setModalDesglose(true)}
        >
          Desglose pagos
        </button>
      </div>

      {modalPago && (
        <ModalRegistrarPago
          habId={habitacion.id}
          perIdx={modalPago.perIdx}
          persona={modalPago.persona}
          pago={modalPago.pago}
          onClose={() => setModalPago(null)}
        />
      )}

      {modalDesglose && (
        <ModalDesglosePagos
          habitacion={habitacion}
          onClose={() => setModalDesglose(false)}
        />
      )}

      {modalMover && (
        <ModalMoverPersona
          habOrigen={habitacion.id}
          perIdx={modalMover.perIdx}
          persona={modalMover.persona}
          onClose={() => setModalMover(null)}
        />
      )}
    </div>
  );
};

export default HabitacionBody;
