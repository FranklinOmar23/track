// Actualización en vivo: avisa a las pantallas cuando otra persona (u otra pestaña) guardó cambios.
// HabitacionesContext consulta el servidor y llama a emitirCambiosRemotos; cada pantalla que
// carga sus propios datos (cuenta, penalidades, dashboard…) se suscribe con useAlCambiarRemoto.
import { useEffect, useRef } from 'react';

// Id de esta pestaña: el servidor lo usa para no avisarnos de nuestros propios cambios
export const ID_PESTANA = (() => {
  try {
    const guardado = sessionStorage.getItem('rmt_pestana');
    if (guardado) return guardado;
    const nuevo = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).slice(0, 36);
    sessionStorage.setItem('rmt_pestana', nuevo);
    return nuevo;
  } catch {
    return `${Date.now()}-${Math.random()}`.slice(0, 36);
  }
})();

const oyentes = new Set();

export const emitirCambiosRemotos = (detalle) => oyentes.forEach((fn) => fn(detalle));

/** Ejecuta `fn` cada vez que llegan cambios de otra persona. */
export const useAlCambiarRemoto = (fn) => {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    const oyente = (d) => ref.current?.(d);
    oyentes.add(oyente);
    return () => { oyentes.delete(oyente); };
  }, []);
};
