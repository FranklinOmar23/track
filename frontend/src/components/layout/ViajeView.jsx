import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { fetchViajeBySlug } from '../../utils/api';
import Header from './Header';
import StatsGrid from './StatsGrid';
import Toolbar from './Toolbar';
import HabitacionesList from '../Habitaciones/HabitacionesList';
import ModalAgregarHabitacion from '../Modals/ModalAgregarHabitacion';
import ModalDesgloseGeneral from '../Modals/ModalDesgloseGeneral';

const ViajeView = ({ onBack }) => {
  const { tipo, slug } = useParams();
  const navigate = useNavigate();
  const { seleccionarViaje } = useHabitacionesContext();
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

  if (loading) return <div className="p-8 text-center">Cargando viaje...</div>;
  if (!viaje) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <Header viaje={viaje} onBack={onBack} />
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
  );
};

export default ViajeView;