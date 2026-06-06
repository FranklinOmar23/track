import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { fetchViajeBySlug } from '../../utils/api';
import { exportarHabitacionesExcel } from '../../utils/exportExcel';
import StatsGrid from './StatsGrid';
import Toolbar from './Toolbar';
import HabitacionesList from '../Habitaciones/HabitacionesList';
import ModalAgregarHabitacion from '../Modals/ModalAgregarHabitacion';
import ModalDesgloseGeneral from '../Modals/ModalDesgloseGeneral';
import { FileDown } from 'lucide-react';

const ViajeView = ({ onBack }) => {
  const { tipo, slug } = useParams();
  const navigate = useNavigate();
  const { seleccionarViaje, state } = useHabitacionesContext();
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [isDesgloseOpen, setIsDesgloseOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viaje, setViaje] = useState(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    const cargarViaje = async () => {
      try {
        const viajeData = await fetchViajeBySlug(slug);
        setViaje(viajeData);
        await seleccionarViaje(viajeData.id);
      } catch (err) {
        console.error(err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    cargarViaje();
  }, [slug, seleccionarViaje, navigate]);

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
          <button
            onClick={() => exportarHabitacionesExcel(state.habitaciones, viaje)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
            title="Exportar lista a Excel"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        </div>
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
