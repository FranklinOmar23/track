import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './Context/AuthContext';
import { HabitacionesProvider } from './Context/HabitacionesContext';
import HomeViajes from './components/layout/HomeViajes';
import ViajeView from './components/layout/ViajeView';
import ViajePublico from './components/Dashboard/ViajePublico';
import ViajeExpirado from './components/Dashboard/ViajeExpirado';
// Páginas pesadas (gráficas) se descargan solo al entrar: la app abre más rápido
const ReportesView = lazy(() => import('./components/reportes/ReportesView'));
const ActividadView = lazy(() => import('./components/logs/ActividadView'));

const CargandoPagina = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
    <div className="h-8 w-8 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
  </div>
);
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
      <Route path="/reportes" element={<Suspense fallback={<CargandoPagina />}><ReportesView /></Suspense>} />
      <Route path="/actividad" element={<Suspense fallback={<CargandoPagina />}><ActividadView /></Suspense>} />
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
