import { useState } from 'react';
import { X, Save, ShieldCheck, Shuffle, Eye, EyeOff, Lock, Search, Check } from 'lucide-react';
import Portal from '../common/Portal';
import { crearUsuario, actualizarUsuario, restablecerPassword } from '../../utils/api';
import { PERMISOS_INFO } from './permisosInfo';

const generarPassword = () => {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const valores = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(valores, (v) => letras[v % letras.length]).join('');
};

const Interruptor = ({ activo, onChange, disabled }) => (
  <button type="button" role="switch" aria-checked={activo} onClick={() => onChange(!activo)} disabled={disabled}
    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-40 ${activo ? 'bg-teal-700' : 'bg-slate-300'}`}>
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#ffffff] shadow-sm transition-transform ${activo ? 'translate-x-4' : ''}`} />
  </button>
);

/** Crear o editar un usuario: cuenta (izquierda) y acceso: permisos y viajes (derecha). */
const ModalUsuario = ({ usuario, viajes, esUnoMismo, onGuardado, onClose }) => {
  const nuevo = !usuario;
  const [username, setUsername] = useState(usuario?.username || '');
  const [nombre, setNombre] = useState(usuario?.nombreDisplay || '');
  const [password, setPassword] = useState(nuevo ? generarPassword() : '');
  const [verPassword, setVerPassword] = useState(nuevo);
  const [esAdmin, setEsAdmin] = useState(!!usuario?.esAdmin);
  const [activo, setActivo] = useState(usuario ? usuario.activo : true);
  const [permisos, setPermisos] = useState(usuario?.permisos || { editar: false, pagos: true, crear_viajes: false, reportes: false, actividad: false, clientes: false, clientes_editar: false });
  const [todosViajes, setTodosViajes] = useState(usuario ? usuario.todosViajes : false);
  const [viajesSel, setViajesSel] = useState(new Set(usuario?.viajes || []));
  const [estado, setEstado] = useState({ guardando: false, error: '' });
  const [busquedaViaje, setBusquedaViaje] = useState('');

  const alternarViaje = (id) => setViajesSel((prev) => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  const guardar = async () => {
    setEstado({ guardando: true, error: '' });
    try {
      const datos = { nombreDisplay: nombre.trim(), esAdmin, permisos, todosViajes, viajes: [...viajesSel], activo };
      let guardado;
      if (nuevo) {
        guardado = await crearUsuario({ ...datos, username: username.trim(), password });
      } else {
        guardado = await actualizarUsuario(usuario.id, datos);
        if (password) await restablecerPassword(usuario.id, password);
      }
      onGuardado(guardado, nuevo ? password : password || null);
    } catch (error) {
      setEstado({ guardando: false, error: error.message });
    }
  };

  const viajesOrdenados = [...viajes].sort((a, b) => (a.estado === 'cerrado') - (b.estado === 'cerrado') || a.nombre.localeCompare(b.nombre, 'es'));
  const q = busquedaViaje.trim().toLowerCase();
  const viajesVisibles = viajesOrdenados.filter((v) => !q || v.nombre.toLowerCase().includes(q));
  const marcarViajes = (lista) => setViajesSel(new Set(lista.map((v) => v.id)));
  const soloConsulta = !permisos.editar && !permisos.pagos;
  const plural = (n, s) => `${n} ${s}${n !== 1 ? 's' : ''}`;

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={onClose}>
        <div className="modal-card-dark w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{nuevo ? 'Nuevo usuario' : `Editar ${usuario.username}`}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Qué puede hacer y qué viajes puede ver</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {/* ── Cuenta ── */}
                <div className="px-6 py-5 space-y-4 lg:border-r border-slate-100">
                  <p className="label-mayus">Cuenta</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="modal-section-label">Usuario {nuevo && <span className="text-red-600">*</span>}</span>
                      <input className="input-dark uppercase" value={username} disabled={!nuevo}
                        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} placeholder="Ej: MARIA" autoFocus={nuevo} />
                    </label>
                    <label className="block">
                      <span className="modal-section-label">Nombre visible</span>
                      <input className="input-dark" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María Pérez" />
                    </label>
                  </div>

                  <div>
                    <span className="modal-section-label">
                      {nuevo ? <>Contraseña <span className="text-red-600">*</span></> : 'Nueva contraseña (opcional)'}
                    </span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input className="input-dark pr-10 font-mono" type={verPassword ? 'text' : 'password'} value={password}
                          onChange={(e) => setPassword(e.target.value)} placeholder={nuevo ? '' : 'Dejar vacío para no cambiarla'} autoComplete="new-password" />
                        <button type="button" onClick={() => setVerPassword((v) => !v)} aria-label={verPassword ? 'Ocultar' : 'Mostrar'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                          {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button type="button" onClick={() => { setPassword(generarPassword()); setVerPassword(true); }}
                        className="btn btn-borde !h-auto">
                        <Shuffle className="h-3.5 w-3.5" /> Generar
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">Mínimo 8 caracteres. La persona puede cambiarla luego desde su menú.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">Administrador</p>
                          <p className="text-xs text-slate-500">Puede todo, en todos los viajes, y gestiona usuarios</p>
                        </div>
                      </div>
                      <Interruptor activo={esAdmin} onChange={setEsAdmin} disabled={esUnoMismo} />
                    </div>
                    {!nuevo && (
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">Usuario activo</p>
                          <p className="text-xs text-slate-500">Si lo desactivas no podrá entrar y se cierra su sesión</p>
                        </div>
                        <Interruptor activo={activo} onChange={setActivo} disabled={esUnoMismo} />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Acceso ── */}
                <div className="px-6 py-5 space-y-5 border-t lg:border-t-0 border-slate-100">
                  {esAdmin ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6">
                      <ShieldCheck className="h-8 w-8 text-teal-700" />
                      <p className="mt-3 text-sm font-semibold text-slate-900">Acceso completo</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Un administrador tiene todos los permisos y ve todos los viajes; no hace falta configurar nada más.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Permisos */}
                      <div>
                        <p className="label-mayus mb-2.5">Permisos</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {PERMISOS_INFO.map((p) => {
                            const on = !!permisos[p.clave];
                            return (
                              <button key={p.clave} type="button" role="checkbox" aria-checked={on}
                                onClick={() => setPermisos((prev) => ({ ...prev, [p.clave]: !on }))}
                                className={`flex items-start gap-2.5 text-left rounded-xl border px-3 py-2.5 transition-colors ${
                                  on ? 'border-teal-600 bg-[#eef7f5]' : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}>
                                <span className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                  on ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-slate-900">{p.titulo}</span>
                                  <span className="block text-[11px] leading-snug text-slate-500">{p.descripcion}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {soloConsulta && (
                          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Sin “Editar” ni “Registrar pagos” solo podrá consultar.
                          </p>
                        )}
                      </div>

                      {/* Viajes */}
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                          <p className="label-mayus">Viajes que puede ver</p>
                          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            Todos los viajes
                            <Interruptor activo={todosViajes} onChange={setTodosViajes} />
                          </label>
                        </div>
                        {todosViajes ? (
                          <p className="text-xs text-slate-600 rounded-xl px-4 py-3 border border-slate-200 bg-slate-50">
                            Verá todos los viajes, incluidos los que se creen más adelante.
                          </p>
                        ) : (
                          <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-100 bg-slate-50/60">
                              <div className="relative flex-1 min-w-[140px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <input value={busquedaViaje} onChange={(e) => setBusquedaViaje(e.target.value)} placeholder="Buscar viaje..."
                                  aria-label="Buscar viaje" className="campo-buscar !h-8 !pl-8 !text-[13px] !bg-white" />
                              </div>
                              <button type="button" className="btn btn-borde btn-sm"
                                onClick={() => marcarViajes(viajesOrdenados.filter((v) => v.estado !== 'cerrado'))}>
                                Activos
                              </button>
                              <button type="button" className="btn btn-borde btn-sm" onClick={() => marcarViajes([])}>Ninguno</button>
                            </div>
                            <div className="max-h-44 overflow-y-auto scroll-fino p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {viajesVisibles.map((v) => (
                                <label key={v.id}
                                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${viajesSel.has(v.id) ? 'bg-[#eef7f5]' : 'hover:bg-slate-50'}`}>
                                  <input type="checkbox" className="accent-teal-700 h-4 w-4 shrink-0" checked={viajesSel.has(v.id)} onChange={() => alternarViaje(v.id)} />
                                  <span className={`text-[13px] flex-1 truncate ${v.estado === 'cerrado' ? 'text-slate-500' : 'text-slate-800'}`} title={v.nombre}>
                                    {v.nombre}
                                  </span>
                                  {v.estado === 'cerrado' && <Lock className="h-3 w-3 text-amber-600 shrink-0" aria-label="cerrado" />}
                                </label>
                              ))}
                              {viajesVisibles.length === 0 && (
                                <p className="col-span-full text-xs text-slate-400 text-center py-4">No hay viajes con “{busquedaViaje}”</p>
                              )}
                            </div>
                          </div>
                        )}
                        {!todosViajes && (
                          <p className={`text-xs mt-1.5 ${viajesSel.size === 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {viajesSel.size === 0
                              ? 'No verá ningún viaje hasta que marques al menos uno.'
                              : `${plural(viajesSel.size, 'viaje')} seleccionado${viajesSel.size !== 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-red-700 min-w-0" role="alert">{estado.error}</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={estado.guardando}>Cancelar</button>
                <button type="button" className="btn-modal-primary" onClick={guardar}
                  disabled={estado.guardando || (nuevo && (!username.trim() || password.length < 8))}>
                  <Save className="h-4 w-4" /> {estado.guardando ? 'Guardando...' : nuevo ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ModalUsuario;
