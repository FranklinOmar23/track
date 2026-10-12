// Mide cuántas consultas hace cada petición y cuánto tardan, y lo expone en la cabecera
// Server-Timing (visible en la pestaña Red del navegador → Timing). Sirve para optimizar
// con datos reales de producción.
import { AsyncLocalStorage } from 'node:async_hooks';

const almacen = new AsyncLocalStorage();

/** Envuelve query() de un pool o conexión para acumular tiempos en la petición actual. */
const envolverQuery = (objetivo) => {
  const original = objetivo.query.bind(objetivo);
  objetivo.query = async (...args) => {
    const inicio = performance.now();
    try {
      return await original(...args);
    } finally {
      const medicion = almacen.getStore();
      if (medicion) {
        medicion.consultas += 1;
        medicion.dbMs += performance.now() - inicio;
      }
    }
  };
};

export const instrumentarPool = (pool) => {
  envolverQuery(pool);
  const getConnectionOriginal = pool.getConnection.bind(pool);
  pool.getConnection = async (...args) => {
    const conexion = await getConnectionOriginal(...args);
    if (!conexion.__instrumentada) {
      envolverQuery(conexion);
      conexion.__instrumentada = true;
    }
    return conexion;
  };
  return pool;
};

/** Middleware: abre la medición y escribe Server-Timing justo antes de enviar la respuesta. */
export const medirPeticion = (req, res, next) => {
  const medicion = { inicio: performance.now(), consultas: 0, dbMs: 0 };
  const writeHeadOriginal = res.writeHead;
  res.writeHead = function writeHead(...args) {
    if (!res.headersSent) {
      const total = performance.now() - medicion.inicio;
      res.setHeader('Server-Timing',
        `db;desc="${medicion.consultas} consultas";dur=${medicion.dbMs.toFixed(1)}, total;dur=${total.toFixed(1)}`);
    }
    return writeHeadOriginal.apply(this, args);
  };
  almacen.run(medicion, next);
};
