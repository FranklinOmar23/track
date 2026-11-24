import { useCallback, useEffect, useRef, useState } from 'react';
import { Undo2, Search, CheckCircle2 } from 'lucide-react';
import { fetchLogs, deshacerAccion } from '../../utils/api';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import Paginacion from '../common/Paginacion';
import { avisarError } from '../../utils/avisos';
import { EsqueletoLista } from '../common/Esqueleto';

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
  crear:         { label: 'Creó',           codigo: 'NEW', bg: '#e7f6ef', text: '#047857' },
  editar:        { label: 'Editó',          codigo: 'ED',  bg: '#e8f0fe', text: '#1d4ed8' },
  eliminar:      { label: 'Eliminó',        codigo: 'DEL', bg: '#fdecec', text: '#b91c1c' },
  pago:          { label: 'Pago',           codigo: '$',   bg: '#e6f4f1', text: '#0f766e' },
  mover:         { label: 'Movió',          codigo: 'MV',  bg: '#f1edfd', text: '#6d28d9' },
  deshacer:      { label: 'Deshizo',        codigo: 'UN',  bg: '#fdf3d7', text: '#92400e' },
  login:         { label: 'Inicio de sesión', codigo: 'IN', bg: '#f1f5f9', text: '#334155' },
  login_fallido: { label: 'Acceso fallido', codigo: '!',   bg: '#fdecec', text: '#b91c1c' },
  error:         { label: 'Error',          codigo: 'ERR', bg: '#fdecec', text: '#b91c1c' },
  info:          { label: 'Sistema',        codigo: 'SYS', bg: '#eef6fb', text: '#0369a1' },
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
      avisarError(`No se pudo deshacer: ${error.message}`);
    } finally {
      setDeshaciendo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Registro de actividad</h1>
        <p className="subtitulo-pagina">Quién hizo qué y cuándo. Los pagos y cambios se pueden deshacer.</p>
      </div>

      <div className="tarjeta overflow-hidden">
        {/* Filtros */}
        <div className="flex flex-col xl:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="segmentado overflow-x-auto shrink-0" role="tablist" aria-label="Tipo de actividad">
            {TIPOS.map((t) => (
              <button key={t.valor || 'todo'} type="button" role="tab" aria-selected={tipo === t.valor}
                onClick={() => setTipo(t.valor)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar persona, habitación, viaje..."
                aria-label="Buscar en la actividad"
                className="campo-buscar"
              />
            </div>
            <select value={usuario} onChange={(e) => setUsuario(e.target.value)} aria-label="Filtrar por usuario"
              className="input-dark !h-10 !py-0 !text-sm sm:!w-48 shrink-0">
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Lista */}
        {logs.length === 0 && !loading && (
          <p className="text-center py-14 text-slate-500 text-sm">No hay actividad con estos filtros.</p>
        )}

        {loading && <EsqueletoLista filas={Math.max(4, Math.min(logs.length || POR_PAGINA, POR_PAGINA))} />}

        {!loading && logs.map((log) => {
          const a = ACCION[log.accion] || { label: log.accion, bg: '#f1f5f9', text: '#334155', codigo: '•' };
          const codigo = log.accion === 'pago' ? (log.descripcion.match(/([A-Z]{2,3})\$/)?.[1] || '$') : a.codigo;
          const deshecho = !!log.deshechoAt;
          return (
            <div key={log.id}
              className={`flex items-start gap-3.5 px-4 sm:px-5 py-3.5 border-b border-slate-100 ${deshecho ? 'opacity-55' : ''}`}>
              <span className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-bold"
                style={{ background: a.bg, color: a.text }}>
                {codigo}
              </span>

              <div className="flex-1 min-w-0">
                <p className={`text-sm text-slate-900 break-words ${deshecho ? 'line-through decoration-slate-400' : ''}`}>
                  <span className="inline-block mr-2 px-2 py-px rounded-full text-[11px] font-semibold align-[1px]"
                    style={{ background: a.bg, color: a.text }}>
                    {a.label}
                  </span>
                  {log.descripcion}
                </p>
                <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-1.5">
                  <span>{log.usuario}</span>
                  <span>·</span>
                  <span title={fechaCompleta(log.fecha)}>{fechaRelativa(log.fecha)}</span>
                  {deshecho && (
                    <span className="text-amber-700 flex items-center gap-1 ml-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Deshecho por {log.deshechoPor} · {fechaRelativa(log.deshechoAt)}
                    </span>
                  )}
                </p>
              </div>

              {log.puedeDeshacer && (
                <button type="button" onClick={() => handleDeshacer(log)} disabled={deshaciendo === log.id}
                  title="Revertir esta acción" className="btn btn-borde btn-sm shrink-0 !font-medium">
                  <Undo2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{deshaciendo === log.id ? 'Deshaciendo...' : 'Deshacer'}</span>
                </button>
              )}
            </div>
          );
        })}


        <div className="px-4 sm:px-5 pb-4">
          <Paginacion
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            onCambiar={irAPagina}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default ActividadView;
