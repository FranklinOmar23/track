import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { HabitacionCard } from './HabitacionCard';
import ModalDetallesHabitacion from '../Modals/ModalDetallesHabitacion';
import { Tag } from 'lucide-react';

const COLORES_ETIQUETA = [
  { bg: 'bg-teal-900/40',   text: 'text-teal-400',   border: 'border-teal-600/40',   header: 'bg-teal-900/20 border-teal-700/30' },
  { bg: 'bg-violet-900/40', text: 'text-violet-400', border: 'border-violet-600/40', header: 'bg-violet-900/20 border-violet-700/30' },
  { bg: 'bg-amber-900/40',  text: 'text-amber-400',  border: 'border-amber-600/40',  header: 'bg-amber-900/20 border-amber-700/30' },
  { bg: 'bg-rose-900/40',   text: 'text-rose-400',   border: 'border-rose-600/40',   header: 'bg-rose-900/20 border-rose-700/30' },
  { bg: 'bg-cyan-900/40',   text: 'text-cyan-400',   border: 'border-cyan-600/40',   header: 'bg-cyan-900/20 border-cyan-700/30' },
  { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-600/40', header: 'bg-orange-900/20 border-orange-700/30' },
];

const getColorForEtiqueta = (etiqueta, etiquetasOrdenadas) => {
  const idx = etiquetasOrdenadas.indexOf(etiqueta);
  return COLORES_ETIQUETA[idx % COLORES_ETIQUETA.length];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const HabitacionesList = () => {
  const { state } = useHabitacionesContext();
  const { habitaciones, filtros } = state;
  const [selectedHabitacion, setSelectedHabitacion] = useState(null);
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('todas');

  // Etiquetas únicas presentes en el viaje
  const etiquetasUnicas = [...new Set(
    habitaciones.map((h) => h.etiqueta || '').filter(Boolean)
  )].sort();

  const filtrarHabitaciones = () => {
    let resultado = [...habitaciones];

    if (etiquetaFiltro !== 'todas') {
      resultado = resultado.filter((hab) =>
        etiquetaFiltro === '__sin__'
          ? !hab.etiqueta
          : hab.etiqueta === etiquetaFiltro
      );
    }

    if (filtros.busqueda) {
      const term = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(
        (hab) =>
          hab.num.toLowerCase().includes(term) ||
          hab.personas.some((p) => p.n.toLowerCase().includes(term))
      );
    }

    if (filtros.estado === 'pendiente') {
      resultado = resultado.filter((hab) => {
        const pagado = hab.personas.reduce(
          (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0),
          0
        );
        return pagado < hab.total;
      });
    }

    if (filtros.estado === 'completo') {
      resultado = resultado.filter((hab) => {
        const pagado = hab.personas.reduce(
          (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0),
          0
        );
        return pagado >= hab.total;
      });
    }

    return resultado;
  };

  const habitacionesFiltradas = filtrarHabitaciones();

  // Agrupar por etiqueta
  const grupos = {};
  habitacionesFiltradas.forEach((hab) => {
    const clave = hab.etiqueta || '__sin__';
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(hab);
  });

  // Orden: etiquetas nombradas primero, sin etiqueta al final
  const clavesOrdenadas = [
    ...etiquetasUnicas.filter((e) => grupos[e]),
    ...(grupos['__sin__'] ? ['__sin__'] : []),
  ];

  return (
    <>
      {/* Filtro de etiquetas como chips */}
      {etiquetasUnicas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 mt-2">
          <button
            onClick={() => setEtiquetaFiltro('todas')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              etiquetaFiltro === 'todas'
                ? 'bg-teal-500/20 text-teal-400 border-teal-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
            }`}
          >
            Todas ({habitaciones.length})
          </button>

          {etiquetasUnicas.map((etiqueta) => {
            const color = getColorForEtiqueta(etiqueta, etiquetasUnicas);
            const count = habitaciones.filter((h) => h.etiqueta === etiqueta).length;
            const activa = etiquetaFiltro === etiqueta;
            return (
              <button
                key={etiqueta}
                onClick={() => setEtiquetaFiltro(activa ? 'todas' : etiqueta)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activa
                    ? `${color.bg} ${color.text} ${color.border}`
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                <Tag className="h-3 w-3" />
                {etiqueta} ({count})
              </button>
            );
          })}

          {grupos['__sin__'] && (
            <button
              onClick={() => setEtiquetaFiltro(etiquetaFiltro === '__sin__' ? 'todas' : '__sin__')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                etiquetaFiltro === '__sin__'
                  ? 'bg-white/15 text-gray-200 border-white/30'
                  : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
              }`}
            >
              Sin etiqueta ({grupos['__sin__'].length})
            </button>
          )}
        </div>
      )}

      {/* Grupos de habitaciones */}
      {clavesOrdenadas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No hay habitaciones que coincidan con el filtro.</p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {clavesOrdenadas.map((clave) => {
            const habs = grupos[clave];
            const esNombreada = clave !== '__sin__';
            const color = esNombreada
              ? getColorForEtiqueta(clave, etiquetasUnicas)
              : { bg: 'bg-white/10', text: 'text-gray-400', border: 'border-white/10', header: 'bg-white/[0.03] border-white/[0.07]' };

            // Stats del grupo
            const totalGrupo = habs.reduce((s, h) => s + (h.total || 0), 0);
            const pagadoGrupo = habs.reduce(
              (s, h) =>
                s +
                h.personas.reduce(
                  (sp, p) => sp + (p.pagos?.reduce((sg, pg) => sg + pg.monto, 0) || 0),
                  0
                ),
              0
            );

            return (
              <div key={clave}>
                {/* Header del grupo */}
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border mb-3 ${color.header}`}>
                  <div className="flex items-center gap-2">
                    <Tag className={`h-4 w-4 ${color.text}`} />
                    <span className={`font-semibold text-sm ${color.text}`}>
                      {esNombreada ? clave : 'Sin etiqueta'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text} ${color.border} border`}>
                      {habs.length} hab.
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Recaudado:{' '}
                      <span className="font-semibold text-emerald-400">{formatCurrency(pagadoGrupo)}</span>
                    </span>
                    <span>
                      Pendiente:{' '}
                      <span className="font-semibold text-red-400">
                        {formatCurrency(Math.max(0, totalGrupo - pagadoGrupo))}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Grid de cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {habs.map((habitacion) => (
                    <HabitacionCard
                      key={habitacion.id}
                      habitacion={habitacion}
                      onSelect={setSelectedHabitacion}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedHabitacion && (
        <ModalDetallesHabitacion
          habitacion={selectedHabitacion}
          onClose={() => setSelectedHabitacion(null)}
        />
      )}
    </>
  );
};

export default HabitacionesList;