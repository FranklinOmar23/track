import { useCallback, useRef, useState } from 'react';
import GenerandoExcel from '../components/common/GenerandoExcel';

const MINIMO_GENERANDO_MS = 900;   // que la animación se alcance a ver aunque el Excel salga al instante
const CIERRE_LISTO_MS = 1600;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Muestra la animación de "Generando Excel" alrededor de cualquier exportación.
 * Uso: const { generar, pantalla } = useGeneracionExcel();
 *      generar(() => exportarExcelRapido(habs, viaje), { titulo: 'Excel rápido', archivo: 'Viaje - Excel rápido.xlsx' })
 *      …y renderizar {pantalla}
 */
export const useGeneracionExcel = () => {
  const [estado, setEstado] = useState({ fase: null });
  const temporizador = useRef(null);

  const cerrar = useCallback(() => {
    clearTimeout(temporizador.current);
    setEstado({ fase: null });
  }, []);

  const generar = useCallback(async (exportar, { titulo = 'Excel', archivo = '' } = {}) => {
    clearTimeout(temporizador.current);
    setEstado({ fase: 'generando', titulo, archivo });
    try {
      await Promise.all([exportar(), esperar(MINIMO_GENERANDO_MS)]);
      setEstado({ fase: 'listo', titulo, archivo });
      temporizador.current = setTimeout(() => setEstado({ fase: null }), CIERRE_LISTO_MS);
    } catch (error) {
      console.error('Error generando Excel:', error);
      setEstado({ fase: 'error', titulo, archivo, error: error.message });
    }
  }, []);

  const pantalla = <GenerandoExcel {...estado} onCerrar={cerrar} />;
  return { generar, generando: estado.fase === 'generando', pantalla };
};
