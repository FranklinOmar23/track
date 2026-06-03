import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { HabitacionesProvider } from './Context/HabitacionesContext';
import HomeViajes from './components/layout/HomeViajes';
import ViajeView from './components/layout/ViajeView';
import ViajePublico from './components/Dashboard/ViajePublico';
import ViajeExpirado from './components/Dashboard/ViajeExpirado';
import './components/styles/global.css';


function AppContent() {
  const navigate = useNavigate();

  const handleSelectViaje = (viaje) => {
    const tipoUrl = viaje.tipo === 'tour' ? 'tour' : 'resort';
    navigate(`/${tipoUrl}/${viaje.slug || viaje.nombre.toLowerCase().replace(/ /g, '-')}`);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <HabitacionesProvider>
      <Routes>
        <Route path="/" element={<HomeViajes onSelectViaje={handleSelectViaje} />} />
        <Route path="/:tipo/:slug" element={<ViajeView onBack={handleBack} />} />
        <Route path="/viaje/:tipo/:slug" element={<ViajeView />} />
        <Route path="/viaje-compartido/:token" element={<ViajePublico />} />
        <Route path="/viaje-expirado" element={<ViajeExpirado />} />
      </Routes>
    </HabitacionesProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;