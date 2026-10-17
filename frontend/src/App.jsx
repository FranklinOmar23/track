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
const UsuariosView = lazy(() => import('./components/usuarios/UsuariosView'));

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

/** Solo deja entrar si el usuario tiene el permiso (o es administrador, si se pide admin). */
function RequierePermiso({ permiso, admin, children }) {
  const { puede, esAdmin } = useAuthContext();
  const permitido = admin ? esAdmin : puede(permiso);
  return permitido ? children : <Navigate to="/" replace />;
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
      <Route path="/reportes" element={<RequierePermiso permiso="reportes"><Suspense fallback={<CargandoPagina />}><ReportesView /></Suspense></RequierePermiso>} />
      <Route path="/actividad" element={<RequierePermiso permiso="actividad"><Suspense fallback={<CargandoPagina />}><ActividadView /></Suspense></RequierePermiso>} />
      <Route path="/usuarios" element={<RequierePermiso admin><Suspense fallback={<CargandoPagina />}><UsuariosView /></Suspense></RequierePermiso>} />
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
