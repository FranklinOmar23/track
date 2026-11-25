import { useEffect, useState } from 'react';
import { X, UsersRound, Star } from 'lucide-react';
import Portal from '../common/Portal';
import { importarClientes } from '../../utils/api';
import { avisarExito } from '../../utils/avisos';
import { EsqueletoLista } from '../common/Esqueleto';

const n = (v) => new Intl.NumberFormat('es-DO').format(v);

const Cifra = ({ valor, texto }) => (
  <div className="rounded-xl border border-slate-200 px-4 py-3">
    <p className="text-2xl font-bold text-slate-900 tabular-nums">{n(valor)}</p>
    <p className="text-xs text-slate-500 mt-0.5">{texto}</p>
  </div>
);

/** Crea de una vez los clientes de todos los viajes: primero muestra qué haría y luego lo aplica. */
const ModalImportarClientes = ({ onClose, onListo }) => {
  const [vista, setVista] = useState(null);
  const [estado, setEstado] = useState({ guardando: false, error: '' });

  useEffect(() => {
    let vigente = true;
    importarClientes(true)
      .then((r) => vigente && setVista(r))
      .catch((e) => vigente && setEstado({ guardando: false, error: e.message }));
    return () => { vigente = false; };
  }, []);

  const aplicar = async () => {
    setEstado({ guardando: true, error: '' });
    try {
      const r = await importarClientes(false);
      avisarExito(`${n(r.clientesNuevos)} cliente${r.clientesNuevos !== 1 ? 's' : ''} creado${r.clientesNuevos !== 1 ? 's' : ''}`);
      onListo();
    } catch (e) {
      setEstado({ guardando: false, error: e.message });
    }
  };

  const nada = vista && vista.personas === 0;
  const om = vista?.omitidas;

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <div className="modal-card-dark w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900">Crear clientes desde los viajes</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Toma a los adultos con nombre y apellido que aún no tienen ficha. El mismo nombre en varios viajes queda como un solo cliente.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!vista && !estado.error && <div className="rounded-xl border border-slate-200 overflow-hidden"><EsqueletoLista filas={4} /></div>}
              {nada && (
                <div className="text-center py-10">
                  <UsersRound className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-500 mt-2">Todos los adultos con nombre y apellido ya tienen su ficha.</p>
                </div>
              )}
              {vista && !nada && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Cifra valor={vista.clientesNuevos} texto="clientes nuevos" />
                    <Cifra valor={vista.personas} texto="personas en los viajes que se enlazan" />
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {vista.variosViajes > 0 && <li>· {n(vista.variosViajes)} aparecen en más de un viaje y quedan juntos en una ficha.</li>}
                    {vista.enlazadosAExistentes > 0 && <li>· {n(vista.enlazadosAExistentes)} ya tenían ficha con ese nombre: solo se les enlazan los viajes.</li>}
                    {om.ninos > 0 && <li>· Se omiten {n(om.ninos)} niños.</li>}
                    {om.sinApellido > 0 && <li>· Se omiten {n(om.sinApellido)} sin apellido o con nombre de relleno (por ejemplo “Juan” o “Acompañante”).</li>}
                    {om.repetidosEnClientes > 0 && <li>· Se omiten {n(om.repetidosEnClientes)} cuyo nombre coincide con varios clientes a la vez.</li>}
                  </ul>
                  {vista.ejemplos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Por ejemplo</p>
                      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                        {vista.ejemplos.map((e) => (
                          <div key={e.nombre} className="flex items-center gap-2 px-4 py-2 text-sm">
                            <span className="flex-1 min-w-0 truncate font-medium text-slate-800">{e.nombre}</span>
                            {e.existente && <Star className="h-3.5 w-3.5 text-teal-600 shrink-0" aria-label="Ya tenía ficha" />}
                            <span className="text-xs text-slate-500 shrink-0">{e.viajes} viaje{e.viajes !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Si dos personas distintas se llaman exactamente igual quedarán en la misma ficha; puedes separarlas después desde su ficha. También puedes deshacerlo todo desde Actividad.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-red-700 min-w-0" role="alert">{estado.error}</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={estado.guardando}>Cancelar</button>
                <button type="button" className="btn-modal-primary" onClick={aplicar} disabled={estado.guardando || !vista || nada}>
                  <UsersRound className="h-4 w-4" />
                  {estado.guardando ? 'Creando…' : vista && !nada ? `Crear ${n(vista.clientesNuevos)} clientes` : 'Crear clientes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ModalImportarClientes;
