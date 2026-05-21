import React, { useState } from 'react';
import HabitacionHeader from './HabitacionHeader';
import ModalDetallesHabitacion from '../Modals/ModalDetallesHabitacion';
import styles from '../styles/components/habitaciones.module.css';

const HabitacionCard = ({ habitacion }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <article className={styles.habCard}>
        <button 
          type="button"
          className={styles.habHeader}
          onClick={() => setIsModalOpen(true)}
          style={{ width: '100%', padding: '0.75rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <HabitacionHeader 
            habitacion={habitacion}
            isExpanded={false}
            onToggle={() => setIsModalOpen(true)}
          />
        </button>
      </article>

      {isModalOpen && (
        <ModalDetallesHabitacion 
          habitacion={habitacion} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
};

export default HabitacionCard;
