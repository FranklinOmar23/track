import { createContext, useContext, useEffect, useReducer } from 'react';
import * as api from '../utils/api';
import { useAuthContext } from './AuthContext';

const HabitacionesContext = createContext();

const initialState = {
  viajes: [],
  selectedViajeId: null,
  habitaciones: [],
  filtros: {
    busqueda: '',
    estado: 'todos',
  },
};

function habitacionesReducer(state, action) {
  switch (action.type) {
    case 'SET_HABITACIONES':
      return { ...state, habitaciones: action.payload };

    case 'SET_VIAJES':
      return { ...state, viajes: action.payload };

    case 'SET_SELECTED_VIAJE':
      return { ...state, selectedViajeId: action.payload };

    case 'AGREGAR_VIAJE':
      return { ...state, viajes: [action.payload, ...state.viajes] };

    case 'ACTUALIZAR_VIAJE':
      return {
        ...state,
        viajes: state.viajes.map((v) =>
          v.id === action.payload.id ? { ...v, ...action.payload } : v
        ),
      };

    case 'ELIMINAR_VIAJE':
      return {
        ...state,
        viajes: state.viajes.filter((v) => v.id !== action.payload),
        selectedViajeId: state.selectedViajeId === action.payload ? null : state.selectedViajeId,
        habitaciones: state.selectedViajeId === action.payload ? [] : state.habitaciones,
      };

    case 'AGREGAR_HABITACION':
      return { ...state, habitaciones: [...state.habitaciones, action.payload] };

    case 'ACTUALIZAR_HABITACION':
      return {
        ...state,
        habitaciones: state.habitaciones.map((h) =>
          h.id === action.payload.id ? { ...h, ...action.payload } : h
        ),
      };

    // Pagos: se actualiza solo la persona afectada (antes cada pago recargaba todas las habitaciones)
    case 'PAGO_AGREGADO':
    case 'PAGO_ACTUALIZADO':
    case 'PAGO_ELIMINADO': {
      const { personaId, pago, pagoId } = action.payload;
      return {
        ...state,
        habitaciones: state.habitaciones.map((h) => {
          if (!h.personas.some((p) => p.id === personaId)) return h;
          return {
            ...h,
            personas: h.personas.map((p) => {
              if (p.id !== personaId) return p;
              const pagos = p.pagos || [];
              if (action.type === 'PAGO_AGREGADO') return { ...p, pagos: [...pagos, pago] };
              if (action.type === 'PAGO_ACTUALIZADO') return { ...p, pagos: pagos.map((x) => (x.id === pago.id ? { ...x, ...pago } : x)) };
              return { ...p, pagos: pagos.filter((x) => x.id !== pagoId) };
            }),
          };
        }),
      };
    }

    case 'ELIMINAR_HABITACION':
      return {
        ...state,
        habitaciones: state.habitaciones.filter((hab) => hab.id !== action.payload),
      };

    case 'ACTUALIZAR_NOTA':
      return {
        ...state,
        habitaciones: state.habitaciones.map((hab) =>
          hab.id === action.payload.habId ? { ...hab, nota: action.payload.nota } : hab
        ),
      };

    case 'ACTUALIZAR_ETIQUETA':
      return {
        ...state,
        habitaciones: state.habitaciones.map((hab) =>
          hab.id === action.payload.habId ? { ...hab, etiqueta: action.payload.etiqueta } : hab
        ),
      };

    case 'SET_FILTROS':
      return { ...state, filtros: action.payload };

    default:
      return state;
  }
}

export const useHabitacionesContext = () => {
  const context = useContext(HabitacionesContext);
  if (!context) {
    throw new Error('useHabitacionesContext debe usarse dentro de HabitacionesProvider');
  }
  return context;
};

export const HabitacionesProvider = ({ children }) => {
  const { puede } = useAuthContext();
  const [state, dispatch] = useReducer(habitacionesReducer, initialState);

  const cargarViajes = async () => {
    try {
      const viajes = await api.fetchViajes();
      dispatch({ type: 'SET_VIAJES', payload: viajes });
    } catch (error) {
      console.error('Error cargando viajes:', error);
    }
  };

  const cargarHabitaciones = async (viajeId) => {
    try {
      const habitaciones = await api.fetchHabitaciones(viajeId);
      dispatch({ type: 'SET_HABITACIONES', payload: habitaciones });
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
    }
  };

  useEffect(() => {
    cargarViajes();
  }, []);

  const crearViaje = async (viaje) => {
    try {
      const nuevoViaje = await api.crearViajeConSlug(viaje);
      dispatch({ type: 'AGREGAR_VIAJE', payload: nuevoViaje });
      return nuevoViaje;
    } catch (error) {
      console.error('Error creando viaje:', error);
      throw error;
    }
  };

  const editarViaje = async (id, datos) => {
    try {
      const actualizado = await api.editarViaje(id, datos);
      dispatch({ type: 'ACTUALIZAR_VIAJE', payload: { id, ...datos, ...actualizado } });
      return actualizado;
    } catch (error) {
      console.error('Error editando viaje:', error);
      throw error;
    }
  };

  const cambiarEstadoViaje = async (id, estado) => {
    try {
      const actualizado = await api.cambiarEstadoViaje(id, estado);
      dispatch({ type: 'ACTUALIZAR_VIAJE', payload: actualizado });
      return actualizado;
    } catch (error) {
      console.error('Error cambiando estado del viaje:', error);
      throw error;
    }
  };

  const eliminarViaje = async (id) => {
    try {
      await api.eliminarViaje(id);
      dispatch({ type: 'ELIMINAR_VIAJE', payload: id });
    } catch (error) {
      console.error('Error eliminando viaje:', error);
      throw error;
    }
  };

  const seleccionarViaje = async (viajeId) => {
    try {
      dispatch({ type: 'SET_SELECTED_VIAJE', payload: viajeId });
      dispatch({ type: 'SET_HABITACIONES', payload: [] });
      if (viajeId) await cargarHabitaciones(viajeId);
    } catch (error) {
      console.error('Error seleccionando viaje:', error);
    }
  };

  /** Abre un viaje por su slug: datos del viaje y habitaciones en una sola petición. */
  const abrirViaje = async (slug) => {
    const { habitaciones, ...viaje } = await api.fetchViajeBySlug(slug, { conHabitaciones: true });
    dispatch({ type: 'SET_SELECTED_VIAJE', payload: viaje.id });
    dispatch({ type: 'SET_HABITACIONES', payload: habitaciones });
    return viaje;
  };

  /** Guarda habitación + personas de una vez y reemplaza solo esa habitación en pantalla. */
  const guardarHabitacionCompleta = async (id, datos) => {
    const habitacion = await api.guardarHabitacionCompleta(id, datos);
    dispatch({ type: 'ACTUALIZAR_HABITACION', payload: habitacion });
    return habitacion;
  };

  const agregarHabitacion = async (hab) => {
    try {
      const nuevaHabitacion = await api.crearHabitacion({
        ...hab,
        viajeId: state.selectedViajeId,
      });
      dispatch({ type: 'AGREGAR_HABITACION', payload: nuevaHabitacion });
    } catch (error) {
      console.error('Error creando habitación:', error);
      throw error;
    }
  };

  const editarHabitacion = async (id, datos) => {
    try {
      const actualizada = await api.editarHabitacion(id, datos);
      dispatch({ type: 'ACTUALIZAR_HABITACION', payload: { id, ...datos, ...actualizada } });
      return actualizada;
    } catch (error) {
      console.error('Error editando habitación:', error);
      throw error;
    }
  };

  const eliminarHabitacion = async (id) => {
    try {
      await api.eliminarHabitacion(id);
      dispatch({ type: 'ELIMINAR_HABITACION', payload: id });
    } catch (error) {
      console.error('Error eliminando habitación:', error);
      throw error;
    }
  };

  const recargar = async () => {
    if (state.selectedViajeId) await cargarHabitaciones(state.selectedViajeId);
  };

  const registrarPago = async (personaId, pago) => {
    try {
      const creado = await api.registrarPago(personaId, pago);
      dispatch({ type: 'PAGO_AGREGADO', payload: { personaId, pago: { id: creado.id, mes: creado.mes, anio: creado.anio, monto: Number(creado.monto) } } });
    } catch (error) {
      console.error('Error registrando pago:', error);
      throw error;
    }
  };

  const actualizarPago = async (personaId, pagoId, pago) => {
    try {
      const actualizado = await api.actualizarPago(personaId, pagoId, pago);
      dispatch({ type: 'PAGO_ACTUALIZADO', payload: { personaId, pago: { id: pagoId, mes: actualizado.mes, anio: actualizado.anio, monto: Number(actualizado.monto) } } });
    } catch (error) {
      console.error('Error actualizando pago:', error);
      throw error;
    }
  };

  const eliminarPago = async (personaId, pagoId) => {
    try {
      await api.eliminarPago(personaId, pagoId);
      dispatch({ type: 'PAGO_ELIMINADO', payload: { personaId, pagoId } });
    } catch (error) {
      console.error('Error eliminando pago:', error);
      throw error;
    }
  };

  const eliminarPersona = async (personaId) => {
    try {
      await api.eliminarPersona(personaId);
      await recargar();
    } catch (error) {
      console.error('Error eliminando persona:', error);
      throw error;
    }
  };

  const moverPersona = async (personaId, habDestino) => {
    try {
      await api.moverPersona(personaId, habDestino);
      await recargar();
    } catch (error) {
      console.error('Error moviendo persona:', error);
      throw error;
    }
  };

  const actualizarNota = async (habId, nota) => {
    try {
      await api.actualizarNota(habId, nota);
      dispatch({ type: 'ACTUALIZAR_NOTA', payload: { habId, nota } });
    } catch (error) {
      console.error('Error actualizando nota:', error);
      throw error;
    }
  };

  const actualizarEtiqueta = async (habId, etiqueta) => {
    try {
      dispatch({ type: 'ACTUALIZAR_ETIQUETA', payload: { habId, etiqueta } });
      await api.actualizarEtiqueta(habId, etiqueta);
    } catch (error) {
      console.error('Error actualizando etiqueta:', error);
      await cargarHabitaciones(state.selectedViajeId);
      throw error;
    }
  };

  const marcarRevision = async (habId, enRevision, nota) => {
    const resultado = await api.marcarRevision(habId, enRevision, nota);
    dispatch({ type: 'ACTUALIZAR_HABITACION', payload: resultado });
    return resultado;
  };

  const setFiltros = (filtros) => {
    dispatch({ type: 'SET_FILTROS', payload: filtros });
  };

  const viajeActual = state.viajes.find((v) => v.id === state.selectedViajeId);
  const viajeCerrado = viajeActual?.estado === 'cerrado';
  // soloLectura: no puede editar (viaje cerrado o sin permiso). Los pagos tienen su propio permiso.
  const soloLectura = viajeCerrado || !puede('editar');
  const puedePagar = !viajeCerrado && puede('pagos');

  const value = {
    state,
    soloLectura,
    puedePagar,
    viajeCerrado,
    recargarViajes: cargarViajes,
    cargarHabitaciones,
    crearViaje,
    editarViaje,
    cambiarEstadoViaje,
    eliminarViaje,
    seleccionarViaje,
    abrirViaje,
    guardarHabitacionCompleta,
    agregarHabitacion,
    editarHabitacion,
    eliminarHabitacion,
    registrarPago,
    actualizarPago,
    eliminarPago,
    eliminarPersona,
    moverPersona,
    actualizarNota,
    actualizarEtiqueta,
    marcarRevision,
    setFiltros,
  };

  return (
    <HabitacionesContext.Provider value={value}>{children}</HabitacionesContext.Provider>
  );
};