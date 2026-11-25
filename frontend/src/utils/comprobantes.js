// Preparar archivos de comprobante antes de subirlos: las fotos se reducen y comprimen
// (una foto de celular de 4-8 MB queda en ~300-600 KB); los PDF se suben tal cual.
import { subirComprobante } from './api';

export const MAX_BYTES = 5 * 1024 * 1024;
const LADO_MAX = 1800;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACEPTA = 'image/*,application/pdf';

const leerComoDataUrl = (blob) => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(lector.result);
  lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  lector.readAsDataURL(blob);
});

const cargarImagen = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('No se pudo abrir la imagen. Prueba con una foto JPG o PNG.'));
  img.src = url;
});

/** Reduce la foto a 1800 px de lado como máximo y la guarda en JPEG. */
const comprimirImagen = async (archivo) => {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await cargarImagen(url);
    const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    // Si comprimir no ayudó (imagen ya pequeña), se usa la original
    return blob && blob.size < archivo.size ? blob : archivo;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Valida y prepara un archivo. Devuelve { nombre, mime, datos (base64), tamano, vista (URL local) }.
 * Lanza un Error con un mensaje para el usuario si no sirve.
 */
export const prepararComprobante = async (archivo) => {
  const esPdf = archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name);
  const esImagen = archivo.type.startsWith('image/');
  if (!esPdf && !esImagen) throw new Error(`"${archivo.name}" no es una foto ni un PDF.`);

  let blob = archivo;
  let mime = esPdf ? 'application/pdf' : archivo.type;
  let nombre = archivo.name || 'comprobante';
  if (esImagen) {
    blob = await comprimirImagen(archivo);
    mime = blob.type && TIPOS_IMAGEN.includes(blob.type) ? blob.type : 'image/jpeg';
    if (blob !== archivo) nombre = nombre.replace(/\.[^.]+$/, '') + '.jpg';
  }
  if (blob.size > MAX_BYTES) throw new Error(`"${archivo.name}" pesa más de 5 MB.`);

  const dataUrl = await leerComoDataUrl(blob);
  return {
    nombre,
    mime,
    tamano: blob.size,
    datos: String(dataUrl).split(',')[1],
    vista: esImagen ? URL.createObjectURL(blob) : null,
  };
};

/** Sube los comprobantes preparados que quedaron pendientes al crear un pago o transferencia. */
export const subirPendientes = async (entidad, entidadId, pendientes) => {
  const subidos = [];
  for (const p of pendientes) {
    subidos.push(await subirComprobante({ entidad, entidadId, nombre: p.nombre, mime: p.mime, datos: p.datos }));
    if (p.vista) URL.revokeObjectURL(p.vista);
  }
  return subidos;
};

export const pesoLegible = (bytes) => (bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`);
