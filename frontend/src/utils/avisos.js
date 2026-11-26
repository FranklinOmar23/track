// Avisos en pantalla: "cambio realizado" (check verde) y errores (en rojo, en lugar de alert()).
// Cualquier parte de la app los lanza y <AvisosExito /> los muestra.
const oyentes = new Set();

const emitir = (aviso) => oyentes.forEach((fn) => fn(aviso));

export const avisarExito = (mensaje = 'Cambio realizado') => emitir({ tipo: 'exito', mensaje });

export const avisarError = (mensaje = 'Algo salió mal. Intenta de nuevo.') => emitir({ tipo: 'error', mensaje });

export const avisarInfo = (mensaje) => emitir({ tipo: 'info', mensaje });

export const escucharAvisos = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};
