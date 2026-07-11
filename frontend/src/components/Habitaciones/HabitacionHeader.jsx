import styles from '../styles/components/habitaciones.module.css';

const HabitacionHeader = ({ habitacion, isExpanded, onToggle }) => {
  const totalPagado = habitacion.personas.reduce((sum, p) => 
    sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0), 0);
  
  const porcentaje = habitacion.total > 0 ? (totalPagado / habitacion.total * 100) : 0;

  return (
    <div 
      className={styles.habHeader}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onToggle()}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem' }}
    >
      <div className={styles.habInfo}>
        <span className={styles.habNum}>Habitación {habitacion.num}</span>
        <span className={styles.habTipo}>{habitacion.tipo}</span>
        {habitacion.stack && <span className={styles.stackBadge}>STACK</span>}
      </div>
      <div className={styles.habStats}>
        <span className={styles.habTotal}>${habitacion.total?.toLocaleString('es-DO') || 0}</span>
        <span className={styles.habPagado}>${Math.round(totalPagado).toLocaleString('es-DO')}</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${porcentaje}%` }} />
        </div>
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
      </div>
    </div>
  );
};

export default HabitacionHeader;