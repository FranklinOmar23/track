import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { HabitacionCard } from './HabitacionCard';
import ModalDetallesHabitacion from '../Modals/ModalDetallesHabitacion';
import { Tag, LayoutGrid } from 'lucide-react';

const COLORES_ETIQUETA = [
  { bg: 'bg-teal-900/40',   text: 'text-teal-400',   border: 'border-teal-600/40',   header: 'bg-teal-900/20 border-teal-700/30',   dot: '#0d9488' },
  { bg: 'bg-violet-900/40', text: 'text-violet-400', border: 'border-violet-600/40', header: 'bg-violet-900/20 border-violet-700/30', dot: '#8b5cf6' },
  { bg: 'bg-amber-900/40',  text: 'text-amber-400',  border: 'border-amber-600/40',  header: 'bg-amber-900/20 border-amber-700/30',  dot: '#f59e0b' },
  { bg: 'bg-rose-900/40',   text: 'text-rose-400',   border: 'border-rose-600/40',   header: 'bg-rose-900/20 border-rose-700/30',   dot: '#f43f5e' },
  { bg: 'bg-cyan-900/40',   text: 'text-cyan-400',   border: 'border-cyan-600/40',   header: 'bg-cyan-900/20 border-cyan-700/30',   dot: '#06b6d4' },
  { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-600/40', header: 'bg-orange-900/20 border-orange-700/30', dot: '#f97316' },
];

const getColorForEtiqueta = (etiqueta, etiquetasOrdenadas) => {
  const idx = etiquetasOrdenadas.indexOf(etiqueta);
  return COLORES_ETIQUETA[idx % COLORES_ETIQUETA.length];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value || 0);

const HabitacionesList = () => {
  const { state } = useHabitacionesContext();
  const { habitaciones, filtros } = state;
  const [selectedHabitacion, setSelectedHabitacion] = useState(null);
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('todas');

  const etiquetasUnicas = [...new Set(
    habitaciones.map((h) => h.etiqueta || '').filter(Boolean)
  )].sort();

  const filtrarHabitaciones = () => {
    let resultado = [...habitaciones];

    if (etiquetaFiltro !== 'todas') {
      resultado = resultado.filter((hab) =>
        etiquetaFiltro === '__sin__' ? !hab.etiqueta : hab.etiqueta === etiquetaFiltro
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
          (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0), 0
        );
        return pagado < hab.total;
      });
    }

    if (filtros.estado === 'completo') {
      resultado = resultado.filter((hab) => {
        const pagado = hab.personas.reduce(
          (sum, p) => sum + (p.pagos?.reduce((s, pg) => s + pg.monto, 0) || 0), 0
        );
        return pagado >= hab.total;
      });
    }

    return resultado;
  };

  const habitacionesFiltradas = filtrarHabitaciones();

  const grupos = {};
  habitacionesFiltradas.forEach((hab) => {
    const clave = hab.etiqueta || '__sin__';
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(hab);
  });

  const clavesOrdenadas = [
    ...etiquetasUnicas.filter((e) => grupos[e]),
    ...(grupos['__sin__'] ? ['__sin__'] : []),
  ];

  // Assign a global card index for stagger animation
  let globalCardIndex = 0;

  return (
    <>
      {/* ── Etiqueta filter chips ── */}
      {etiquetasUnicas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 mt-2 animate-fade-in-up stagger-0">
          <button
            onClick={() => setEtiquetaFiltro('todas')}
            className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: etiquetaFiltro === 'todas' ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.05)',
              color: etiquetaFiltro === 'todas' ? '#2dd4bf' : 'rgba(255,255,255,0.45)',
              border: `1px solid ${etiquetaFiltro === 'todas' ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
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
                className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activa ? `${color.bg} ${color.text} ${color.border} border` : 'border border-white/[0.08] text-gray-500 hover:border-white/20 hover:text-gray-300'
                }`}
                style={{ backgroundColor: activa ? undefined : 'rgba(255,255,255,0.04)' }}
              >
                {activa && <div className="w-1.5 h-1.5 rounded-full" style={{ background: color.dot }} />}
                <Tag className="h-3 w-3" />
                {etiqueta} ({count})
              </button>
            );
          })}

          {grupos['__sin__'] && (
            <button
              onClick={() => setEtiquetaFiltro(etiquetaFiltro === '__sin__' ? 'todas' : '__sin__')}
              className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200"
              style={{
                backgroundColor: etiquetaFiltro === '__sin__' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: etiquetaFiltro === '__sin__' ? '#e2e8f0' : 'rgba(255,255,255,0.35)',
                borderColor: etiquetaFiltro === '__sin__' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              }}
            >
              Sin etiqueta ({grupos['__sin__'].length})
            </button>
          )}
        </div>
      )}

      {/* ── Grupos ── */}
      {clavesOrdenadas.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-4xl mb-3 animate-float inline-block">🏨</div>
          <p className="text-gray-600 font-semibold mt-3">No hay habitaciones que coincidan.</p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {clavesOrdenadas.map((clave, groupIdx) => {
            const habs = grupos[clave];
            const esNombreada = clave !== '__sin__';
            const color = esNombreada
              ? getColorForEtiqueta(clave, etiquetasUnicas)
              : { bg: 'bg-white/10', text: 'text-gray-400', border: 'border-white/10', header: 'bg-white/[0.03] border-white/[0.07]', dot: '#6b7280' };

            const totalGrupo   = habs.reduce((s, h) => s + (h.total || 0), 0);
            const pagadoGrupo  = habs.reduce(
              (s, h) => s + h.personas.reduce(
                (sp, p) => sp + (p.pagos?.reduce((sg, pg) => sg + pg.monto, 0) || 0), 0
              ), 0
            );
            const pctGrupo = totalGrupo > 0 ? Math.round((pagadoGrupo / totalGrupo) * 100) : 0;

            return (
              <div key={clave} className="animate-fade-in-up" style={{ animationDelay: `${groupIdx * 60}ms` }}>
                {/* Group header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-4 ${color.header}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color.dot }} />
                    <span className={`font-bold text-sm ${color.text}`}>
                      {esNombreada ? clave : 'Sin etiqueta'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text} ${color.border} border font-semibold`}>
                      {habs.length} hab.
                    </span>
                  </div>
                  <div className="flex items-center gap-5 text-xs">
                    <div className="text-right hidden sm:block">
                      <div className="text-gray-600 mb-0.5">Recaudado</div>
                      <div className="font-bold text-emerald-400 tabular-nums">{formatCurrency(pagadoGrupo)}</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-gray-600 mb-0.5">Pendiente</div>
                      <div className="font-bold text-rose-400 tabular-nums">{formatCurrency(Math.max(0, totalGrupo - pagadoGrupo))}</div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: pctGrupo >= 80 ? '#10b981' : pctGrupo >= 40 ? '#f59e0b' : '#f43f5e' }}
                    >
                      {pctGrupo}%
                    </div>
                  </div>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {habs.map((habitacion) => {
                    const cardIdx = globalCardIndex++;
                    return (
                      <HabitacionCard
                        key={habitacion.id}
                        habitacion={habitacion}
                        onSelect={setSelectedHabitacion}
                        index={cardIdx}
                      />
                    );
                  })}
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
