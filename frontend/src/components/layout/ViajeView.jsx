import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Share2, Pencil, Lock, Eye } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import { rutaViaje } from '../../utils/rutas';
import { situacionViaje, textoCuenta, rangoCompacto } from '../../utils/viajeFechas';
import MenuExportarExcel from './MenuExportarExcel';
import SelectorViaje from './SelectorViaje';
import StatsGrid from './StatsGrid';
import Toolbar from './Toolbar';
import HabitacionesList from '../Habitaciones/HabitacionesList';
import ModalAgregarHabitacion from '../Modals/ModalAgregarHabitacion';
import ModalDesgloseGeneral from '../Modals/ModalDesgloseGeneral';
import ModalCompartir from '../Modals/ModalCompartir';
import ModalEditarViaje from '../Modals/ModalEditarViaje';
import Portal from '../common/Portal';
import { EsqueletoViaje } from '../common/Esqueleto';

const ViajeView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { abrirViaje, state } = useHabitacionesContext();
  const { puede } = useAuthContext();
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [isDesgloseOpen, setIsDesgloseOpen] = useState(false);
  const [isCompartirOpen, setIsCompartirOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viajeCargado, setViajeCargado] = useState(null);

  // Recargar cada vez que cambia el slug (p. ej. al elegir otro viaje en el selector).
  // abrirViaje cambia de identidad en cada render del contexto, por eso no va en las dependencias.
  useEffect(() => {
    let cancelado = false;
    const cargarViaje = async () => {
      setLoading(true);
      try {
        const viajeData = await abrirViaje(slug);
        if (cancelado) return;
        setViajeCargado(viajeData);
      } catch (err) {
        console.error(err);
        if (!cancelado) navigate('/viajes');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargarViaje();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) return <EsqueletoViaje />;
  if (!viajeCargado) return null;

  // Datos del viaje del contexto (se actualizan al editar) con lo cargado como respaldo
  const viaje = state.viajes.find((v) => v.id === viajeCargado.id) || viajeCargado;
  const cerrado = viaje.estado === 'cerrado';
  const tour = viaje.tipo === 'tour';
  const rango = rangoCompacto(viaje);
  const cuenta = cerrado ? null : textoCuenta(situacionViaje(viaje));
  const meta = [rango, cuenta, viaje.divisa || 'USD'].filter(Boolean);

  return (
    <div className="space-y-5 aparecer">
      {/* Migas */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500" aria-label="Ruta">
        <Link to={cerrado ? '/historial' : '/viajes'} className="hover:text-slate-900 transition-colors">
          {cerrado ? 'Historial' : 'Mis viajes'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 font-medium truncate">{viaje.nombre}</span>
      </nav>

      {/* Encabezado */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="titulo-pagina truncate">{viaje.nombre}</h1>
            <SelectorViaje
              viajes={state.viajes}
              valorId={viaje.id}
              onSeleccionar={(destino) => navigate(rutaViaje(destino))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-slate-500">
            <span className={`etiqueta-tipo ${tour ? 'etiqueta-tour' : 'etiqueta-resort'}`}>{tour ? 'Tour' : 'Resort'}</span>
            {cerrado && <span className="etiqueta-tipo etiqueta-gris gap-1"><Lock className="h-3 w-3" /> Cerrado</span>}
            {meta.map((m, i) => (
              <span key={m} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-300">·</span>}
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {puede('editar') && (
            <button type="button" onClick={() => setIsCompartirOpen(true)} className="btn btn-borde">
              <Share2 className="h-4 w-4" /> Compartir
            </button>
          )}
          <MenuExportarExcel habitaciones={state.habitaciones} viaje={viaje} />
          {(puede('editar') || puede('crear_viajes')) && (
            <button type="button" onClick={() => setIsEditarOpen(true)} className="btn btn-borde">
              <Pencil className="h-4 w-4" /> Editar viaje
            </button>
          )}
        </div>
      </div>

      {cerrado && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-amber-900 bg-amber-50 border border-amber-200">
          <Lock className="h-4 w-4 shrink-0" /> Viaje cerrado · modo solo lectura. Para hacer cambios, reábrelo desde Historial.
        </div>
      )}
      {!cerrado && !puede('editar') && !puede('pagos') && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-sky-900 bg-sky-50 border border-sky-200">
          <Eye className="h-4 w-4 shrink-0" /> Modo consulta: tu usuario puede ver este viaje pero no hacer cambios.
        </div>
      )}

      <StatsGrid />

      <div className="tarjeta animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <Toolbar
          onOpenAgregar={() => setIsAgregarOpen(true)}
          onOpenDesglose={() => setIsDesgloseOpen(true)}
        />
        <HabitacionesList />
      </div>

      <ModalAgregarHabitacion open={isAgregarOpen} onClose={() => setIsAgregarOpen(false)} />
      {isDesgloseOpen && <ModalDesgloseGeneral onClose={() => setIsDesgloseOpen(false)} />}
      {isCompartirOpen && (
        <Portal>
          <ModalCompartir viajeId={viaje.id} viajeNombre={viaje.nombre} onClose={() => setIsCompartirOpen(false)} />
        </Portal>
      )}
      <ModalEditarViaje viaje={viaje} open={isEditarOpen} onClose={() => setIsEditarOpen(false)}
        onEliminado={() => navigate('/viajes')} />
    </div>
  );
};

export default ViajeView;
