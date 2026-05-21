import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { calcularTotalPagado } from '../utils/calculos';
import * as api from '../utils/api';

const HabitacionesContext = createContext();

const DEFAULT_VIAJE_ID = 'default';

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
      return {
        ...state,
        habitaciones: action.payload,
      };

    case 'SET_VIAJES':
      return {
        ...state,
        viajes: action.payload,
      };

    case 'SET_SELECTED_VIAJE':
      return {
        ...state,
        selectedViajeId: action.payload,
      };

    case 'AGREGAR_VIAJE':
      return {
        ...state,
        viajes: [action.payload, ...state.viajes],
      };

    case 'AGREGAR_HABITACION':
      return {
        ...state,
        habitaciones: [...state.habitaciones, action.payload],
      };

    case 'ELIMINAR_HABITACION':
      return {
        ...state,
        habitaciones: state.habitaciones.filter(hab => hab.id !== action.payload),
      };

    case 'TOGGLE_EXPANDED':
      return {
        ...state,
        expandedHabs: {
          ...state.expandedHabs,
          [action.payload]: !state.expandedHabs[action.payload],
        },
      };

    case 'REGISTRAR_PAGO':
      return {
        ...state,
        habitaciones: state.habitaciones.map(hab => {
          if (hab.id !== action.payload.habId) return hab;
          return {
            ...hab,
            personas: hab.personas.map((persona, idx) => {
              if (idx === action.payload.perIdx) {
                return {
                  ...persona,
                  pagos: [...(persona.pagos || []), action.payload.pago],
                };
              }
              return persona;
            }),
          };
        }),
      };

    case 'ACTUALIZAR_PAGO':
      return {
        ...state,
        habitaciones: state.habitaciones.map(hab => {
          if (hab.id !== action.payload.habId) return hab;
          return {
            ...hab,
            personas: hab.personas.map((persona, idx) => {
              if (idx !== action.payload.perIdx) return persona;
              return {
                ...persona,
                pagos: persona.pagos.map(pago =>
                  pago.id === action.payload.pago.id ? { ...pago, ...action.payload.pago } : pago
                ),
              };
            }),
          };
        }),
      };

    case 'ELIMINAR_PAGO':
      return {
        ...state,
        habitaciones: state.habitaciones.map(hab => {
          if (hab.id !== action.payload.habId) return hab;
          return {
            ...hab,
            personas: hab.personas.map((persona, idx) => {
              if (idx !== action.payload.perIdx) return persona;
              return {
                ...persona,
                pagos: (persona.pagos || []).filter(p => p.id !== action.payload.pagoId),
              };
            }),
          };
        }),
      };

    case 'MOVER_PERSONA': {
      const { habOrigen, habDestino, personaId } = action.payload;
      const nuevasHabitaciones = state.habitaciones.map((hab) => ({ ...hab, personas: [...hab.personas] }));
      const origen = nuevasHabitaciones.find((hab) => hab.id === habOrigen);
      const destino = nuevasHabitaciones.find((hab) => hab.id === habDestino);
      const personaIndex = origen?.personas.findIndex((p) => p.id === personaId);

      if (origen && destino && personaIndex >= 0) {
        const [persona] = origen.personas.splice(personaIndex, 1);
        destino.personas.push({ ...persona, posicion: destino.personas.length + 1 });
      }

      return {
        ...state,
        habitaciones: nuevasHabitaciones,
      };
    }

    case 'ACTUALIZAR_NOTA':
      return {
        ...state,
        habitaciones: state.habitaciones.map(hab => 
          hab.id === action.payload.habId 
            ? { ...hab, nota: action.payload.nota }
            : hab
        )
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

      if (!viajes.length) {
        try {
          const viajePredeterminado = await api.ensureDefaultViaje();
          dispatch({ type: 'SET_VIAJES', payload: [viajePredeterminado] });
          dispatch({ type: 'SET_SELECTED_VIAJE', payload: viajePredeterminado.id });
          await cargarHabitaciones(viajePredeterminado.id);
          return;
        } catch (error) {
          console.error('No se pudo crear el viaje predeterminado:', error);
          const fallbackViaje = {
            id: DEFAULT_VIAJE_ID,
            nombre: 'Resort MamaTingo',
            fechaInicio: null,
            fechaFin: null,
            nota: 'Viaje predeterminado para pagos existentes',
          };
          dispatch({ type: 'SET_VIAJES', payload: [fallbackViaje] });
          dispatch({ type: 'SET_SELECTED_VIAJE', payload: DEFAULT_VIAJE_ID });
          await cargarHabitaciones(DEFAULT_VIAJE_ID);
          return;
        }
      }

      dispatch({ type: 'SET_VIAJES', payload: viajes });
      if (viajes.length && !state.selectedViajeId) {
        dispatch({ type: 'SET_SELECTED_VIAJE', payload: viajes[0].id });
        await cargarHabitaciones(viajes[0].id);
      }
    } catch (error) {
      console.error('Error cargando viajes:', error);
    }
  };

  const cargarHabitaciones = async (viajeId = null) => {
    try {
      const effectiveViajeId = viajeId === DEFAULT_VIAJE_ID ? null : viajeId;
      const habitaciones = await api.fetchHabitaciones(effectiveViajeId);
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
      const nuevoViaje = await api.crearViaje(viaje);
      dispatch({ type: 'AGREGAR_VIAJE', payload: nuevoViaje });
      dispatch({ type: 'SET_SELECTED_VIAJE', payload: nuevoViaje.id });
      await cargarHabitaciones(nuevoViaje.id);
    } catch (error) {
      console.error('Error creando viaje:', error);
    }
  };

  const seleccionarViaje = async (viajeId) => {
    try {
      const effectiveViajeId = viajeId === DEFAULT_VIAJE_ID ? null : viajeId;
      dispatch({ type: 'SET_SELECTED_VIAJE', payload: viajeId });
      await cargarHabitaciones(effectiveViajeId);
    } catch (error) {
      console.error('Error seleccionando viaje:', error);
    }
  };

  const agregarHabitacion = async (hab) => {
    try {
      const nuevaHabitacion = await api.crearHabitacion({ ...hab, viajeId: state.selectedViajeId });
      dispatch({ type: 'AGREGAR_HABITACION', payload: nuevaHabitacion });
    } catch (error) {
      console.error('Error creando habitación:', error);
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

  const registrarPago = async (habId, perIdx, pago) => {
    try {
      const habitacion = state.habitaciones.find((hab) => hab.id === habId);
      const persona = habitacion?.personas[perIdx];
      if (!persona?.id) return;

      const nuevoPago = await api.registrarPago(persona.id, pago);
      dispatch({ type: 'REGISTRAR_PAGO', payload: { habId, perIdx, pago: nuevoPago } });
    } catch (error) {
      console.error('Error registrando pago:', error);
    }
  };

  const actualizarPago = async (habId, perIdx, pagoId, pago) => {
    try {
      const habitacion = state.habitaciones.find((hab) => hab.id === habId);
      const persona = habitacion?.personas[perIdx];
      if (!persona?.id) return;

      const pagoActualizado = await api.actualizarPago(persona.id, pagoId, pago);
      dispatch({ type: 'ACTUALIZAR_PAGO', payload: { habId, perIdx, pago: pagoActualizado } });
    } catch (error) {
      console.error('Error actualizando pago:', error);
    }
  };

  const eliminarPago = async (habId, perIdx, pagoId) => {
    try {
      const habitacion = state.habitaciones.find((hab) => hab.id === habId);
      const persona = habitacion?.personas[perIdx];
      if (!persona?.id) return;

      await api.eliminarPago(persona.id, pagoId);
      dispatch({ type: 'ELIMINAR_PAGO', payload: { habId, perIdx, pagoId } });
    } catch (error) {
      console.error('Error eliminando pago:', error);
    }
  };

  const moverPersona = async (habOrigen, habDestino, perIdx) => {
    try {
      const habitacion = state.habitaciones.find((hab) => hab.id === habOrigen);
      const persona = habitacion?.personas[perIdx];
      if (!persona?.id) return;

      await api.moverPersona(persona.id, habDestino);
      dispatch({ type: 'MOVER_PERSONA', payload: { habOrigen, habDestino, personaId: persona.id } });
    } catch (error) {
      console.error('Error moviendo persona:', error);
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

  const setFiltros = (filtros) => {
    dispatch({ type: 'SET_FILTROS', payload: filtros });
  };

  const value = {
    state,
    cargarHabitaciones,
    crearViaje,
    seleccionarViaje,
    agregarHabitacion,
    eliminarHabitacion,
    toggleExpanded: (id) => dispatch({ type: 'TOGGLE_EXPANDED', payload: id }),
    registrarPago,
    actualizarPago,
    eliminarPago,
    moverPersona,
    actualizarNota,
    setFiltros,
  };

  return <HabitacionesContext.Provider value={value}>{children}</HabitacionesContext.Provider>;
};
