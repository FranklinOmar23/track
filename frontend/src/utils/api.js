const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || response.statusText || 'Error de red');
  }

  return response.json();
};

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

export const ensureDefaultViaje = () =>
  request('/api/viajes/default', {
    method: 'POST',
  });

export const fetchDashboardStats = () => request('/api/stats/dashboard');

export const fetchViajeBySlug = (slug) => request(`/api/stats/viaje/slug/${slug}`);

export const crearViajeConSlug = (viaje) =>
  request('/api/stats/viajes/with-slug', {
    method: 'POST',
    body: JSON.stringify(viaje),
  });

  // Generar link de compartir con duración
export const generarLinkCompartir = (viajeId, duracion = '7d') =>
  request(`/api/viajes/${viajeId}/compartir`, {
    method: 'POST',
    body: JSON.stringify({ duracion }),
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