// Confirmaciones con un cuadro propio (en lugar de window.confirm).
// Uso: if (!(await confirmar({ titulo, mensaje, textoConfirmar, tono }))) return;
// <DialogoConfirmacion /> (montado en AppLayout) es quien lo muestra.
const oyentes = new Set();

/**
 * @param {{ titulo: string, mensaje?: string, detalle?: string, textoConfirmar?: string,
 *           textoCancelar?: string, tono?: 'normal' | 'peligro' | 'aviso' }} opciones
 * @returns {Promise<boolean>} true si confirma
 */
export const confirmar = (opciones) => new Promise((resolve) => {
  if (!oyentes.size) {
    console.warn('confirmar(): no hay un <DialogoConfirmacion /> montado');
    resolve(false);
    return;
  }
  oyentes.forEach((fn) => fn({ ...opciones, resolve }));
});

export const escucharConfirmaciones = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};
