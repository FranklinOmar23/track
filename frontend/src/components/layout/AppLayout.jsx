import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Briefcase, Archive, BarChart3, Clock, Users, Plus, Menu, X,
  ChevronDown, KeyRound, LogOut, ShieldCheck,
} from 'lucide-react';
import { useHabitacionesContext } from '../../Context/HabitacionesContext';
import { useAuthContext } from '../../Context/AuthContext';
import { rutaViaje } from '../../utils/rutas';
import ModalAgregarViaje from '../Modals/ModalAgregarViaje';
import { ModalCambiarPassword } from '../common/MenuUsuario';
import AvisosExito from '../common/AvisosExito';

/** Logo de la marca: cuadro verde con la inicial + nombre. */
export const Marca = ({ claro = true }) => (
  <div className="flex items-center gap-2.5">
    <span className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-[15px] shrink-0"
      style={{ background: 'linear-gradient(160deg, #13887d, #0f766e)' }}>
      S
    </span>
    <span className="leading-tight">
      <span className={`block text-[15px] font-semibold ${claro ? 'text-white' : 'text-slate-900'}`}>Sadoj Tours</span>
      <span className={`block text-xs ${claro ? 'text-slate-400' : 'text-slate-500'}`}>Control de pagos</span>
    </span>
  </div>
);

const ItemMenu = ({ to, icono: Icono, label, contador, activo, onNavegar }) => (
  <NavLink
    to={to}
    end={to === '/'}
    onClick={onNavegar}
    className={({ isActive }) => {
      const on = activo ?? isActive;
      return `flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors ${
        on ? 'bg-white/10 text-white font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`;
    }}
  >
    <Icono className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
    <span className="flex-1">{label}</span>
    {contador > 0 && (
      <span className="min-w-[1.5rem] h-5 px-1.5 rounded-full bg-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center tabular-nums">
        {contador}
      </span>
    )}
  </NavLink>
);

/** Tarjeta del usuario al pie del menú, con opciones (usuarios, contraseña, salir). */
const UsuarioMenu = ({ onNavegar }) => {
  const { user, esAdmin, logout } = useAuthContext();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alClic = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false); };
    const alTecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  if (!user) return null;
  const nombre = user.nombreDisplay || user.username;
  const opcion = 'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors';

  return (
    <div className="relative" ref={ref}>
      {abierto && (
        <div role="menu" className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xl animate-fade-in-scale origin-bottom z-10">
          <div className="px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{nombre}</p>
            <p className="text-[11px] text-slate-500">{esAdmin ? 'Administrador' : `@${user.username}`}</p>
          </div>
          {esAdmin && (
            <button type="button" role="menuitem" className={opcion}
              onClick={() => { setAbierto(false); onNavegar?.(); navigate('/usuarios'); }}>
              <Users className="h-4 w-4 text-slate-400" /> Usuarios y permisos
            </button>
          )}
          <button type="button" role="menuitem" className={opcion} onClick={() => { setAbierto(false); setCambiando(true); }}>
            <KeyRound className="h-4 w-4 text-slate-400" /> Cambiar mi contraseña
          </button>
          <button type="button" role="menuitem" className={`${opcion} text-red-700 border-t border-slate-100`} onClick={logout}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-haspopup="menu" aria-expanded={abierto}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/[0.06] transition-colors text-left">
        <span className="h-8 w-8 rounded-full bg-slate-700/70 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span className="flex items-center gap-1 text-sm font-semibold text-white truncate">
            {nombre}
            {esAdmin && <ShieldCheck className="h-3.5 w-3.5 text-teal-300 shrink-0" aria-label="Administrador" />}
          </span>
          <span className="block text-xs text-slate-400">Sesión activa</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {cambiando && <ModalCambiarPassword onClose={() => setCambiando(false)} />}
    </div>
  );
};

/** Contenido del menú lateral (se usa fijo en escritorio y como cajón en móvil). */
const Lateral = ({ onNuevoViaje, onNavegar }) => {
  const { state } = useHabitacionesContext();
  const { puede, esAdmin } = useAuthContext();
  const { pathname } = useLocation();
  const activos = state.viajes.filter((v) => v.estado !== 'cerrado').length;
  const cerrados = state.viajes.length - activos;
  // Dentro de un viaje (/resort/... o /tour/...) se marca "Mis viajes"
  const enViaje = /^\/(viaje\/)?(resort|tour)\//.test(pathname);

  return (
    <div className="h-full flex flex-col px-4 py-5" style={{ background: 'var(--lateral)' }}>
      <div className="px-1"><Marca /></div>

      <p className="mt-8 mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500">MENÚ</p>
      <nav className="space-y-1">
        <ItemMenu to="/" icono={LayoutGrid} label="Dashboard" onNavegar={onNavegar} />
        <ItemMenu to="/viajes" icono={Briefcase} label="Mis viajes" contador={activos} onNavegar={onNavegar}
          activo={enViaje || pathname === '/viajes'} />
        <ItemMenu to="/historial" icono={Archive} label="Historial" contador={cerrados} onNavegar={onNavegar} />
        {puede('reportes') && <ItemMenu to="/reportes" icono={BarChart3} label="Reportes" onNavegar={onNavegar} />}
        {puede('actividad') && <ItemMenu to="/actividad" icono={Clock} label="Actividad" onNavegar={onNavegar} />}
        {esAdmin && <ItemMenu to="/usuarios" icono={Users} label="Usuarios" onNavegar={onNavegar} />}
      </nav>

      {puede('crear_viajes') && (
        <button type="button" onClick={onNuevoViaje}
          className="mt-7 h-11 w-full rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
          style={{ background: 'linear-gradient(180deg, #13887d, #0f766e)' }}>
          <Plus className="h-4 w-4" /> Nuevo viaje
        </button>
      )}

      <div className="mt-auto pt-6">
        <UsuarioMenu onNavegar={onNavegar} />
      </div>
    </div>
  );
};

/** Estructura general de la app: menú lateral + contenido. */
const AppLayout = () => {
  const { crearViaje } = useHabitacionesContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [nuevoViaje, setNuevoViaje] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);

  // Al cambiar de página se vuelve arriba (el menú móvil se cierra al tocar un enlace)
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const abrirNuevoViaje = () => { setMenuMovil(false); setNuevoViaje(true); };

  const alCrear = async (datos) => {
    const creado = await crearViaje(datos);
    if (creado?.id && (creado.slug || creado.nombre)) navigate(rutaViaje(creado));
    else navigate('/viajes');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--fondo)' }}>
      {/* Escritorio: menú fijo */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[232px] z-30 sin-imprimir-app">
        <Lateral onNuevoViaje={abrirNuevoViaje} />
      </aside>

      {/* Móvil: barra superior + cajón */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 sin-imprimir-app"
        style={{ background: 'var(--lateral)' }}>
        <Marca />
        <button type="button" onClick={() => setMenuMovil(true)} aria-label="Abrir menú"
          className="p-2 -mr-2 rounded-lg text-slate-200 hover:bg-white/10">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {menuMovil && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={() => setMenuMovil(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] lateral-movil shadow-2xl">
            <button type="button" onClick={() => setMenuMovil(false)} aria-label="Cerrar menú"
              className="absolute top-5 right-3 p-1.5 rounded-lg text-slate-300 hover:bg-white/10 z-10">
              <X className="h-4 w-4" />
            </button>
            <Lateral onNuevoViaje={abrirNuevoViaje} onNavegar={() => setMenuMovil(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-[232px]">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-9 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>

      <ModalAgregarViaje open={nuevoViaje} onClose={() => setNuevoViaje(false)} onCreate={alCrear} />
      <AvisosExito />
    </div>
  );
};

export default AppLayout;
