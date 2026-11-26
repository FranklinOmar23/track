// Motivos de una penalidad del hotel (deben coincidir con MOTIVOS en backend/routes/penalidades.js)
export const MOTIVOS = [
  { id: 'salida', label: 'Se salió del viaje' },
  { id: 'no_show', label: 'No se presentó' },
  { id: 'cambio', label: 'Cambio de fecha' },
  { id: 'otro', label: 'Otro' },
];

export const etiquetaMotivo = (id) => MOTIVOS.find((m) => m.id === id)?.label || 'Otro';
