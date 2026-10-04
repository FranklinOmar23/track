import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { fetchLogs } from '../../utils/api';

const ACCION_COLOR = {
  crear: { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  editar: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  eliminar: { bg: 'rgba(244,63,94,0.12)', text: '#fb7185' },
  pago: { bg: 'rgba(13,148,136,0.12)', text: '#5eead4' },
  mover: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  login: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  error: { bg: 'rgba(248,113,113,0.16)', text: '#f87171' },
  info: { bg: 'rgba(125,211,252,0.16)', text: '#7dd3fc' },
};

const formatFecha = (fecha) =>
  new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha));

const ActividadView = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const data = await fetchLogs();
        setLogs(data);
      } catch (error) {
        console.error('Error cargando el registro de actividad:', error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="orb w-[500px] h-[500px]"
          style={{ top: '-150px', right: '-100px', background: '#0d9488', opacity: 0.04 }} />
        <div className="orb-reverse w-[400px] h-[400px]"
          style={{ bottom: '-100px', left: '-100px', background: '#8b5cf6', opacity: 0.04 }} />
        <div className="bg-dot-grid absolute inset-0" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9ca3af',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div>
            <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
              <History className="h-5 w-5" />
              Registro de Actividad
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">Quién hizo qué y cuándo, en toda la app</p>
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['Usuario', 'Acción', 'Entidad', 'Descripción', 'Fecha'].map((h, i) => (
                    <th key={h} className={`py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-widest ${
                      i === 0 ? 'text-left px-6' : i === 4 ? 'text-right px-6' : 'text-left px-4'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-700">Cargando...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-700">No hay actividad registrada aún.</td>
                  </tr>
                ) : (
                  logs.map((log, idx) => {
                    const color = ACCION_COLOR[log.accion] || { bg: 'rgba(255,255,255,0.06)', text: '#9ca3af' };
                    return (
                      <tr
                        key={log.id}
                        className="animate-fade-in-up transition-colors"
                        style={{ animationDelay: `${Math.min(idx, 20) * 25}ms`, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-6 py-3.5 text-gray-200 font-medium">{log.usuario}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                            style={{ background: color.bg, color: color.text }}>
                            {log.accion}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 capitalize">{log.entidad}</td>
                        <td className="px-4 py-3.5 text-gray-300">{log.descripcion}</td>
                        <td className="px-6 py-3.5 text-right text-gray-500 text-xs whitespace-nowrap">{formatFecha(log.fecha)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActividadView;
