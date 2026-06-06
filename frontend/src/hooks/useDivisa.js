import { useHabitacionesContext } from '../Context/HabitacionesContext';
import { formatCurrency } from '../utils/formatters';

export const useDivisa = () => {
  const { state } = useHabitacionesContext();
  const viaje = state.viajes.find((v) => v.id === state.selectedViajeId);
  const divisa = viaje?.divisa || 'USD';
  return {
    divisa,
    fmt: (amount) => formatCurrency(amount, divisa),
  };
};
