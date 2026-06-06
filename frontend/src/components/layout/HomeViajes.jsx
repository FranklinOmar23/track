import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { DashboardFull } from '../Dashboard/DashboardFull';
import { ViajeCard } from './ViajeCard';
import { Plus, BarChart2 } from 'lucide-react';

const HomeViajes = ({ onSelectViaje }) => {
  const navigate = useNavigate();
  const { state, crearViaje, seleccionarViaje } = useHabitacionesContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView]   = useState('dashboard');

  const handleSelectViaje = async (viaje) => {
    await seleccionarViaje(viaje.id);
    onSelectViaje(viaje);
  };

  const handleCrearViaje = async (datos) => {
    await crearViaje(datos);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Mis Viajes</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Selecciona un viaje para gestionar sus habitaciones
            </p>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeView === 'dashboard'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('viajes')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeView === 'viajes'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07]'
              }`}
            >
              Mis Viajes
            </button>
            <button
              onClick={() => navigate('/reportes')}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07] flex items-center gap-1.5"
            >
              <BarChart2 className="h-4 w-4" />
              Reportes
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Nuevo viaje
            </button>
          </div>
        </div>

        {activeView === 'dashboard' ? (
          <DashboardFull onSelectViaje={handleSelectViaje} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.viajes.map((viaje) => (
              <ViajeCard key={viaje.id} viaje={viaje} onSelect={handleSelectViaje} />
            ))}
            {state.viajes.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No hay viajes registrados aún.</p>
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
    </div>
  );
};

export default HomeViajes;
