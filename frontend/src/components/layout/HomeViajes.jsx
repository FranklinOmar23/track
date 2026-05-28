import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { DashboardFull } from '../Dashboard/DashboardFull';
import { ViajeCard } from './ViajeCard'; // necesitas tener este componente

const HomeViajes = ({ onSelectViaje }) => {
  const { state, crearViaje, seleccionarViaje } = useHabitacionesContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' o 'viajes'

  const handleSelectViaje = async (viaje) => {
    await seleccionarViaje(viaje.id);
    onSelectViaje(viaje);
  };

  const handleCrearViaje = async (datos) => {
    await crearViaje(datos);
    setIsModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header con botones de navegación */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Viajes</h1>
          <p className="text-muted-foreground mt-1">
            Selecciona un viaje para gestionar sus habitaciones
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('viajes')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'viajes'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Mis Viajes
          </button>
          <button
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <span>+</span> Nuevo viaje
          </button>
        </div>
      </div>

      {/* Vista condicional */}
      {activeView === 'dashboard' ? (
        <DashboardFull onSelectViaje={handleSelectViaje} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.viajes.map((viaje) => (
            <ViajeCard key={viaje.id} viaje={viaje} onSelect={handleSelectViaje} />
          ))}
          {state.viajes.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No hay viajes registrados aún.</p>
            </div>
          )}
        </div>
      )}

      <ModalAgregarViaje
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCrearViaje}
      />
    </div>
  );
};

export default HomeViajes;