// Modo claro / oscuro. Por defecto claro; si el usuario elige oscuro se recuerda en el navegador.
import { useSyncExternalStore } from 'react';

const CLAVE = 'sadoj_tema';
const oyentes = new Set();

const inicial = () => {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'oscuro' || guardado === 'claro') return guardado;
  } catch { /* sin localStorage */ }
  return 'claro'; // por defecto, modo claro
};

let tema = inicial();

/** Pone o quita la clase `oscuro` en <html> (los estilos cuelgan de ella). */
const aplicar = () => {
  const html = document.documentElement;
  html.classList.toggle('oscuro', tema === 'oscuro');
  html.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
};
aplicar();

export const getTema = () => tema;

export const setTema = (nuevo) => {
  tema = nuevo === 'oscuro' ? 'oscuro' : 'claro';
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin localStorage */ }
  // Transición suave de colores solo durante el cambio
  document.documentElement.classList.add('cambiando-tema');
  aplicar();
  setTimeout(() => document.documentElement.classList.remove('cambiando-tema'), 350);
  oyentes.forEach((fn) => fn());
};

export const alternarTema = () => setTema(tema === 'oscuro' ? 'claro' : 'oscuro');

/** Hook: devuelve 'claro' | 'oscuro' y se actualiza al cambiar. */
export const useTema = () => useSyncExternalStore(
  (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); },
  getTema,
  getTema,
);
