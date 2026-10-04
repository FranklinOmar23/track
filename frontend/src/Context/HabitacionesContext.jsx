import { createContext, useContext, useEffect, useReducer } from 'react';
import * as api from '../utils/api';

const HabitacionesContext = createContext();

const initialState = {
  viajes: [],
  selectedViajeId: null,
  habitaciones: [],
  expandedHabs: {},
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

    case 'ELIMINAR_HABITACION':
      return {
        ...state,
        habitaciones: state.habitaciones.filter((hab) => hab.id !== action.payload),
      };

    case 'TOGGLE_EXPANDED':
      return {
        ...state,
        expandedHabs: {
          ...state.expandedHabs,
          [action.payload]: !state.expandedHabs[action.payload],
        },
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
    }
  };

  const recargar = async () => {
    if (state.selectedViajeId) await cargarHabitaciones(state.selectedViajeId);
  };

  const registrarPago = async (personaId, pago) => {
    try {
      await api.registrarPago(personaId, pago);
      await recargar();
    } catch (error) {
      console.error('Error registrando pago:', error);
      throw error;
    }
  };

  const actualizarPago = async (personaId, pagoId, pago) => {
    try {
      await api.actualizarPago(personaId, pagoId, pago);
      await recargar();
    } catch (error) {
      console.error('Error actualizando pago:', error);
      throw error;
    }
  };

  const eliminarPago = async (personaId, pagoId) => {
    try {
      await api.eliminarPago(personaId, pagoId);
      await recargar();
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
    }
  };

  const actualizarEtiqueta = async (habId, etiqueta) => {
    try {
      dispatch({ type: 'ACTUALIZAR_ETIQUETA', payload: { habId, etiqueta } });
      await api.actualizarEtiqueta(habId, etiqueta);
    } catch (error) {
      console.error('Error actualizando etiqueta:', error);
      await cargarHabitaciones(state.selectedViajeId);
    }
  };

  const setFiltros = (filtros) => {
    dispatch({ type: 'SET_FILTROS', payload: filtros });
  };

  const viajeActual = state.viajes.find((v) => v.id === state.selectedViajeId);
  const soloLectura = viajeActual?.estado === 'cerrado';

  const value = {
    state,
    soloLectura,
    cargarHabitaciones,
    crearViaje,
    editarViaje,
    cambiarEstadoViaje,
    eliminarViaje,
    seleccionarViaje,
    agregarHabitacion,
    editarHabitacion,
    eliminarHabitacion,
    toggleExpanded: (id) => dispatch({ type: 'TOGGLE_EXPANDED', payload: id }),
    registrarPago,
    actualizarPago,
    eliminarPago,
    eliminarPersona,
    moverPersona,
    actualizarNota,
    actualizarEtiqueta,
    setFiltros,
  };

  return (
    <HabitacionesContext.Provider value={value}>{children}</HabitacionesContext.Provider>
  );
};