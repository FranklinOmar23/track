import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EyeOff, Clock, Search, Tag, LayoutGrid } from 'lucide-react';
import { fetchViajePublico } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { calcularPendientePersona } from '../../utils/calculos';
import ViajeExpirado from './ViajeExpirado';
import EnlaceInvalido from './EnlaceInvalido';
import HabitacionPublicaCard from './HabitacionPublicaCard';

const ViajePublico = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [data, setData] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('todas');

  useEffect(() => {
    if (!token) return;
    const cargarViaje = async () => {
      try {
        setLoading(true);
        const res = await fetchViajePublico(token);
        if (res?.error === 'expired') {
          setErrorType('expired');
          setError(res.mensaje);
        } else {
          setData(res);
        }
      } catch (err) {
        console.error('Error cargando viaje público:', err);
        if (err.message === 'expired') {
          setErrorType('expired');
        } else {
          setErrorType('invalid');
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    cargarViaje();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (errorType === 'expired') return <ViajeExpirado />;
  if (error) return <EnlaceInvalido mensaje={error} />;
  if (!data?.habitaciones) return <EnlaceInvalido mensaje="No se encontró información del viaje" />;

  const esSoloPendientes = data.viaje?.tipoCompartir === 'pendientes';

  const habitacionesBase = esSoloPendientes
    ? data.habitaciones
        .map((hab) => ({
          ...hab,
          personas: hab.personas.filter((p) => p.n && calcularPendientePersona(hab, p) > 0),
        }))
        .filter((hab) => hab.personas.length > 0)
    : data.habitaciones;

  const etiquetasUnicas = [...new Set(
    habitacionesBase.map((h) => h.etiqueta || '').filter(Boolean)
  )].sort();

  let habitacionesFiltradas = habitacionesBase;

  if (etiquetaFiltro !== 'todas') {
    habitacionesFiltradas = habitacionesFiltradas.filter((hab) =>
      etiquetaFiltro === '__sin__' ? !hab.etiqueta : hab.etiqueta === etiquetaFiltro
    );
  }

  const query = busqueda.toLowerCase().trim();
  if (query) {
    habitacionesFiltradas = habitacionesFiltradas.filter(
      (hab) =>
        hab.num?.toString().toLowerCase().includes(query) ||
        hab.etiqueta?.toLowerCase().includes(query) ||
        hab.personas.some((p) => p.n?.toLowerCase().includes(query))
    );
  }

  // Agrupar por etiqueta
  const grupos = {};
  habitacionesFiltradas.forEach((hab) => {
    const key = hab.etiqueta || 'General';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(hab);
  });

  Object.keys(grupos).forEach((key) => {
    grupos[key].sort((a, b) => {
      if (!!a.stack !== !!b.stack) return a.stack ? -1 : 1;
      return String(a.num).localeCompare(String(b.num), undefined, { numeric: true, sensitivity: 'base' });
    });
  });

  const tieneExpiracion = data.viaje?.expiraCompartir;
  const fechaExpiracion = tieneExpiracion ? new Date(data.viaje.expiraCompartir) : null;
  const expiraPronto = fechaExpiracion && (fechaExpiracion - new Date()) < 24 * 60 * 60 * 1000;
  const fmt = (amount) => formatCurrency(amount, data.viaje.divisa || 'USD');

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.07] mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">{data.viaje.nombre}</h1>
            <div className={`flex items-center gap-1.5 mt-1 text-xs ${expiraPronto ? 'text-red-400' : 'text-gray-500'}`}>
              <EyeOff className="h-3 w-3" />
              <span>Vista de solo lectura</span>
              {esSoloPendientes && (
                <>
                  <span>·</span>
                  <span className="text-amber-400">Solo personas con saldo pendiente</span>
                </>
              )}
              {tieneExpiracion && (
                <>
                  <span>·</span>
                  <Clock className="h-3 w-3" />
                  <span>
                    Expira {fechaExpiracion.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-600 hidden sm:block">
            {habitacionesBase.length} habitaciones
          </span>
        </div>

        {/* Buscador */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar habitación o persona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500/50 focus:bg-white/[0.07] transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Filtro por etiquetas */}
        {etiquetasUnicas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setEtiquetaFiltro('todas')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={{
                backgroundColor: etiquetaFiltro === 'todas' ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.05)',
                color: etiquetaFiltro === 'todas' ? '#2dd4bf' : 'rgba(255,255,255,0.45)',
                border: `1px solid ${etiquetaFiltro === 'todas' ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Todas ({habitacionesBase.length})
            </button>

            {etiquetasUnicas.map((etiqueta) => {
              const count = habitacionesBase.filter((h) => h.etiqueta === etiqueta).length;
              const activa = etiquetaFiltro === etiqueta;
              return (
                <button
                  key={etiqueta}
                  onClick={() => setEtiquetaFiltro(activa ? 'todas' : etiqueta)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: activa ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.05)',
                    color: activa ? '#2dd4bf' : 'rgba(255,255,255,0.45)',
                    border: `1px solid ${activa ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <Tag className="h-3 w-3" />
                  {etiqueta} ({count})
                </button>
              );
            })}

            {habitacionesBase.some((h) => !h.etiqueta) && (
              <button
                onClick={() => setEtiquetaFiltro(etiquetaFiltro === '__sin__' ? 'todas' : '__sin__')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: etiquetaFiltro === '__sin__' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                  color: etiquetaFiltro === '__sin__' ? '#e2e8f0' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${etiquetaFiltro === '__sin__' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                Sin etiqueta ({habitacionesBase.filter((h) => !h.etiqueta).length})
              </button>
            )}
          </div>
        )}

        {/* Resultados vacíos */}
        {habitacionesFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>
              {query
                ? `Sin resultados para "${busqueda}"`
                : esSoloPendientes
                  ? 'Nadie tiene saldo pendiente en este viaje'
                  : 'No hay habitaciones para mostrar'}
            </p>
          </div>
        )}

        {/* Habitaciones agrupadas */}
        {Object.entries(grupos).map(([etiqueta, habs]) => (
          <div key={etiqueta} className="mb-8">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-gray-300">{etiqueta}</h2>
              <span className="text-xs text-gray-600">{habs.length} hab.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {habs.map((hab) => (
                <HabitacionPublicaCard key={hab.id} habitacion={hab} fmt={fmt} />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8 pt-4 border-t border-white/[0.05] text-center">
          <p className="text-xs text-gray-700">Sistema de Control de Pagos · Solo lectura</p>
        </div>
      </div>
    </div>
  );
};

export default ViajePublico;
