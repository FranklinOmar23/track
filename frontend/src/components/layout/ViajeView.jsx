import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import MenuExportarExcel from './MenuExportarExcel';
import MenuUsuario from '../common/MenuUsuario';
import StatsGrid from './StatsGrid';
import Toolbar from './Toolbar';
import HabitacionesList from '../Habitaciones/HabitacionesList';
import ModalAgregarHabitacion from '../Modals/ModalAgregarHabitacion';
import ModalDesgloseGeneral from '../Modals/ModalDesgloseGeneral';
import { Lock, Eye } from 'lucide-react';

const ViajeView = ({ onBack }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { abrirViaje, state } = useHabitacionesContext();
  const { puede } = useAuthContext();
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [isDesgloseOpen, setIsDesgloseOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viaje, setViaje] = useState(null);
  // Recargar cada vez que cambia el slug (p. ej. al elegir otro viaje en el selector).
  // abrirViaje cambia de identidad en cada render del contexto, por eso no va en las dependencias.
  useEffect(() => {
    let cancelado = false;
    const cargarViaje = async () => {
      setLoading(true);
      try {
        const viajeData = await abrirViaje(slug);
        if (cancelado) return;
        setViaje(viajeData);
      } catch (err) {
        console.error(err);
        if (!cancelado) navigate('/');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargarViaje();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-gray-400">Cargando viaje...</p>
    </div>
  );
  if (!viaje) return null;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.07] mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-white transition-colors text-xl p-1.5 rounded-lg hover:bg-white/5 shrink-0"
              >
                ←
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-white truncate">
                ResortMamaTingo — Control de pagos
              </h1>
              <p className="mt-0.5 text-sm text-gray-500 truncate">
                Viaje: {viaje.nombre}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MenuUsuario className="hidden sm:block" />
            <MenuExportarExcel
              habitaciones={state.habitaciones}
              viaje={state.viajes.find((v) => v.id === viaje.id) || viaje}
            />
          </div>
        </div>
        {state.viajes.find((v) => v.id === viaje.id)?.estado === 'cerrado' && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20">
            <Lock className="h-4 w-4" /> Viaje cerrado · modo solo lectura. Para hacer cambios, reábrelo desde Historial.
          </div>
        )}
        {state.viajes.find((v) => v.id === viaje.id)?.estado !== 'cerrado' && !puede('editar') && !puede('pagos') && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl text-sm text-sky-300 bg-sky-500/10 border border-sky-500/20">
            <Eye className="h-4 w-4" /> Modo consulta: tu usuario puede ver este viaje pero no hacer cambios.
          </div>
        )}
        <StatsGrid />
        <Toolbar
          onOpenAgregar={() => setIsAgregarOpen(true)}
          onOpenDesglose={() => setIsDesgloseOpen(true)}
        />
        <HabitacionesList />
        <ModalAgregarHabitacion
          open={isAgregarOpen}
          onClose={() => setIsAgregarOpen(false)}
        />
        {isDesgloseOpen && (
          <ModalDesgloseGeneral onClose={() => setIsDesgloseOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default ViajeView;
