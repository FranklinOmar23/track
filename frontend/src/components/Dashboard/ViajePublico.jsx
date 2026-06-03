import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users, EyeOff, Clock, AlertCircle, Home } from 'lucide-react';
import { fetchViajePublico } from '../../utils/api';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

// Componente de enlace expirado
const ViajeExpirado = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enlace expirado
          </h1>
          
          <p className="text-gray-500 mb-6">
            Este enlace de compartir ha expirado. 
            Por favor, contacta al administrador del viaje para obtener un nuevo enlace.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">¿Qué significa esto?</span>
            </div>
            <p className="text-xs text-amber-600">
              Por seguridad, los enlaces de compartir tienen un tiempo de vigencia limitado. 
              Una vez expirados, ya no se puede acceder a la información del viaje.
            </p>
          </div>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

// Componente de error genérico
const ErrorGenerico = ({ mensaje }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Link inválido
          </h1>
          
          <p className="text-gray-500 mb-6">
            {mensaje || 'Este enlace no es válido o ha sido desactivado.'}
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

const HabitacionPublicCard = ({ habitacion }) => {
  const totalPagado = habitacion.personas.reduce(
    (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + (pg.monto || 0), 0) || 0),
    0
  );
  const totalHabitacion = habitacion.total || 0;
  const pendiente = totalHabitacion - totalPagado;
  const porcentaje = totalHabitacion > 0 ? (totalPagado / totalHabitacion) * 100 : 0;
  const isStack = habitacion.stack;
  const hasPersonas = habitacion.personas && habitacion.personas.length > 0;
  const isComplete = pendiente === 0 && totalPagado > 0;

  return (
    <Card className={`p-4 border transition-all hover:shadow-lg bg-white ${
      isComplete ? 'border-teal-200 bg-gradient-to-br from-teal-50/50 to-white' : ''
    } ${isStack ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10 text-primary font-semibold px-3">
            Hab. {habitacion.num}
          </Badge>
          <span className="text-xs text-gray-500 font-medium">{habitacion.tipo}</span>
          {isStack && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
              STACK
            </Badge>
          )}
          {isComplete && !isStack && (
            <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
              Completada
            </Badge>
          )}
        </div>
      </div>

      {hasPersonas && (
        <div className="mb-3 space-y-1.5">
          {habitacion.personas.map((persona, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm font-medium text-gray-800">
                {persona.n}
                {persona.esNino && <span className="text-xs text-amber-600 ml-1">(niño)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {isStack && !hasPersonas && (
        <div className="mb-3 py-2">
          <span className="text-sm text-gray-500 italic">Sin asignar</span>
        </div>
      )}

      {totalHabitacion > 0 && !isStack && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso de pago</span>
            <span>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-teal-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(porcentaje, 100)}%` }} 
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          {totalPagado > 0 || pendiente > 0 ? (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Pagado</span>
                <span className="text-sm font-bold text-teal-600">{formatCurrency(totalPagado)}</span>
              </div>
              {pendiente > 0 && !isStack && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Pendiente</span>
                  <span className="text-sm font-bold text-rose-500">{formatCurrency(pendiente)}</span>
                </div>
              )}
              {isStack && (
                <span className="text-sm text-gray-500">Habitación stack</span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500">Sin pagos</span>
          )}
        </div>
        <EyeOff className="h-4 w-4 text-gray-400" title="Vista de solo lectura" />
      </div>
    </Card>
  );
};

const ViajePublico = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const cargarViaje = async () => {
      try {
        setLoading(true);
        const res = await fetchViajePublico(token);
        
        if (res?.error === 'expired') {
          setErrorType('expired');
          setError(res.mensaje || 'El enlace ha expirado');
        } else {
          setData(res);
        }
      } catch (err) {
        console.error('Error cargando viaje público:', err);
        setErrorType('invalid');
        setError(err.message || 'Error al cargar el viaje');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      cargarViaje();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (errorType === 'expired') {
    return <ViajeExpirado />;
  }

  if (error) {
    return <ErrorGenerico mensaje={error} />;
  }

  if (!data || !data.habitaciones) {
    return <ErrorGenerico mensaje="No se encontró información del viaje" />;
  }

  // Agrupar habitaciones por etiqueta
  const habitacionesPorEtiqueta = {};
  data.habitaciones.forEach(hab => {
    const etiqueta = hab.etiqueta || 'Sin etiqueta';
    if (!habitacionesPorEtiqueta[etiqueta]) {
      habitacionesPorEtiqueta[etiqueta] = [];
    }
    habitacionesPorEtiqueta[etiqueta].push(hab);
  });

  // Calcular totales
  let totalGlobalPorCobrar = 0;
  let totalGlobalPagado = 0;
  let totalStack = 0;
  
  data.habitaciones.forEach(hab => {
    const pagado = hab.personas.reduce((sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0), 0);
    totalGlobalPorCobrar += hab.stack ? 0 : (hab.total || 0);
    totalGlobalPagado += pagado;
    if (hab.stack) totalStack++;
  });
  
  const totalPendiente = totalGlobalPorCobrar - totalGlobalPagado;
  const porcentajeGlobal = totalGlobalPorCobrar > 0 ? (totalGlobalPagado / totalGlobalPorCobrar * 100) : 0;

  const tieneExpiracion = data.viaje?.expiraCompartir;
  const fechaExpiracion = tieneExpiracion ? new Date(data.viaje.expiraCompartir) : null;
  const expiraPronto = fechaExpiracion && (fechaExpiracion - new Date()) < 24 * 60 * 60 * 1000;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header con indicador de solo lectura */}
      <div className={`rounded-lg p-3 mb-6 text-center ${
        expiraPronto 
          ? 'bg-red-50 border border-red-200' 
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <p className="text-amber-700 text-sm flex items-center justify-center gap-2 flex-wrap">
          <EyeOff className="h-4 w-4" />
          Estás viendo una vista de solo lectura del viaje <strong>{data.viaje.nombre}</strong>
        </p>
        {tieneExpiracion && (
          <p className={`text-xs mt-1 flex items-center justify-center gap-1 ${
            expiraPronto ? 'text-red-600' : 'text-amber-600'
          }`}>
            <Clock className="h-3 w-3" />
            Este enlace expira el {fechaExpiracion.toLocaleDateString('es-DO')} a las {fechaExpiracion.toLocaleTimeString('es-DO')}
          </p>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Total por Cobrar</p>
          <p className="text-lg md:text-xl font-bold">{formatCurrency(totalGlobalPorCobrar)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Recaudado</p>
          <p className="text-lg md:text-xl font-bold text-teal-600">{formatCurrency(totalGlobalPagado)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Pendiente</p>
          <p className="text-lg md:text-xl font-bold text-rose-500">{formatCurrency(totalPendiente)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Habitaciones</p>
          <p className="text-lg md:text-xl font-bold">{data.habitaciones.length}</p>
          {totalStack > 0 && <p className="text-xs text-amber-600">({totalStack} stack)</p>}
        </div>
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Progreso</p>
          <p className="text-lg md:text-xl font-bold">{porcentajeGlobal.toFixed(1)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(porcentajeGlobal, 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Habitaciones agrupadas por etiqueta */}
      {Object.entries(habitacionesPorEtiqueta).map(([etiqueta, habitaciones]) => {
        let totalEtiqueta = 0;
        let pagadoEtiqueta = 0;
        habitaciones.forEach(hab => {
          const pagado = hab.personas.reduce((sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0), 0);
          totalEtiqueta += hab.stack ? 0 : (hab.total || 0);
          pagadoEtiqueta += pagado;
        });
        const porcentajeEtiqueta = totalEtiqueta > 0 ? (pagadoEtiqueta / totalEtiqueta * 100) : 0;
        
        return (
          <div key={etiqueta} className="mb-8">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{etiqueta}</h2>
              <div className="text-sm text-gray-500">
                <span className="text-teal-600">{formatCurrency(pagadoEtiqueta)}</span>
                <span className="mx-1">/</span>
                <span>{formatCurrency(totalEtiqueta)}</span>
                <span className="ml-2 text-xs">({porcentajeEtiqueta.toFixed(0)}%)</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {habitaciones.map((habitacion) => (
                <HabitacionPublicCard key={habitacion.id} habitacion={habitacion} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400">
          Información generada por Sistema de Control de Pagos - Datos en tiempo real
        </p>
      </div>
    </div>
  );
};

export default ViajePublico;