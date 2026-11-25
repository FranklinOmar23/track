import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { escucharConfirmaciones } from '../../utils/confirmar';
import Portal from './Portal';

const TONOS = {
  normal: { icono: HelpCircle, fondo: 'bg-teal-50', color: 'text-teal-700', boton: 'btn-modal-primary' },
  aviso: { icono: AlertTriangle, fondo: 'bg-amber-50', color: 'text-amber-700', boton: 'btn-modal-primary' },
  peligro: { icono: Trash2, fondo: 'bg-red-50', color: 'text-red-700', boton: 'btn-modal-primary !bg-red-600 !border-red-600 hover:!bg-red-700' },
};

/** Cuadro de confirmación "Sí / No" para toda la app (ver utils/confirmar.js). */
const DialogoConfirmacion = () => {
  const [cola, setCola] = useState([]);
  const botonSi = useRef(null);
  const actual = cola[0];

  useEffect(() => escucharConfirmaciones((pedido) => setCola((c) => [...c, pedido])), []);

  const responder = (valor) => {
    actual?.resolve(valor);
    setCola((c) => c.slice(1));
  };

  // Enfoca "Sí", Escape = No, Enter = Sí
  useEffect(() => {
    if (!actual) return undefined;
    botonSi.current?.focus();
    const alTecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); responder(false); } };
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual]);

  if (!actual) return null;
  const tono = TONOS[actual.tono] || TONOS.normal;
  const Icono = tono.icono;

  return (
    <Portal>
      <div className="modal-overlay-dark" style={{ zIndex: 95 }} onClick={() => responder(false)}>
        <div className="modal-card-dark w-full max-w-sm" role="alertdialog" aria-modal="true" aria-labelledby="dialogo-titulo"
          aria-describedby="dialogo-mensaje" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 text-center">
            <span className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center animate-pop-in ${tono.fondo}`}>
              <Icono className={`h-6 w-6 ${tono.color}`} />
            </span>
            <h3 id="dialogo-titulo" className="mt-4 text-lg font-bold text-slate-900">{actual.titulo}</h3>
            {actual.mensaje && <p id="dialogo-mensaje" className="mt-2 text-sm text-slate-600 leading-relaxed">{actual.mensaje}</p>}
            {actual.detalle && (
              <p className="mt-3 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-left break-words">{actual.detalle}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 px-6 pb-6">
            <button type="button" className="btn-modal-secondary" onClick={() => responder(false)}>
              {actual.textoCancelar || 'No'}
            </button>
            <button ref={botonSi} type="button" className={tono.boton} onClick={() => responder(true)}>
              {actual.textoConfirmar || 'Sí'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DialogoConfirmacion;
