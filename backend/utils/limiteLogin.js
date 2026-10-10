// Límite de intentos fallidos de login, en memoria (suficiente para un solo proceso).
// Tras MAX_INTENTOS fallos en VENTANA_MS para el mismo usuario+IP, se bloquea hasta que pase la ventana.

const MAX_INTENTOS = 8;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map(); // clave -> { fallos, desde }

const claveDe = (req, username) => `${req.ip || 'ip?'}|${String(username || '').trim().toUpperCase()}`;

/** Minutos que faltan si la clave está bloqueada; 0 si puede intentar. */
export const minutosBloqueado = (req, username) => {
  const registro = intentos.get(claveDe(req, username));
  if (!registro) return 0;
  const transcurrido = Date.now() - registro.desde;
  if (transcurrido > VENTANA_MS) {
    intentos.delete(claveDe(req, username));
    return 0;
  }
  return registro.fallos >= MAX_INTENTOS ? Math.ceil((VENTANA_MS - transcurrido) / 60000) : 0;
};

export const registrarFallo = (req, username) => {
  const clave = claveDe(req, username);
  const registro = intentos.get(clave);
  if (!registro || Date.now() - registro.desde > VENTANA_MS) {
    intentos.set(clave, { fallos: 1, desde: Date.now() });
  } else {
    registro.fallos += 1;
  }
};

export const limpiarFallos = (req, username) => intentos.delete(claveDe(req, username));
