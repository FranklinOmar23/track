import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { HabitacionCard } from './HabitacionCard';
import ModalDetallesHabitacion from '../Modals/ModalDetallesHabitacion';

const HabitacionesList = () => {
  const { state } = useHabitacionesContext();
  const { habitaciones, filtros } = state;
  const [selectedHabitacion, setSelectedHabitacion] = useState(null);

  const filtrarHabitaciones = () => {
    let resultado = [...habitaciones];
    if (filtros.busqueda) {
      const term = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(hab =>
        hab.num.toLowerCase().includes(term) ||
        hab.personas.some(p => p.n.toLowerCase().includes(term))
      );
    }
    if (filtros.estado === 'pendiente') {
      resultado = resultado.filter(hab => {
        const pagado = hab.personas.reduce((sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0), 0);
        return pagado < hab.total;
      });
    }
    if (filtros.estado === 'completo') {
      resultado = resultado.filter(hab => {
        const pagado = hab.personas.reduce((sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0), 0);
        return pagado >= hab.total;
      });
    }
    return resultado;
  };

  const habitacionesFiltradas = filtrarHabitaciones();

  const handleCardClick = (habitacion) => {
    setSelectedHabitacion(habitacion);
  };

  const handleCloseModal = () => {
    setSelectedHabitacion(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {habitacionesFiltradas.map((habitacion) => (
          <HabitacionCard
            key={habitacion.id}
            habitacion={habitacion}
            onSelect={handleCardClick}
          />
        ))}
        {habitacionesFiltradas.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No hay habitaciones que coincidan con el filtro.</p>
          </div>
        )}
      </div>

      {selectedHabitacion && (
        <ModalDetallesHabitacion
          habitacion={selectedHabitacion}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default HabitacionesList;