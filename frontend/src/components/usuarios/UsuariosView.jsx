import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, ShieldCheck, Pencil, Copy, Check } from 'lucide-react';
import { fetchUsuarios } from '../../utils/api';
import { useAuthContext } from '../../Context/AuthContext';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import ModalUsuario from './ModalUsuario';
import { PERMISOS_INFO } from './permisosInfo';

const fechaRelativa = (f) => {
  if (!f) return 'Nunca';
  const dias = Math.floor((Date.now() - new Date(f).getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return `Hace ${dias} días`;
  return new Date(f).toLocaleDateString('es-DO', { dateStyle: 'medium' });
};

/** Gestión de usuarios (solo administradores). */
const UsuariosView = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { state } = useHabitacionesContext();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(undefined); // undefined: cerrado · null: nuevo · objeto: editar
  const [credencial, setCredencial] = useState(null); // contraseña recién creada para copiar
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetchUsuarios()
      .then(setUsuarios)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const alGuardar = (guardado, password) => {
    setUsuarios((prev) => {
      const existe = prev.some((u) => u.id === guardado.id);
      return existe ? prev.map((u) => (u.id === guardado.id ? guardado : u)) : [...prev, guardado];
    });
    if (password) setCredencial({ username: guardado.username, password });
    setEditando(undefined);
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(`Usuario: ${credencial.username}\nContraseña: ${credencial.password}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const nombreViaje = (id) => state.viajes.find((v) => v.id === id)?.nombre || `Viaje ${id}`;

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-white/5 border border-white/[0.08] transition-colors">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold gradient-text flex items-center gap-2"><Users className="h-5 w-5" /> Usuarios y permisos</h1>
            <p className="text-xs text-gray-500 mt-0.5">Quién puede entrar, qué puede hacer y qué viajes ve</p>
          </div>
          <button type="button" onClick={() => setEditando(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)', boxShadow: '0 4px 14px -4px rgba(13,148,136,0.55)' }}>
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </button>
        </div>

        {credencial && (
          <div className="mb-5 rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/[0.07] animate-fade-in-up">
            <p className="text-sm font-semibold text-emerald-300">Credenciales de {credencial.username}</p>
            <p className="text-xs text-gray-400 mt-0.5">Cópialas y compártelas ahora: por seguridad no se vuelven a mostrar.</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="text-sm text-white bg-black/30 rounded-lg px-3 py-1.5">{credencial.username} · {credencial.password}</code>
              <button type="button" onClick={copiar} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
                {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <button type="button" onClick={() => setCredencial(null)} className="text-xs text-gray-500 hover:text-gray-300 ml-auto">Ocultar</button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

        <div className="space-y-3">
          {cargando && [0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />)}
          {usuarios.map((u, i) => (
            <div key={u.id} className={`rounded-xl p-4 border border-white/[0.07] bg-[#1a1f2e] animate-fade-in-up ${u.activo ? '' : 'opacity-55'}`}
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: u.esAdmin ? 'rgba(13,148,136,0.35)' : 'rgba(255,255,255,0.08)' }}>
                  {(u.nombreDisplay || u.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                    {u.nombreDisplay || u.username}
                    <span className="text-xs font-normal text-gray-500">@{u.username}</span>
                    {u.esAdmin && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/25 rounded-full px-2 py-0.5"><ShieldCheck className="h-3 w-3" /> Administrador</span>}
                    {!u.activo && <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-full px-2 py-0.5">Desactivado</span>}
                    {u.id === user?.id && <span className="text-[10px] text-gray-500">(tú)</span>}
                  </p>
                  {!u.esAdmin && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PERMISOS_INFO.filter((p) => u.permisos[p.clave]).map((p) => (
                        <span key={p.clave} className="text-[11px] text-gray-300 bg-white/[0.05] border border-white/[0.08] rounded-full px-2 py-0.5">{p.titulo}</span>
                      ))}
                      {!PERMISOS_INFO.some((p) => u.permisos[p.clave]) && <span className="text-[11px] text-amber-300/80">Solo consulta</span>}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {u.esAdmin || u.todosViajes
                      ? 'Ve todos los viajes'
                      : u.viajes.length
                        ? `Ve: ${u.viajes.map(nombreViaje).join(', ')}`
                        : 'No tiene viajes asignados'}
                    <span className="text-gray-600"> · Último acceso: {fechaRelativa(u.ultimoAcceso)}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setEditando(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 bg-white/5 border border-white/[0.08] hover:bg-white/10">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editando !== undefined && (
        <ModalUsuario
          usuario={editando}
          viajes={state.viajes}
          esUnoMismo={editando?.id === user?.id}
          onGuardado={alGuardar}
          onClose={() => setEditando(undefined)}
        />
      )}
    </div>
  );
};

export default UsuariosView;
