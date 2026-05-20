import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { calcularTotalPagado } from '../utils/calculos';
import * as api from '../utils/api';

const HabitacionesContext = createContext();

const initialState = {
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

  const cargarHabitaciones = async () => {
    try {
      const habitaciones = await api.fetchHabitaciones();
      dispatch({ type: 'SET_HABITACIONES', payload: habitaciones });
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
    }
  };

  useEffect(() => {
    cargarHabitaciones();
  }, []);

  const agregarHabitacion = async (hab) => {
    try {
      const nuevaHabitacion = await api.crearHabitacion(hab);
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

      await api.registrarPago(persona.id, pago);
      dispatch({ type: 'REGISTRAR_PAGO', payload: { habId, perIdx, pago } });
    } catch (error) {
      console.error('Error registrando pago:', error);
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
    agregarHabitacion,
    eliminarHabitacion,
    toggleExpanded: (id) => dispatch({ type: 'TOGGLE_EXPANDED', payload: id }),
    registrarPago,
    moverPersona,
    actualizarNota,
    setFiltros,
  };

  return <HabitacionesContext.Provider value={value}>{children}</HabitacionesContext.Provider>;
};
