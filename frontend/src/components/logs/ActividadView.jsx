import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Undo2, Search, CheckCircle2 } from 'lucide-react';
import { fetchLogs, deshacerAccion } from '../../utils/api';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import Paginacion from '../common/Paginacion';

const POR_PAGINA = 10;

const TIPOS = [
  { valor: 'usuarios', label: 'Acciones' },
  { valor: 'pagos', label: 'Pagos' },
  { valor: 'cambios', label: 'Cambios' },
  { valor: 'accesos', label: 'Accesos' },
  { valor: 'sistema', label: 'Sistema' },
  { valor: '', label: 'Todo' },
];

const ACCION = {
  crear:         { label: 'Creó',           bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  editar:        { label: 'Editó',          bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  eliminar:      { label: 'Eliminó',        bg: 'rgba(244,63,94,0.12)',  text: '#fb7185' },
  pago:          { label: 'Pago',           bg: 'rgba(13,148,136,0.14)', text: '#5eead4' },
  mover:         { label: 'Movió',          bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  deshacer:      { label: 'Deshizo',        bg: 'rgba(234,179,8,0.12)',  text: '#facc15' },
  login:         { label: 'Inicio sesión',  bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  login_fallido: { label: 'Acceso fallido', bg: 'rgba(248,113,113,0.14)', text: '#fca5a5' },
  error:         { label: 'Error',          bg: 'rgba(248,113,113,0.16)', text: '#f87171' },
  info:          { label: 'Sistema',        bg: 'rgba(125,211,252,0.12)', text: '#7dd3fc' },
};

const fechaCompleta = (fecha) =>
  new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fecha));

const fechaRelativa = (fecha) => {
  const seg = Math.round((Date.now() - new Date(fecha).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 7 * 86400) return `hace ${Math.floor(seg / 86400)} d`;
  return fechaCompleta(fecha);
};

const ActividadView = () => {
  const navigate = useNavigate();
  const { recargarViajes } = useHabitacionesContext();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [usuarios, setUsuarios] = useState([]);
  const [tipo, setTipo] = useState('usuarios');
  const [usuario, setUsuario] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [deshaciendo, setDeshaciendo] = useState(null);

  // Solo se aplica la respuesta de la consulta más reciente (si cambian los filtros rápido)
  const ultimaConsulta = useRef(0);

  const cargar = useCallback(async (numPagina = 1) => {
    const consulta = ++ultimaConsulta.current;
    setLoading(true);
    try {
      const filtros = { tipo, usuario, q: busqueda.trim(), limit: POR_PAGINA };
      let data = await fetchLogs({ ...filtros, offset: (numPagina - 1) * POR_PAGINA });
      // Si la página quedó fuera de rango (p. ej. tras limpiar registros), ir a la última que existe
      const ultimaPagina = Math.max(1, Math.ceil(data.total / POR_PAGINA));
      if (numPagina > ultimaPagina) {
        numPagina = ultimaPagina;
        data = await fetchLogs({ ...filtros, offset: (numPagina - 1) * POR_PAGINA });
      }
      if (consulta !== ultimaConsulta.current) return;
      setLogs(data.logs);
      setPagina(numPagina);
      setTotal(data.total);
      setUsuarios(data.usuarios);
    } catch (error) {
      console.error('Error cargando el registro de actividad:', error);
    } finally {
      if (consulta === ultimaConsulta.current) setLoading(false);
    }
  }, [tipo, usuario, busqueda]);

  // Al cambiar filtros se vuelve a la página 1; la búsqueda espera un poco para no consultar en cada tecla
  const busquedaRef = useRef(busqueda);
  useEffect(() => {
    const espera = busquedaRef.current !== busqueda ? 300 : 0;
    busquedaRef.current = busqueda;
    const t = setTimeout(() => cargar(1), espera);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  const irAPagina = (numPagina) => {
    cargar(numPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeshacer = async (log) => {
    if (!window.confirm(`¿Deshacer esta acción?\n\n${log.descripcion}`)) return;
    setDeshaciendo(log.id);
    try {
      await deshacerAccion(log.id);
      await Promise.all([cargar(pagina), recargarViajes()]);
    } catch (error) {
      alert(`No se pudo deshacer: ${error.message}`);
    } finally {
      setDeshaciendo(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="orb w-[500px] h-[500px]"
          style={{ top: '-150px', right: '-100px', background: '#0d9488', opacity: 0.04 }} />
        <div className="orb-reverse w-[400px] h-[400px]"
          style={{ bottom: '-100px', left: '-100px', background: '#8b5cf6', opacity: 0.04 }} />
        <div className="bg-dot-grid absolute inset-0" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
              <History className="h-5 w-5" />
              Registro de Actividad
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">Quién hizo qué y cuándo. Los pagos y cambios se pueden deshacer.</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-2 flex-wrap">
            {TIPOS.map((t) => (
              <button key={t.valor || 'todo'} type="button" onClick={() => setTipo(t.valor)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  tipo === t.valor
                    ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
                    : 'bg-white/5 text-gray-400 border-white/[0.07] hover:bg-white/10'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar persona, habitación, viaje..."
                className="input-dark text-sm"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <select value={usuario} onChange={(e) => setUsuario(e.target.value)}
              className="input-dark text-sm shrink-0" style={{ width: 'auto' }}>
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {logs.length === 0 && !loading && (
            <p className="text-center py-12 text-gray-600 text-sm">No hay actividad con estos filtros.</p>
          )}

          {logs.map((log) => {
            const a = ACCION[log.accion] || { label: log.accion, bg: 'rgba(255,255,255,0.06)', text: '#9ca3af' };
            const deshecho = !!log.deshechoAt;
            return (
              <div key={log.id}
                className={`flex items-start gap-3 px-4 sm:px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 ${deshecho ? 'opacity-55' : ''}`}>
                <span className="shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                  style={{ background: a.bg, color: a.text }}>
                  {a.label}
                </span>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-gray-200 break-words ${deshecho ? 'line-through decoration-gray-600' : ''}`}>
                    {log.descripcion}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-2">
                    <span className="font-medium text-gray-400">{log.usuario}</span>
                    <span title={fechaCompleta(log.fecha)}>{fechaRelativa(log.fecha)}</span>
                    {deshecho && (
                      <span className="text-yellow-500/80 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Deshecho por {log.deshechoPor} · {fechaRelativa(log.deshechoAt)}
                      </span>
                    )}
                  </p>
                </div>

                {log.puedeDeshacer && (
                  <button type="button" onClick={() => handleDeshacer(log)} disabled={deshaciendo === log.id}
                    title="Revertir esta acción"
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-yellow-300/90 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors disabled:opacity-50">
                    <Undo2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{deshaciendo === log.id ? 'Deshaciendo...' : 'Deshacer'}</span>
                  </button>
                )}
              </div>
            );
          })}

          {loading && <p className="text-center py-6 text-gray-600 text-sm">Cargando...</p>}
        </div>

        <Paginacion
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          onCambiar={irAPagina}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default ActividadView;
