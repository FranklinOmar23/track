import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, EyeOff, Clock, AlertCircle, Search } from 'lucide-react';
import { fetchViajePublico } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';

const ViajeExpiradoScreen = () => (
  <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-2xl p-8">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Enlace expirado</h1>
        <p className="text-gray-400 mb-4">
          Este enlace ha expirado. Contacta al administrador para obtener uno nuevo.
        </p>
      </div>
    </div>
  </div>
);

const ErrorScreen = ({ mensaje }) => (
  <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-2xl p-8">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Link inválido</h1>
        <p className="text-gray-400">{mensaje || 'Este enlace no es válido o ha sido desactivado.'}</p>
      </div>
    </div>
  </div>
);

const HabitacionCard = ({ habitacion, fmt }) => {
  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  const totalHab = habitacion.total || 0;
  const pendiente = totalHab - totalPagado;
  const porcentaje = totalHab > 0 ? (totalPagado / totalHab) * 100 : 0;
  const isStack = habitacion.stack;
  const isComplete = !isStack && pendiente <= 0 && totalPagado > 0;

  let borderColor = 'border-white/[0.07]';
  if (isStack) borderColor = 'border-emerald-500/50';
  else if (isComplete) borderColor = 'border-teal-500/50';
  else if (porcentaje >= 30) borderColor = 'border-blue-500/40';
  else if (porcentaje > 0) borderColor = 'border-amber-500/40';
  else borderColor = 'border-red-500/30';

  return (
    <div className={`bg-[#1a1f2e] border ${borderColor} rounded-xl p-4 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/25">
            Hab. {habitacion.num}
          </span>
          {habitacion.tipo && (
            <span className="text-xs text-gray-500">{habitacion.tipo}</span>
          )}
          {isStack && (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">STACK</span>
          )}
          {isComplete && !isStack && (
            <span className="px-2 py-0.5 rounded text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20">Completada</span>
          )}
        </div>
        {habitacion.etiqueta && (
          <span className="text-xs text-gray-500 truncate max-w-[100px]">{habitacion.etiqueta}</span>
        )}
      </div>

      {habitacion.personas.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {habitacion.personas.map((persona, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-200">
                {persona.n}
                {persona.esNino && <span className="text-xs text-amber-400 ml-1">(niño)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isStack && totalHab > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso</span>
            <span>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2 border-t border-white/[0.05]">
        {totalPagado > 0 && (
          <div>
            <p className="text-xs text-gray-500">Pagado</p>
            <p className="text-sm font-semibold text-emerald-400">{fmt(totalPagado)}</p>
          </div>
        )}
        {!isStack && pendiente > 0 && (
          <div>
            <p className="text-xs text-gray-500">Pendiente</p>
            <p className="text-sm font-semibold text-rose-400">{fmt(pendiente)}</p>
          </div>
        )}
        {!totalPagado && !isStack && (
          <span className="text-xs text-gray-500">Sin pagos</span>
        )}
      </div>
    </div>
  );
};

const ViajePublico = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [data, setData] = useState(null);
  const [busqueda, setBusqueda] = useState('');

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

  if (errorType === 'expired') return <ViajeExpiradoScreen />;
  if (error) return <ErrorScreen mensaje={error} />;
  if (!data?.habitaciones) return <ErrorScreen mensaje="No se encontró información del viaje" />;

  const query = busqueda.toLowerCase().trim();
  const habitacionesFiltradas = query
    ? data.habitaciones.filter(
        (hab) =>
          hab.num?.toString().toLowerCase().includes(query) ||
          hab.etiqueta?.toLowerCase().includes(query) ||
          hab.personas.some((p) => p.n?.toLowerCase().includes(query))
      )
    : data.habitaciones;

  // Agrupar por etiqueta
  const grupos = {};
  habitacionesFiltradas.forEach((hab) => {
    const key = hab.etiqueta || 'General';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(hab);
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
            {data.habitaciones.length} habitaciones
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

        {/* Resultados vacíos */}
        {habitacionesFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Sin resultados para "{busqueda}"</p>
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
                <HabitacionCard key={hab.id} habitacion={hab} fmt={fmt} />
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
