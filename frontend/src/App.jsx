import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './Context/AuthContext';
import { HabitacionesProvider } from './Context/HabitacionesContext';
import HomeViajes from './components/layout/HomeViajes';
import ViajeView from './components/layout/ViajeView';
import ViajePublico from './components/Dashboard/ViajePublico';
import ViajeExpirado from './components/Dashboard/ViajeExpirado';
import ReportesView from './components/reportes/ReportesView';
import ActividadView from './components/logs/ActividadView';
import LoginView from './components/auth/LoginView';
import './components/styles/global.css';
import { rutaViaje } from './utils/rutas';


function RequireAuth({ children }) {
  const { isAuthenticated } = useAuthContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppContent() {
  const navigate = useNavigate();

  const handleSelectViaje = (viaje) => {
    navigate(rutaViaje(viaje));
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/" element={<HomeViajes onSelectViaje={handleSelectViaje} />} />
      <Route path="/reportes" element={<ReportesView />} />
      <Route path="/actividad" element={<ActividadView />} />
      <Route path="/:tipo/:slug" element={<ViajeView onBack={handleBack} />} />
      <Route path="/viaje/:tipo/:slug" element={<ViajeView />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/viaje-compartido/:token" element={<ViajePublico />} />
          <Route path="/viaje-expirado" element={<ViajeExpirado />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <HabitacionesProvider>
                  <AppContent />
                </HabitacionesProvider>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
