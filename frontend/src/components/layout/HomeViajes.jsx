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
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mis Viajes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Selecciona un viaje para gestionar sus habitaciones
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors text-sm ${activeView === 'dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('viajes')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors text-sm ${activeView === 'viajes'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            Mis Viajes
          </button>
          <button
            className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
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