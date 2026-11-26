import { useEffect, useState } from 'react';
import { fetchPenalidades } from '../utils/api';
import { useAlCambiarRemoto } from '../utils/enVivo';

// Aviso local: la pestaña Penalidades lo lanza al guardar/eliminar para que el resumen y la cuenta se actualicen
const oyentes = new Set();
export const avisarPenalidadesCambiadas = () => oyentes.forEach((fn) => fn());

/** Totales de las penalidades. `enCuenta` = lo cobrado a clientes − lo ya pagado al hotel. */
export const resumirPenalidades = (lista = []) => {
  const total = lista.reduce((s, p) => s + p.monto, 0);
  const cobrado = lista.reduce((s, p) => s + p.cobrado, 0);
  const pagadoHotel = lista.filter((p) => p.pagadaHotel).reduce((s, p) => s + p.monto, 0);
  return {
    cantidad: lista.length,
    total,
    cobrado,
    porCobrar: lista.reduce((s, p) => s + Math.max(0, p.monto - p.cobrado), 0),
    pagadoHotel,
    enCuenta: Math.round((cobrado - pagadoHotel) * 100) / 100,
  };
};

/** Penalidades de un viaje (se recargan con cambios propios y de otras personas). */
export const usePenalidades = (viajeId) => {
  const [lista, setLista] = useState(null);
  const [version, setVersion] = useState(0);
  useAlCambiarRemoto(() => setVersion((v) => v + 1));

  useEffect(() => {
    const fn = () => setVersion((v) => v + 1);
    oyentes.add(fn);
    return () => { oyentes.delete(fn); };
  }, []);

  useEffect(() => {
    if (!viajeId) return undefined;
    let cancelado = false;
    fetchPenalidades(viajeId)
      .then((d) => { if (!cancelado) setLista(d.penalidades); })
      .catch(() => { if (!cancelado) setLista([]); });
    return () => { cancelado = true; };
  }, [viajeId, version]);

  return { lista, resumen: resumirPenalidades(lista || []), cargado: lista !== null };
};
