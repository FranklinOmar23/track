import React, { useState } from 'react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { Search, Plus, Share2, Copy, Check, X, Clock } from 'lucide-react';
import { generarLinkCompartir, desactivarLinkCompartir } from '../../utils/api';

const Toolbar = ({ onOpenAgregar, onOpenDesglose }) => {
  const { state, setFiltros, crearViaje, seleccionarViaje } = useHabitacionesContext();
  const { busqueda, estado } = state.filtros;
  const [isAgregarViajeOpen, setIsAgregarViajeOpen] = useState(false);
  const [isCompartirOpen, setIsCompartirOpen] = useState(false);
  const [linkCompartir, setLinkCompartir] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [duracion, setDuracion] = useState('7d');
  const [expiracionInfo, setExpiracionInfo] = useState(null);

  const handleSearchChange = (e) => {
    setFiltros({ ...state.filtros, busqueda: e.target.value });
  };

  const handleEstadoChange = (e) => {
    setFiltros({ ...state.filtros, estado: e.target.value });
  };

  const viajes = state?.viajes || [];
  const selectedViajeId = state?.selectedViajeId ?? '';
  const viajeActual = viajes.find(v => v.id === selectedViajeId);

  const opcionesDuracion = [
    { valor: '1h', label: '1 hora', descripcion: 'El enlace expirará en 1 hora' },
    { valor: '7h', label: '7 horas', descripcion: 'El enlace expirará en 7 horas' },
    { valor: '24h', label: '24 horas', descripcion: 'El enlace expirará en 24 horas' },
    { valor: '7d', label: '7 días', descripcion: 'El enlace expirará en 7 días' },
    { valor: 'never', label: 'Sin expiración', descripcion: 'El enlace no expirará' },
  ];

  const handleGenerarLink = async () => {
    if (!selectedViajeId) {
      alert('Primero selecciona un viaje');
      return;
    }
    setGenerando(true);
    try {
      const res = await generarLinkCompartir(selectedViajeId, duracion);
      setLinkCompartir(res.linkCompartir);
      setExpiracionInfo({
        texto: res.expiracionTexto,
        fecha: res.expiraCompartir
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el enlace');
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
    if (!selectedViajeId) return;
    try {
      await desactivarLinkCompartir(selectedViajeId);
      setLinkCompartir('');
      setExpiracionInfo(null);
      alert('Enlace desactivado correctamente');
    } catch (error) {
      alert('Error al desactivar el enlace');
    }
  };

  const handleCerrarCompartir = () => {
    setIsCompartirOpen(false);
    setLinkCompartir('');
    setExpiracionInfo(null);
    setCopiado(false);
    setDuracion('7d');
  };

  return (
    <div className="flex flex-col gap-2 mb-6">
      {/* Fila 1: Selector de viaje + botones */}
      <div className="flex gap-2">
        <select
          value={selectedViajeId || ''}
          onChange={(e) => {
            const id = e.target.value === '' ? null : e.target.value;
            seleccionarViaje(id);
          }}
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm"
        >
          <option value="">Seleccionar viaje</option>
          {viajes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={() => setIsAgregarViajeOpen(true)}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:bg-gray-50 whitespace-nowrap"
        >
          + Viaje
        </button>

        {/* Botón COMPARTIR */}
        <button
          onClick={() => setIsCompartirOpen(true)}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm flex items-center gap-1 whitespace-nowrap ${
            selectedViajeId
              ? 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
          }`}
          disabled={!selectedViajeId}
          title={!selectedViajeId ? 'Selecciona un viaje primero' : 'Compartir viaje'}
        >
          <Share2 className="h-4 w-4" />
          Compartir
        </button>
      </div>

      {/* Fila 2: Búsqueda + filtro de estado */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={handleSearchChange}
            placeholder="Buscar habitación o persona..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
          />
        </div>

        <select
          value={estado}
          onChange={handleEstadoChange}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Con saldo pendiente</option>
          <option value="completo">Pagados al 100%</option>
        </select>
      </div>

      {/* Fila 3: Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={onOpenAgregar}
          className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Agregar habitación
        </button>

        <button
          onClick={onOpenDesglose}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 text-center"
        >
          Desglose general
        </button>
      </div>

      {/* Modal de compartir */}
      {isCompartirOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleCerrarCompartir}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Compartir viaje
                </h3>
                <button
                  onClick={handleCerrarCompartir}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Comparte este enlace con consultores para que vean el estado del viaje <strong>{viajeActual?.nombre}</strong> (solo lectura)
              </p>

              {!linkCompartir ? (
                <>
                  {/* Selector de duración */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {opcionesDuracion.find(o => o.valor === duracion)?.descripcion}
                    </p>
                  </div>

                  <button
                    onClick={handleGenerarLink}
                    disabled={generando}
                    className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {generando ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Enlace generado:</p>
                    <p className="text-sm font-mono break-all">{linkCompartir}</p>
                    {expiracionInfo && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Válido hasta: {expiracionInfo.texto}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={handleCopiarLink}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-1 hover:bg-gray-50"
                    >
                      {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {copiado ? 'Copiado' : 'Copiar enlace'}
                    </button>
                  </div>
                  
                  <button
                    onClick={handleDesactivarLink}
                    className="w-full border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50"
                  >
                    Desactivar enlace
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isAgregarViajeOpen && (
        <ModalAgregarViaje
          open={isAgregarViajeOpen}
          onClose={() => setIsAgregarViajeOpen(false)}
          onCreate={(viaje) => {
            crearViaje(viaje);
            setIsAgregarViajeOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Toolbar;