import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw } from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import { useStatsViajes } from '../../hooks/useStatsViajes';
import { rutaViaje } from '../../utils/rutas';
import { situacionViaje, rangoLargo } from '../../utils/viajeFechas';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { DashboardFull } from '../Dashboard/DashboardFull';
import { ViajeCard } from './ViajeCard';
import { avisarError } from '../../utils/avisos';
import { EsqueletoMisViajes } from '../common/Esqueleto';

/** Orden de "Mis viajes": primero los que hay que cerrar, luego en curso, próximos por fecha y sin fecha al final. */
const PESO = { terminado: 0, en_curso: 1, proximo: 2 };
const ordenarActivos = (viajes) => [...viajes].sort((a, b) => {
  const sa = situacionViaje(a);
  const sb = situacionViaje(b);
  const pa = PESO[sa.situacion] ?? 3;
  const pb = PESO[sb.situacion] ?? 3;
  if (pa !== pb) return pa - pb;
  return (sa.inicio?.getTime() ?? Infinity) - (sb.inicio?.getTime() ?? Infinity);
});

const resumenTipos = (viajes) => {
  const tours = viajes.filter((v) => v.tipo === 'tour').length;
  const resorts = viajes.length - tours;
  return `${resorts} resort${resorts !== 1 ? 's' : ''} · ${tours} tour${tours !== 1 ? 's' : ''}`;
};

/** Mis viajes: tarjetas de los viajes activos. */
const MisViajes = ({ onSelectViaje }) => {
  const { state, crearViaje } = useHabitacionesContext();
  const { puede } = useAuthContext();
  const navigate = useNavigate();
  const { viajes, loading } = useStatsViajes();
  const [nuevo, setNuevo] = useState(false);
  const activos = ordenarActivos(viajes.filter((v) => v.estado !== 'cerrado'));

  const alCrear = async (datos) => {
    const creado = await crearViaje(datos);
    if (creado?.id) navigate(rutaViaje(creado));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Mis viajes</h1>
          <p className="subtitulo-pagina">
            {activos.length} viaje{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''} · {resumenTipos(activos)}
          </p>
        </div>
        {puede('crear_viajes') && (
          <button type="button" onClick={() => setNuevo(true)} className="btn btn-primario h-10 px-4 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Nuevo viaje
          </button>
        )}
      </div>

      {loading ? (
        <EsqueletoMisViajes cantidad={Math.max(3, state.viajes.filter((v) => v.estado !== 'cerrado').length)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activos.map((viaje, i) => (
            <ViajeCard key={viaje.id} viaje={viaje} onSelect={onSelectViaje} index={i} />
          ))}
          {activos.length === 0 && (
            <div className="col-span-full tarjeta p-12 text-center">
              <p className="text-slate-900 font-semibold">
                {state.viajes.length ? 'No hay viajes activos.' : 'No hay viajes registrados aún.'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {state.viajes.length ? 'Los viajes cerrados están en Historial.' : 'Crea tu primer viaje para comenzar.'}
              </p>
            </div>
          )}
        </div>
      )}

      <ModalAgregarViaje open={nuevo} onClose={() => setNuevo(false)} onCreate={alCrear} />
    </div>
  );
};

/** Historial: tabla de viajes cerrados (consultar o reabrir). */
const Historial = ({ onSelectViaje }) => {
  const { state, cambiarEstadoViaje } = useHabitacionesContext();
  const { puede } = useAuthContext();
  const cerrados = state.viajes.filter((v) => v.estado === 'cerrado');

  const handleReabrir = async (viaje) => {
    if (!window.confirm(`¿Reabrir "${viaje.nombre}"? Volverá a la lista de viajes activos y se podrá editar.`)) return;
    try {
      await cambiarEstadoViaje(viaje.id, 'activo');
    } catch (error) {
      avisarError(`No se pudo reabrir el viaje: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Historial de viajes</h1>
        <p className="subtitulo-pagina">Viajes cerrados. Puedes consultarlos, pero no editarlos. Usa “Reabrir” si necesitas hacer cambios.</p>
      </div>

      <div className="tarjeta overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {cerrados.length} viaje{cerrados.length !== 1 ? 's' : ''} cerrado{cerrados.length !== 1 ? 's' : ''}
          </h2>
          <span className="text-xs text-slate-500">{resumenTipos(cerrados)}</span>
        </div>

        {cerrados.length === 0 ? (
          <p className="border-t border-slate-100 text-center py-14 px-6 text-sm text-slate-500">
            Aún no hay viajes cerrados. Cierra un viaje desde “Editar viaje” cuando termine.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100 text-left">
                  <th className="pl-5 sm:pl-6 px-4 h-11 font-normal"><span className="tabla-th">Viaje</span></th>
                  <th className="px-4 h-11 font-normal"><span className="tabla-th">Fechas</span></th>
                  <th className="px-4 h-11 font-normal"><span className="tabla-th">Tipo</span></th>
                  <th className="px-4 h-11 font-normal"><span className="tabla-th">Estado</span></th>
                  <th className="px-4 pr-5 sm:pr-6 h-11 font-normal text-right"><span className="tabla-th">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {cerrados.map((v) => {
                  const tour = v.tipo === 'tour';
                  return (
                    <tr key={v.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                      <td className="pl-5 sm:pl-6 px-4 py-3">
                        <span className="flex items-center gap-3">
                          <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${tour ? 'etiqueta-tour' : 'etiqueta-resort'}`}>
                            {tour ? 'T' : 'R'}
                          </span>
                          <span className="font-semibold text-slate-900">{v.nombre}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{rangoLargo(v) || 'Sin fechas'}</td>
                      <td className="px-4 py-3">
                        <span className={`etiqueta-tipo ${tour ? 'etiqueta-tour' : 'etiqueta-resort'}`}>{tour ? 'Tour' : 'Resort'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Cerrado
                        </span>
                      </td>
                      <td className="px-4 pr-5 sm:pr-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => onSelectViaje(v)} className="btn btn-borde btn-sm">Ver</button>
                          {puede('crear_viajes') && (
                            <button type="button" onClick={() => handleReabrir(v)} className="btn btn-borde btn-sm !text-teal-700">
                              <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/** Páginas principales: dashboard, mis viajes e historial. */
const HomeViajes = ({ vista = 'dashboard' }) => {
  const navigate = useNavigate();
  const abrirViaje = (viaje) => navigate(rutaViaje(viaje));

  if (vista === 'viajes') return <MisViajes onSelectViaje={abrirViaje} />;
  if (vista === 'historial') return <Historial onSelectViaje={abrirViaje} />;
  return <DashboardFull onSelectViaje={abrirViaje} />;
};

export default HomeViajes;
