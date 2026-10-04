import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { DashboardFull } from '../Dashboard/DashboardFull';
import { ViajeCard } from './ViajeCard';
import { Plus, BarChart2, History, LogOut, Archive, LockOpen } from 'lucide-react';

const HomeViajes = ({ onSelectViaje }) => {
  const navigate = useNavigate();
  const { state, crearViaje, seleccionarViaje, cambiarEstadoViaje } = useHabitacionesContext();
  const { user, logout } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const viajesActivos  = state.viajes.filter((v) => v.estado !== 'cerrado');
  const viajesCerrados = state.viajes.filter((v) => v.estado === 'cerrado');

  const handleReabrir = async (viaje) => {
    if (!window.confirm(`¿Reabrir "${viaje.nombre}"? Volverá a la lista de viajes activos y se podrá editar.`)) return;
    try {
      await cambiarEstadoViaje(viaje.id, 'activo');
    } catch (error) {
      alert(`No se pudo reabrir el viaje: ${error.message}`);
    }
  };

  const handleSelectViaje = async (viaje) => {
    await seleccionarViaje(viaje.id);
    onSelectViaje(viaje);
  };

  const handleCrearViaje = async (datos) => {
    await crearViaje(datos);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] bg-dot-grid">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* ── Animated Hero Header ── */}
        <div
          className="relative overflow-hidden rounded-2xl mb-8 p-6 sm:p-8 animate-fade-in-scale"
          style={{
            background: 'linear-gradient(135deg, #141820 0%, #0f1117 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Floating orbs */}
          <div className="orb w-72 h-72" style={{ top: '-80px', left: '-60px', background: '#0d9488', opacity: 0.14 }} />
          <div className="orb orb-reverse w-56 h-56" style={{ bottom: '-60px', right: '-40px', background: '#06b6d4', opacity: 0.10 }} />
          <div className="orb w-40 h-40" style={{ top: '20px', right: '35%', background: '#8b5cf6', opacity: 0.07, animationDelay: '3s' }} />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-center">
            {/* Title block */}
            <div className="animate-fade-in-up stagger-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold gradient-text tracking-tight leading-tight">
                  Mis Viajes
                </h1>
                {user && (
                  <span className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-white/5 border border-white/[0.07] rounded-full px-3 py-1">
                    {user.nombreDisplay || user.username}
                    <button
                      onClick={logout}
                      className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
                      title="Cerrar sesión"
                    >
                      <LogOut className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <p className="text-gray-500 mt-2 text-sm">
                Gestiona y monitorea todos tus viajes y pagos en tiempo real
              </p>
            </div>

            {/* Nav buttons */}
            <div className="flex gap-2 flex-wrap animate-fade-in-up stagger-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`btn-press flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeView === 'dashboard'
                    ? 'bg-teal-500 text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07] hover:border-white/15'
                }`}
                style={activeView === 'dashboard' ? { boxShadow: '0 4px 16px -4px rgba(13,148,136,0.4)' } : undefined}
              >
                Dashboard
              </button>

              <button
                onClick={() => setActiveView('viajes')}
                className={`btn-press flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeView === 'viajes'
                    ? 'bg-teal-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07] hover:border-white/15'
                }`}
                style={activeView === 'viajes' ? { boxShadow: '0 4px 16px -4px rgba(13,148,136,0.4)' } : undefined}
              >
                Mis Viajes
              </button>

              <button
                onClick={() => setActiveView('historial')}
                className={`btn-press flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  activeView === 'historial'
                    ? 'bg-teal-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07] hover:border-white/15'
                }`}
                style={activeView === 'historial' ? { boxShadow: '0 4px 16px -4px rgba(13,148,136,0.4)' } : undefined}
              >
                <Archive className="h-4 w-4" />
                Historial{viajesCerrados.length > 0 ? ` (${viajesCerrados.length})` : ''}
              </button>

              <button
                onClick={() => navigate('/reportes')}
                className="btn-press flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07] hover:border-white/15 transition-all duration-200 flex items-center gap-1.5"
              >
                <BarChart2 className="h-4 w-4" />
                Reportes
              </button>

              <button
                onClick={() => navigate('/actividad')}
                className="btn-press flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 text-gray-400 hover:bg-white/10 border border-white/[0.07] hover:border-white/15 transition-all duration-200 flex items-center gap-1.5"
              >
                <History className="h-4 w-4" />
                Actividad
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-press w-full sm:w-auto text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                  boxShadow: '0 4px 20px -4px rgba(13,148,136,0.5)',
                }}
              >
                <Plus className="h-4 w-4" />
                Nuevo viaje
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        {activeView === 'dashboard' ? (
          <DashboardFull onSelectViaje={handleSelectViaje} />
        ) : activeView === 'historial' ? (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-400" /> Historial de viajes
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Viajes cerrados. Puedes consultarlos pero no editarlos.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {viajesCerrados.map((viaje, i) => (
                <div key={viaje.id} className="flex flex-col gap-2">
                  <ViajeCard viaje={viaje} onSelect={handleSelectViaje} index={i} />
                  <button type="button" onClick={() => handleReabrir(viaje)}
                    className="self-end flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-teal-300 px-2 py-1 rounded-lg hover:bg-teal-500/10 transition-colors">
                    <LockOpen className="h-3.5 w-3.5" /> Reabrir
                  </button>
                </div>
              ))}
              {viajesCerrados.length === 0 && (
                <p className="col-span-full text-center py-16 text-gray-600 text-sm">
                  Aún no hay viajes cerrados. Cierra un viaje desde "Editar viaje" en el dashboard cuando termine.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {viajesActivos.map((viaje, i) => (
              <ViajeCard key={viaje.id} viaje={viaje} onSelect={handleSelectViaje} index={i} />
            ))}
            {state.viajes.length > 0 && viajesActivos.length === 0 && (
              <p className="col-span-full text-center py-16 text-gray-600 text-sm">
                No hay viajes activos. Los viajes cerrados están en Historial.
              </p>
            )}
            {state.viajes.length === 0 && (
              <div className="col-span-full text-center py-20 animate-fade-in">
                <div className="text-5xl mb-4 animate-float inline-block">✈️</div>
                <p className="text-gray-600 font-semibold mt-4">No hay viajes registrados aún.</p>
                <p className="text-gray-700 text-sm mt-1">Crea tu primer viaje para comenzar.</p>
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
