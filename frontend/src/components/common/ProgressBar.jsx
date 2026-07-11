import styles from '../styles/components/habitaciones.module.css';

const ProgressBar = ({ percentage }) => {
  const isCompleto = percentage >= 100;

  return (
    <div className={styles.progWrap}>
      <div className={styles.progBarBg}>
        <div className={`${styles.progBarFill} ${isCompleto ? styles.completo : styles.pendiente}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className={styles.progPct}>{percentage}%</span>
    </div>
  );
};

export default ProgressBar;
