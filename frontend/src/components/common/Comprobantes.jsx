import { useEffect, useRef, useState } from 'react';
import { Paperclip, FileText, Trash2, X, Loader2, Upload, Download } from 'lucide-react';
import { fetchComprobantes, eliminarComprobante, descargarComprobante, subirComprobante } from '../../utils/api';
import { prepararComprobante, ACEPTA, pesoLegible } from '../../utils/comprobantes';
import { avisarError, avisarExito } from '../../utils/avisos';
import Portal from './Portal';

/** Visor a pantalla completa de una foto. */
const Visor = ({ url, nombre, onClose }) => {
  useEffect(() => {
    const alTecla = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [onClose]);
  return (
    <Portal>
      <div className="fixed inset-0 z-[85] bg-slate-950/85 backdrop-blur-sm flex flex-col animate-fade-in" onClick={onClose}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-medium truncate">{nombre}</p>
          <div className="flex gap-1 shrink-0">
            <a href={url} download={nombre} className="p-2 rounded-lg hover:bg-white/10" title="Descargar" aria-label="Descargar"><Download className="h-5 w-5" /></a>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          <img src={url} alt={nombre} className="max-h-full max-w-full rounded-lg shadow-2xl animate-fade-in-scale" onClick={(e) => e.stopPropagation()} />
        </div>
      </div>
    </Portal>
  );
};

/** Miniatura de un comprobante guardado (las fotos se cargan con la sesión del usuario). */
const Miniatura = ({ comp, url, onAbrir, onEliminar, editable, borrando }) => {
  const [confirmar, setConfirmar] = useState(false);
  const esPdf = comp.mime === 'application/pdf';
  return (
    <div className="group relative w-24 shrink-0">
      <button type="button" onClick={onAbrir} title={comp.nombre}
        className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center hover:border-teal-500 hover:ring-2 hover:ring-teal-600/15 transition-all">
        {esPdf ? (
          <span className="flex flex-col items-center gap-1 text-red-700">
            <FileText className="h-8 w-8" />
            <span className="text-[10px] font-bold">PDF</span>
          </span>
        ) : url ? (
          <img src={url} alt={comp.nombre} className="w-full h-full object-cover aparecer" />
        ) : (
          <span className="esqueleto w-full h-full !rounded-none" />
        )}
      </button>
      <p className="mt-1 text-[10px] text-slate-500 truncate" title={comp.nombre}>{comp.nombre}</p>
      {editable && (
        confirmar ? (
          <div className="absolute inset-x-0 top-0 h-24 rounded-xl bg-white/95 border border-red-200 flex flex-col items-center justify-center gap-1.5 p-1.5 aparecer">
            <p className="text-[11px] font-semibold text-red-800">¿Eliminar?</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setConfirmar(false)} className="px-2 py-0.5 rounded-md text-[11px] border border-slate-200 bg-white">No</button>
              <button type="button" onClick={onEliminar} disabled={borrando} className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-white bg-red-600">
                {borrando ? '…' : 'Sí'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmar(true)} aria-label={`Eliminar ${comp.nombre}`}
            className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
            <Trash2 className="h-3 w-3" />
          </button>
        )
      )}
    </div>
  );
};

/**
 * Comprobantes (vouchers) de un pago o una transferencia.
 * - Con `entidadId`: muestra los guardados y sube al momento.
 * - Sin `entidadId` (aún no se ha creado): guarda los archivos en `pendientes` y el padre los sube al guardar.
 */
const Comprobantes = ({ entidad, entidadId, editable = true, pendientes = [], onPendientes, onCambio, titulo = 'Comprobantes' }) => {
  const [lista, setLista] = useState([]);
  const [urls, setUrls] = useState({});
  const [cargando, setCargando] = useState(!!entidadId);
  const [subiendo, setSubiendo] = useState(0);
  const [borrandoId, setBorrandoId] = useState(null);
  const [visor, setVisor] = useState(null);
  const [encima, setEncima] = useState(false);
  const input = useRef(null);
  const urlsRef = useRef({});

  // Guardados: lista y miniaturas de las fotos
  useEffect(() => {
    if (!entidadId) return undefined;
    let cancelado = false;
    fetchComprobantes(entidad, entidadId)
      .then(async (comps) => {
        if (cancelado) return;
        setLista(comps);
        for (const c of comps.filter((x) => x.mime.startsWith('image/'))) {
          const blob = await descargarComprobante(c.id).catch(() => null);
          if (cancelado || !blob) continue;
          urlsRef.current[c.id] = URL.createObjectURL(blob);
          setUrls({ ...urlsRef.current });
        }
      })
      .catch((e) => avisarError(`No se pudieron cargar los comprobantes: ${e.message}`))
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [entidad, entidadId]);

  // Liberar las URLs locales al cerrar
  useEffect(() => () => Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u)), []);

  const agregar = async (archivos) => {
    const lista2 = [...archivos];
    if (!lista2.length) return;
    setSubiendo((n) => n + lista2.length);
    for (const archivo of lista2) {
      try {
        const preparado = await prepararComprobante(archivo);
        if (!entidadId) {
          onPendientes?.((prev) => [...prev, { ...preparado, clave: `${Date.now()}-${Math.random()}` }]);
        } else {
          const guardado = await subirComprobante({ entidad, entidadId, nombre: preparado.nombre, mime: preparado.mime, datos: preparado.datos });
          if (preparado.vista) { urlsRef.current[guardado.id] = preparado.vista; setUrls({ ...urlsRef.current }); }
          setLista((l) => {
            const nueva = [...l, guardado];
            onCambio?.(nueva.length);
            return nueva;
          });
          avisarExito('Comprobante adjuntado');
        }
      } catch (e) {
        avisarError(e.message);
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  };

  const abrir = async (comp) => {
    try {
      if (comp.mime.startsWith('image/')) {
        let url = urls[comp.id];
        if (!url) {
          url = URL.createObjectURL(await descargarComprobante(comp.id));
          urlsRef.current[comp.id] = url;
          setUrls({ ...urlsRef.current });
        }
        setVisor({ url, nombre: comp.nombre });
      } else {
        const url = URL.createObjectURL(await descargarComprobante(comp.id));
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      avisarError(e.message);
    }
  };

  const eliminar = async (comp) => {
    setBorrandoId(comp.id);
    try {
      await eliminarComprobante(comp.id);
      setLista((l) => {
        const nueva = l.filter((x) => x.id !== comp.id);
        onCambio?.(nueva.length);
        return nueva;
      });
      avisarExito('Comprobante eliminado');
    } catch (e) {
      avisarError(e.message);
    } finally {
      setBorrandoId(null);
    }
  };

  const quitarPendiente = (clave) => onPendientes?.((prev) => {
    const p = prev.find((x) => x.clave === clave);
    if (p?.vista) URL.revokeObjectURL(p.vista);
    return prev.filter((x) => x.clave !== clave);
  });

  const total = lista.length + pendientes.length;
  const vacio = !cargando && total === 0 && !subiendo;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="modal-section-label !mb-0 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-slate-500" /> {titulo}
          {total > 0 && <span className="text-xs font-normal text-slate-500">({total})</span>}
        </span>
        {editable && !vacio && (
          <button type="button" onClick={() => input.current?.click()} className="btn btn-borde btn-sm">
            <Upload className="h-3.5 w-3.5" /> Agregar
          </button>
        )}
      </div>

      <input ref={input} type="file" accept={ACEPTA} multiple hidden
        onChange={(e) => { agregar(e.target.files); e.target.value = ''; }} />

      {vacio ? (
        editable ? (
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
            onDragLeave={() => setEncima(false)}
            onDrop={(e) => { e.preventDefault(); setEncima(false); agregar(e.dataTransfer.files); }}
            className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
              encima ? 'border-teal-600 bg-teal-50/60' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}>
            <Upload className="h-5 w-5 mx-auto text-slate-400" />
            <p className="text-sm font-medium text-slate-700 mt-1.5">Adjuntar foto o PDF del voucher</p>
            <p className="text-xs text-slate-500 mt-0.5">Toca para elegir o tomar una foto, o arrastra el archivo aquí · máx. 5 MB</p>
          </button>
        ) : (
          <p className="text-sm text-slate-400 italic">Sin comprobantes</p>
        )
      ) : (
        <div
          onDragOver={editable ? (e) => { e.preventDefault(); setEncima(true); } : undefined}
          onDragLeave={editable ? () => setEncima(false) : undefined}
          onDrop={editable ? (e) => { e.preventDefault(); setEncima(false); agregar(e.dataTransfer.files); } : undefined}
          className={`flex flex-wrap gap-3 rounded-xl p-1 -m-1 transition-colors ${encima ? 'bg-teal-50 ring-2 ring-teal-600/20' : ''}`}>
          {cargando && [0, 1].map((i) => <span key={i} className="esqueleto w-24 h-24 !rounded-xl" />)}
          {lista.map((c) => (
            <Miniatura key={c.id} comp={c} url={urls[c.id]} editable={editable}
              borrando={borrandoId === c.id} onAbrir={() => abrir(c)} onEliminar={() => eliminar(c)} />
          ))}
          {pendientes.map((p) => (
            <div key={p.clave} className="group relative w-24 shrink-0 aparecer">
              <div className="w-24 h-24 rounded-xl border border-dashed border-teal-400 bg-teal-50/40 overflow-hidden flex items-center justify-center">
                {p.vista ? <img src={p.vista} alt={p.nombre} className="w-full h-full object-cover" /> : <FileText className="h-8 w-8 text-red-700" />}
              </div>
              <p className="mt-1 text-[10px] text-slate-500 truncate" title={p.nombre}>{pesoLegible(p.tamano)} · se sube al guardar</p>
              <button type="button" onClick={() => quitarPendiente(p.clave)} aria-label={`Quitar ${p.nombre}`}
                className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-700">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {subiendo > 0 && (
            <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[10px]">{entidadId ? 'Subiendo…' : 'Preparando…'}</span>
            </div>
          )}
        </div>
      )}

      {visor && <Visor url={visor.url} nombre={visor.nombre} onClose={() => setVisor(null)} />}
    </div>
  );
};

export default Comprobantes;
