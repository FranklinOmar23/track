import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './Context/AuthContext';
import { HabitacionesProvider } from './Context/HabitacionesContext';
import AppLayout from './components/layout/AppLayout';
import HomeViajes from './components/layout/HomeViajes';
import ViajeView from './components/layout/ViajeView';
import ViajePublico from './components/Dashboard/ViajePublico';
import ViajeExpirado from './components/Dashboard/ViajeExpirado';
import LoginView from './components/auth/LoginView';
import './components/styles/global.css';
import { EsqueletoPagina } from './components/common/Esqueleto';

// Páginas pesadas (gráficas) se descargan solo al entrar: la app abre más rápido
const ReportesView = lazy(() => import('./components/reportes/ReportesView'));
const ActividadView = lazy(() => import('./components/logs/ActividadView'));
const UsuariosView = lazy(() => import('./components/usuarios/UsuariosView'));

const CargandoPagina = () => <EsqueletoPagina />;

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

const Diferida = ({ children }) => <Suspense fallback={<CargandoPagina />}>{children}</Suspense>;

function AppContent() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeViajes vista="dashboard" />} />
        <Route path="/viajes" element={<HomeViajes vista="viajes" />} />
        <Route path="/historial" element={<HomeViajes vista="historial" />} />
        <Route path="/reportes" element={<RequierePermiso permiso="reportes"><Diferida><ReportesView /></Diferida></RequierePermiso>} />
        <Route path="/actividad" element={<RequierePermiso permiso="actividad"><Diferida><ActividadView /></Diferida></RequierePermiso>} />
        <Route path="/usuarios" element={<RequierePermiso admin><Diferida><UsuariosView /></Diferida></RequierePermiso>} />
        <Route path="/:tipo/:slug" element={<ViajeView />} />
        <Route path="/viaje/:tipo/:slug" element={<ViajeView />} />
      </Route>
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
