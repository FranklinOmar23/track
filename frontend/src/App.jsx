import React, { useState } from 'react';
import { HabitacionesProvider } from './context/HabitacionesContext';
import Header from './components/layout/Header';
import StatsGrid from './components/layout/StatsGrid';
import Toolbar from './components/layout/Toolbar';
import HabitacionesList from './components/Habitaciones/HabitacionesList';
import ModalAgregarHabitacion from './components/Modals/ModalAgregarHabitacion';
import ModalDesgloseGeneral from './components/Modals/ModalDesgloseGeneral';
import './components/styles/global.css';

function App() {
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [isDesgloseOpen, setIsDesgloseOpen] = useState(false);

  return (
    <HabitacionesProvider>
      <div className="app-shell">
        <Header />
        <StatsGrid />
        <Toolbar onOpenAgregar={() => setIsAgregarOpen(true)} onOpenDesglose={() => setIsDesgloseOpen(true)} />
        <HabitacionesList />
        <ModalAgregarHabitacion open={isAgregarOpen} onClose={() => setIsAgregarOpen(false)} />
        {isDesgloseOpen && <ModalDesgloseGeneral onClose={() => setIsDesgloseOpen(false)} />}
      </div>
    </HabitacionesProvider>
  );
}

export default App;