import React from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { formatCurrency } from '../../utils/formatters';
import { calcularTotalPagado } from '../../utils/calculos';
import PersonaRow from '../Habitaciones/PersonaRow';
import ModalRegistrarPago from './ModalRegistrarPago';
import ModalMoverPersona from './ModalMoverPersona';
import styles from '../styles/components/modals.module.css';

const ModalDetallesHabitacion = ({ habitacion, onClose }) => {
  const { actualizarNota, eliminarHabitacion } = useHabitacionesContext();
  const [nota, setNota] = React.useState(habitacion.nota || '');
  const [modalPago, setModalPago] = React.useState(null);
  const [modalMover, setModalMover] = React.useState(null);

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

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>
              Hab {habitacion.num} — {habitacion.tipo}
            </h2>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Personas y pagos */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>PERSONAS</h3>
            {habitacion.personas.filter((p) => p.n).map((persona, index) => (
              <PersonaRow
                key={persona.id}
                persona={persona}
                totalHabitacion={habitacion.total}
                cantidadPersonas={cantidadPersonas}
                onRegistrarPago={() => setModalPago({ habId: habitacion.id, perIdx: index, persona })}
                onMover={() => setModalMover({ habOrigen: habitacion.id, perIdx: index, persona })}
                onEditarPago={(pago) => setModalPago({ habId: habitacion.id, perIdx: index, persona, pago })}
              />
            ))}
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>NOTAS</h3>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={handleSaveNota}
              placeholder="Añadir notas..."
              style={{ 
                width: '100%', 
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
                minHeight: '4rem',
                padding: '0.75rem',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: '14px',
                resize: 'vertical',
                background: 'white',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text-primary)',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>

          {/* Totales */}
          {!habitacion.stack && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-tertiary)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Total habitación</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{formatCurrency(habitacion.total)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Recaudado</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--color-text-success)' }}>{formatCurrency(totalPagado)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Pendiente</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: pendiente > 0 ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>
                  {pendiente > 0 ? `-${formatCurrency(pendiente)}` : '✓'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Precio niño</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{formatCurrency(habitacion.precioNino)}</div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="button" type="button" onClick={onClose}>Cerrar</button>
            <button className="button button-danger" type="button" onClick={handleDelete} style={{ marginLeft: 'auto' }}>
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
    </>
  );
};

export default ModalDetallesHabitacion;
