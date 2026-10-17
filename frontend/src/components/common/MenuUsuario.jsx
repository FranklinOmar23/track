import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Users, ShieldCheck, X } from 'lucide-react';
import { useAuthContext } from '../../Context/AuthContext';
import { cambiarMiPassword } from '../../utils/api';
import Portal from './Portal';

const ModalCambiarPassword = ({ onClose }) => {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [estado, setEstado] = useState({ guardando: false, error: '', listo: false });

  const guardar = async (e) => {
    e.preventDefault();
    if (nueva.length < 8) return setEstado({ guardando: false, error: 'La contraseña nueva debe tener al menos 8 caracteres.' });
    if (nueva !== repetir) return setEstado({ guardando: false, error: 'Las contraseñas nuevas no coinciden.' });
    setEstado({ guardando: true, error: '' });
    try {
      await cambiarMiPassword(actual, nueva);
      setEstado({ guardando: false, error: '', listo: true });
      setTimeout(onClose, 1200);
    } catch (error) {
      setEstado({ guardando: false, error: error.message });
    }
  };

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={onClose}>
        <form onSubmit={guardar} className="modal-card-dark w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <h3 className="text-base font-bold text-white flex items-center gap-2"><KeyRound className="h-4 w-4 text-teal-400" /> Cambiar mi contraseña</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-3 modal-stagger">
            {[['Contraseña actual', actual, setActual, 'current-password'], ['Nueva contraseña', nueva, setNueva, 'new-password'], ['Repetir la nueva', repetir, setRepetir, 'new-password']].map(([label, valor, set, auto]) => (
              <label key={label} className="block">
                <span className="modal-section-label">{label}</span>
                <input type="password" className="input-dark" value={valor} onChange={(e) => set(e.target.value)} autoComplete={auto} required />
              </label>
            ))}
            {estado.error && <p className="text-xs text-rose-400">{estado.error}</p>}
            {estado.listo && <p className="text-xs text-emerald-400">Contraseña actualizada.</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" className="btn-modal-secondary flex-1" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn-modal-primary flex-1" disabled={estado.guardando || estado.listo}>
                {estado.guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Portal>
  );
};

/** Chip del usuario con menú: gestionar usuarios (admin), cambiar contraseña y cerrar sesión. */
const MenuUsuario = ({ className = '' }) => {
  const { user, esAdmin, logout } = useAuthContext();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [posicion, setPosicion] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);

  // El menú se dibuja en <body> (Portal): el encabezado tiene overflow-hidden y lo recortaba.
  // Se posiciona justo debajo del botón; al hacer scroll o cambiar el tamaño se cierra.
  const abrir = () => {
    const r = ref.current.getBoundingClientRect();
    const ancho = 224; // w-56
    setPosicion({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8)) });
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return undefined;
    const alClic = (e) => {
      if (!ref.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setAbierto(false);
    };
    const cerrar = () => setAbierto(false);
    const alTecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  if (!user) return null;
  const opcion = 'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left text-gray-300 hover:bg-white/[0.05] transition-colors';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => (abierto ? setAbierto(false) : abrir())} aria-haspopup="menu" aria-expanded={abierto}
        className="flex items-center gap-2 text-xs font-medium text-gray-300 bg-white/5 border border-white/[0.07] hover:border-white/20 rounded-full pl-3 pr-2 py-1.5 transition-colors">
        {esAdmin && <ShieldCheck className="h-3.5 w-3.5 text-teal-400" title="Administrador" />}
        {user.nombreDisplay || user.username}
        <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && posicion && (
        <Portal>
        <div role="menu" ref={menuRef} className="fixed w-56 rounded-xl overflow-hidden animate-fade-in-scale origin-top-left"
          style={{ top: posicion.top, left: posicion.left, zIndex: 70, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
          <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white truncate">{user.nombreDisplay || user.username}</p>
            <p className="text-[11px] text-gray-500">{esAdmin ? 'Administrador' : `@${user.username}`}</p>
          </div>
          {esAdmin && (
            <button type="button" role="menuitem" className={opcion} onClick={() => { setAbierto(false); navigate('/usuarios'); }}>
              <Users className="h-4 w-4 text-gray-500" /> Usuarios y permisos
            </button>
          )}
          <button type="button" role="menuitem" className={opcion} onClick={() => { setAbierto(false); setCambiando(true); }}>
            <KeyRound className="h-4 w-4 text-gray-500" /> Cambiar mi contraseña
          </button>
          <button type="button" role="menuitem" className={`${opcion} text-rose-300 border-t border-white/[0.06]`} onClick={logout}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
        </Portal>
      )}
      {cambiando && <ModalCambiarPassword onClose={() => setCambiando(false)} />}
    </div>
  );
};

export default MenuUsuario;
