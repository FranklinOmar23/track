const API_BASE = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/g, '') || '';
const TOKEN_KEY = 'rmt_token';

const normalizeApiPath = (path) => {
  const cleanedPath = `/${path}`.replace(/^\/+/g, '/');
  return API_BASE.endsWith('/api') && cleanedPath.startsWith('/api')
    ? cleanedPath.replace(/^\/api/, '') || '/'
    : cleanedPath;
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const baseUrl = API_BASE || window.location.origin;
  const url = `${baseUrl.replace(/\/+$|\s+/g, '')}${normalizeApiPath(path)}`;

  const response = await fetch(url, {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || response.statusText || 'Error de red');
  }

  return response.json();
};

// ─── AUTENTICACIÓN ──────────────────────────────────────────────────────────
export const login = (username, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

/** Registro de actividad con filtros: { tipo, usuario, q, limit, offset } → { logs, total, usuarios } */
export const fetchLogs = (filtros = {}) => {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const query = params.toString();
  return request(`/api/logs${query ? `?${query}` : ''}`);
};

export const deshacerAccion = (logId) =>
  request(`/api/logs/${logId}/deshacer`, { method: 'POST' });

export const fetchHabitaciones = (viajeId) => {
  const query = viajeId ? `?viajeId=${viajeId}` : '';
  return request(`/api/habitaciones${query}`);
};

export const crearHabitacion = (habitacion) =>
  request('/api/habitaciones', {
    method: 'POST',
    body: JSON.stringify(habitacion),
  });

export const editarHabitacion = (id, datos) =>
  request(`/api/habitaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const eliminarHabitacion = (id) =>
  request(`/api/habitaciones/${id}`, {
    method: 'DELETE',
  });

export const actualizarNota = (id, nota) =>
  request(`/api/habitaciones/${id}/nota`, {
    method: 'PUT',
    body: JSON.stringify({ nota }),
  });

export const actualizarEtiqueta = (habId, etiqueta) =>
  request(`/api/habitaciones/${habId}/etiqueta`, {
    method: 'PUT',
    body: JSON.stringify({ etiqueta }),
  });

export const marcarRevision = (habId, enRevision, nota) =>
  request(`/api/habitaciones/${habId}/revision`, {
    method: 'PUT',
    body: JSON.stringify({ enRevision, nota }),
  });

export const registrarPago = (personaId, pago) =>
  request(`/api/personas/${personaId}/pagos`, {
    method: 'POST',
    body: JSON.stringify(pago),
  });

export const moverPersona = (personaId, destinoHabitacionId) =>
  request('/api/movimientos', {
    method: 'POST',
    body: JSON.stringify({ personaId, destinoHabitacionId }),
  });

export const actualizarPago = (personaId, pagoId, pago) =>
  request(`/api/personas/${personaId}/pagos/${pagoId}`, {
    method: 'PUT',
    body: JSON.stringify(pago),
  });

export const eliminarPago = (personaId, pagoId) =>
  request(`/api/personas/${personaId}/pagos/${pagoId}`, {
    method: 'DELETE',
  });

export const actualizarNombrePersona = (personaId, nombre) =>
  request(`/api/personas/${personaId}`, {
    method: 'PUT',
    body: JSON.stringify({ nombre }),
  });

export const agregarPersonaHabitacion = (habitacionId, persona) =>
  request(`/api/habitaciones/${habitacionId}/personas`, {
    method: 'POST',
    body: JSON.stringify(persona),
  });

export const actualizarGratisPersona = (personaId, esGratis) =>
  request(`/api/personas/${personaId}/gratis`, {
    method: 'PATCH',
    body: JSON.stringify({ esGratis }),
  });

export const actualizarStackPersona = (personaId, esStack) =>
  request(`/api/personas/${personaId}/stack`, {
    method: 'PATCH',
    body: JSON.stringify({ esStack }),
  });

export const eliminarPersona = (personaId) =>
  request(`/api/personas/${personaId}`, {
    method: 'DELETE',
  });

export const fetchViajes = () => request('/api/viajes');

export const crearViaje = (viaje) =>
  request('/api/viajes', {
    method: 'POST',
    body: JSON.stringify(viaje),
  });

export const editarViaje = (id, datos) =>
  request(`/api/viajes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const eliminarViaje = (id) =>
  request(`/api/viajes/${id}`, {
    method: 'DELETE',
  });

export const cambiarEstadoViaje = (id, estado) =>
  request(`/api/viajes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });

export const fetchDashboardStats = () => request('/api/stats/dashboard');

export const fetchViajeBySlug = (slug, { conHabitaciones = false } = {}) =>
  request(`/api/stats/viaje/slug/${slug}${conHabitaciones ? '?habitaciones=1' : ''}`);

/** Guarda la habitación y todas sus personas en una sola petición (transacción en el servidor). */
export const guardarHabitacionCompleta = (id, datos) =>
  request(`/api/habitaciones/${id}/completa`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const crearViajeConSlug = (viaje) =>
  request('/api/stats/viajes/with-slug', {
    method: 'POST',
    body: JSON.stringify(viaje),
  });

  // Generar link de compartir con duración
export const generarLinkCompartir = (viajeId, duracion = '7d', tipo = 'completo') =>
  request(`/api/viajes/${viajeId}/compartir`, {
    method: 'POST',
    body: JSON.stringify({ duracion, tipo }),
  });

// Desactivar link de compartir
export const desactivarLinkCompartir = (viajeId) =>
  request(`/api/viajes/${viajeId}/compartir`, {
    method: 'DELETE',
  });

  export const fetchViajePublico = (token) =>
  request(`/api/viajes/publico/${token}`);

// ─── REPORTES ────────────────────────────────────────────────────────────────
export const fetchPagosPorMes = (viajeId) => {
  const query = viajeId ? `?viajeId=${viajeId}` : '';
  return request(`/api/stats/reportes/pagos-por-mes${query}`);
};

export const fetchReportePorEtiqueta = (viajeId) => {
  const query = viajeId ? `?viajeId=${viajeId}` : '';
  return request(`/api/stats/reportes/por-etiqueta${query}`);
};

export const fetchComparativaViajes = () =>
  request('/api/stats/reportes/comparativa-viajes');

export const fetchPagosMesViaje = () =>
  request('/api/stats/reportes/pagos-mes-viaje');
export const fetchReporteGanancias = () =>
  request('/api/stats/reportes/ganancias');

// ─── REPORTES EN TABLA ───────────────────────────────────────────────────────
const query = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return q.toString() ? `?${q}` : '';
};

/** Pagos con fecha de registro y quién lo registró. { viajeId, desde, hasta } */
export const fetchReportePagos = (params = {}) => request(`/api/stats/reportes/pagos${query(params)}`);

/** Movimientos de personas entre habitaciones. { viajeId } */
export const fetchReporteMovimientos = (params = {}) => request(`/api/stats/reportes/movimientos${query(params)}`);

// ─── USUARIOS Y PERMISOS ─────────────────────────────────────────────────────
/** Perfil del usuario actual: permisos y viajes asignados. */
export const fetchMe = () => request('/api/auth/me');

export const cambiarMiPassword = (actual, nueva) =>
  request('/api/auth/password', { method: 'PUT', body: JSON.stringify({ actual, nueva }) });

export const fetchUsuarios = () => request('/api/usuarios');

export const crearUsuario = (datos) =>
  request('/api/usuarios', { method: 'POST', body: JSON.stringify(datos) });

export const actualizarUsuario = (id, datos) =>
  request(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) });

export const restablecerPassword = (id, password) =>
  request(`/api/usuarios/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) });

export const cambiarTitular = (personaId) =>
  request(`/api/personas/${personaId}/titular`, { method: 'PATCH' });

// ─── TRANSFERENCIAS AL HOTEL ─────────────────────────────────────────────────
export const fetchTransferencias = (viajeId) => request(`/api/transferencias?viajeId=${viajeId}`);

export const crearTransferencia = (datos) =>
  request('/api/transferencias', { method: 'POST', body: JSON.stringify(datos) });

export const editarTransferencia = (id, datos) =>
  request(`/api/transferencias/${id}`, { method: 'PUT', body: JSON.stringify(datos) });

export const eliminarTransferencia = (id) =>
  request(`/api/transferencias/${id}`, { method: 'DELETE' });

export const guardarSaldoBanco = (viajeId, saldo) =>
  request('/api/transferencias/saldo-banco', { method: 'PUT', body: JSON.stringify({ viajeId, saldo }) });

// ─── COMPROBANTES (vouchers) ─────────────────────────────────────────────────
export const fetchComprobantes = (entidad, entidadId) =>
  request(`/api/comprobantes?entidad=${entidad}&entidadId=${entidadId}`);

export const subirComprobante = (datos) =>
  request('/api/comprobantes', { method: 'POST', body: JSON.stringify(datos) });

export const eliminarComprobante = (id) =>
  request(`/api/comprobantes/${id}`, { method: 'DELETE' });

/** Descarga el archivo de un comprobante (con la sesión) y devuelve un Blob. */
export const descargarComprobante = async (id) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const baseUrl = (API_BASE || window.location.origin).replace(/\/+$|\s+/g, '');
  const response = await fetch(`${baseUrl}${normalizeApiPath(`/api/comprobantes/${id}`)}`, {
    mode: 'cors',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo abrir el comprobante');
  }
  return response.blob();
};

// ─── CLIENTES ────────────────────────────────────────────────────────────────
/** Listado paginado. Filtros: { q, esFijo, conDeuda, sinViajarDias, mesNacimiento, page, limit, ... }
 *  → { data: { data: cliente[], isThereNextPage, page, limit } } */
export const fetchClientes = (params = {}) => request(`/api/clientes${query(params)}`);
/** Ficha con resumen y participaciones (viajes). */
export const fetchCliente = (id) => request(`/api/clientes/${id}`);
export const crearCliente = (datos) =>
  request('/api/clientes', { method: 'POST', body: JSON.stringify(datos) });
export const editarCliente = (id, datos) =>
  request(`/api/clientes/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
export const eliminarCliente = (id) => request(`/api/clientes/${id}`, { method: 'DELETE' });
export const vincularPersonasCliente = (id, personaIds) =>
  request(`/api/clientes/${id}/vincular`, { method: 'POST', body: JSON.stringify({ personaIds }) });
export const desvincularPersonaCliente = (id, personaId) =>
  request(`/api/clientes/${id}/personas/${personaId}`, { method: 'DELETE' });
/** Grupos de personas sin cliente cuyo nombre se repite en varios viajes (paginado). */
export const fetchPosiblesClientes = (params = {}) => request(`/api/clientes/posibles${query(params)}`);
