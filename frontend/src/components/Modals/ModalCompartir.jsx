import { useState } from 'react';
import { Share2, Copy, Check, X, Clock, ListFilter } from 'lucide-react';
import { generarLinkCompartir, desactivarLinkCompartir } from '../../utils/api';
import { avisarError, avisarExito } from '../../utils/avisos';

/** Genera, copia o desactiva el enlace público (solo lectura) de un viaje. */
const ModalCompartir = ({ viajeId, viajeNombre, onClose }) => {
  const [linkCompartir, setLinkCompartir] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [duracion, setDuracion] = useState('7d');
  const [tipoCompartir, setTipoCompartir] = useState('completo');
  const [expiracionInfo, setExpiracionInfo] = useState(null);
  const [tipoGenerado, setTipoGenerado] = useState('completo');

  const opcionesTipo = [
    { valor: 'completo', label: 'Viaje completo', descripcion: 'Se ven todas las habitaciones y personas' },
    { valor: 'pendientes', label: 'Solo pendientes', descripcion: 'Solo se ven las personas que aún deben dinero' },
  ];

  const opcionesDuracion = [
    { valor: '1h', label: '1 hora', descripcion: 'El enlace expirará en 1 hora' },
    { valor: '7h', label: '7 horas', descripcion: 'El enlace expirará en 7 horas' },
    { valor: '24h', label: '24 horas', descripcion: 'El enlace expirará en 24 horas' },
    { valor: '7d', label: '7 días', descripcion: 'El enlace expirará en 7 días' },
    { valor: 'never', label: 'Sin expiración', descripcion: 'El enlace no expirará' },
  ];

  const handleGenerarLink = async () => {
    if (!viajeId) {
      avisarError('Primero selecciona un viaje');
      return;
    }
    setGenerando(true);
    try {
      const res = await generarLinkCompartir(viajeId, duracion, tipoCompartir);
      setLinkCompartir(res.linkCompartir);
      setTipoGenerado(res.tipo || tipoCompartir);
      setExpiracionInfo({
        texto: res.expiracionTexto,
        fecha: res.expiraCompartir
      });
    } catch (error) {
      console.error('Error:', error);
      avisarError('Error al generar el enlace');
    } finally {
      setGenerando(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkCompartir);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleDesactivarLink = async () => {
    if (!viajeId) return;
    try {
      await desactivarLinkCompartir(viajeId);
      setLinkCompartir('');
      setExpiracionInfo(null);
      avisarExito('Enlace desactivado');
    } catch {
      avisarError('Error al desactivar el enlace');
    }
  };

  // El estado se reinicia solo: el modal se desmonta al cerrarse
  const handleCerrarCompartir = onClose;

  return (
    <div
      className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
      onClick={handleCerrarCompartir}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              Compartir viaje
            </h3>
            <button
              onClick={handleCerrarCompartir}
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Comparte este enlace con consultores para que vean el estado del viaje{' '}
            <strong className="text-slate-800">{viajeNombre}</strong> (solo lectura)
          </p>

          {!linkCompartir ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-500 mb-2">
                  <ListFilter className="h-4 w-4 inline mr-1" />
                  Qué se comparte
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {opcionesTipo.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setTipoCompartir(op.valor)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        tipoCompartir === op.valor
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {opcionesTipo.find(o => o.valor === tipoCompartir)?.descripcion}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-500 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Tiempo de vigencia del enlace
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {opcionesDuracion.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setDuracion(op.valor)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        duracion === op.valor
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {opcionesDuracion.find(o => o.valor === duracion)?.descripcion}
                </p>
              </div>

              <button
                onClick={handleGenerarLink}
                disabled={generando}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {generando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-transparent" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Generar enlace de compartir
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500">Enlace generado:</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    tipoGenerado === 'pendientes'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                  }`}>
                    {tipoGenerado === 'pendientes' ? 'Solo pendientes' : 'Viaje completo'}
                  </span>
                </div>
                <p className="text-sm font-mono break-all text-slate-800">{linkCompartir}</p>
                {expiracionInfo && (
                  <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Válido hasta: {expiracionInfo.texto}
                  </p>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleCopiarLink}
                  className="flex-1 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors"
                >
                  {copiado ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                  {copiado ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>

              <button
                onClick={handleDesactivarLink}
                className="w-full border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm hover:bg-red-50 transition-colors"
              >
                Desactivar enlace
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCompartir;
