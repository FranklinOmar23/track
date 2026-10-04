import { useState, useEffect, useRef } from 'react';

/** Anima un número de 0 a `target` con easing (cubic out). Devuelve el valor sin redondear. */
export const useCountUp = (target, duration = 1300, enabled = true) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  const activo = enabled && typeof target === 'number' && target !== 0;

  useEffect(() => {
    if (!activo) return;
    let startTs = null;
    const tick = (ts) => {
      if (startTs === null) startTs = ts;
      const t = Math.min((ts - startTs) / duration, 1);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, activo]);

  return activo ? value : 0;
};
