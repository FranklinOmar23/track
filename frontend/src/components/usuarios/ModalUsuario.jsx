import { useState } from 'react';
import { X, Save, ShieldCheck, Shuffle, Eye, EyeOff, Lock } from 'lucide-react';
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
    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-40 ${activo ? 'bg-teal-500' : 'bg-white/15'}`}>
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${activo ? 'translate-x-4' : ''}`} />
  </button>
);

/** Crear o editar un usuario: datos, rol, permisos, viajes que puede ver y contraseña. */
const ModalUsuario = ({ usuario, viajes, esUnoMismo, onGuardado, onClose }) => {
  const nuevo = !usuario;
  const [username, setUsername] = useState(usuario?.username || '');
  const [nombre, setNombre] = useState(usuario?.nombreDisplay || '');
  const [password, setPassword] = useState(nuevo ? generarPassword() : '');
  const [verPassword, setVerPassword] = useState(nuevo);
  const [esAdmin, setEsAdmin] = useState(!!usuario?.esAdmin);
  const [activo, setActivo] = useState(usuario ? usuario.activo : true);
  const [permisos, setPermisos] = useState(usuario?.permisos || { editar: false, pagos: true, crear_viajes: false, reportes: false, actividad: false });
  const [todosViajes, setTodosViajes] = useState(usuario ? usuario.todosViajes : false);
  const [viajesSel, setViajesSel] = useState(new Set(usuario?.viajes || []));
  const [estado, setEstado] = useState({ guardando: false, error: '' });

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

  return (
    <Portal>
      <div className="modal-overlay-dark" onClick={onClose}>
        <div className="modal-card-dark w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]" style={{ background: '#1a1f2e' }}>
              <div>
                <h2 className="text-lg font-bold text-white">{nuevo ? 'Nuevo usuario' : `Editar ${usuario.username}`}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Qué puede hacer y qué viajes puede ver</p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]"><X className="h-4 w-4" /></button>
            </div>

            <div className="px-6 py-5 space-y-5 modal-stagger">
              {/* Datos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="modal-section-label">Usuario {nuevo && '*'}</span>
                  <input className="input-dark uppercase" value={username} disabled={!nuevo}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} placeholder="Ej: MARIA" autoFocus={nuevo} />
                </label>
                <label className="block">
                  <span className="modal-section-label">Nombre visible</span>
                  <input className="input-dark" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María Pérez" />
                </label>
              </div>

              <div>
                <span className="modal-section-label">{nuevo ? 'Contraseña *' : 'Nueva contraseña (opcional)'}</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input className="input-dark pr-10 font-mono" type={verPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder={nuevo ? '' : 'Dejar vacío para no cambiarla'} autoComplete="new-password" />
                    <button type="button" onClick={() => setVerPassword((v) => !v)} aria-label={verPassword ? 'Ocultar' : 'Mostrar'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200">
                      {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setPassword(generarPassword()); setVerPassword(true); }}
                    className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/[0.08] hover:bg-white/10">
                    <Shuffle className="h-3.5 w-3.5" /> Generar
                  </button>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Mínimo 8 caracteres. Compártela con la persona; luego puede cambiarla desde su menú.</p>
              </div>

              {/* Rol */}
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-white/[0.07] bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Administrador</p>
                    <p className="text-xs text-gray-500">Puede todo, en todos los viajes, y gestiona usuarios</p>
                  </div>
                </div>
                <Interruptor activo={esAdmin} onChange={setEsAdmin} disabled={esUnoMismo} />
              </div>

              {!esAdmin && (
                <>
                  {/* Permisos */}
                  <div>
                    <span className="modal-section-label">Permisos</span>
                    <div className="rounded-xl border border-white/[0.07] divide-y divide-white/[0.05]">
                      {PERMISOS_INFO.map((p) => (
                        <div key={p.clave} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-gray-200">{p.titulo}</p>
                            <p className="text-[11px] text-gray-500">{p.descripcion}</p>
                          </div>
                          <Interruptor activo={!!permisos[p.clave]} onChange={(v) => setPermisos((prev) => ({ ...prev, [p.clave]: v }))} />
                        </div>
                      ))}
                    </div>
                    {!permisos.editar && !permisos.pagos && (
                      <p className="text-[11px] text-amber-300/80 mt-1.5 flex items-center gap-1"><Lock className="h-3 w-3" /> Sin "Editar" ni "Registrar pagos" solo podrá consultar.</p>
                    )}
                  </div>

                  {/* Viajes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="modal-section-label mb-0">Viajes que puede ver</span>
                      <label className="flex items-center gap-2 text-xs text-gray-400">
                        Todos los viajes
                        <Interruptor activo={todosViajes} onChange={setTodosViajes} />
                      </label>
                    </div>
                    {todosViajes ? (
                      <p className="text-xs text-gray-500 rounded-xl px-4 py-3 border border-white/[0.07] bg-white/[0.02]">
                        Verá todos los viajes, incluidos los que se creen más adelante.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-white/[0.07] max-h-56 overflow-y-auto scroll-fino divide-y divide-white/[0.04]">
                        {viajesOrdenados.map((v) => (
                          <label key={v.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/[0.03]">
                            <input type="checkbox" className="accent-teal-500 h-4 w-4" checked={viajesSel.has(v.id)} onChange={() => alternarViaje(v.id)} />
                            <span className={`text-sm flex-1 truncate ${v.estado === 'cerrado' ? 'text-gray-500' : 'text-gray-200'}`}>{v.nombre}</span>
                            {v.estado === 'cerrado' && <span className="text-[10px] text-amber-400/80">cerrado</span>}
                          </label>
                        ))}
                      </div>
                    )}
                    {!todosViajes && viajesSel.size === 0 && (
                      <p className="text-[11px] text-amber-300/80 mt-1.5">No verá ningún viaje hasta que marques al menos uno.</p>
                    )}
                  </div>
                </>
              )}

              {!nuevo && (
                <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-white/[0.07] bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-semibold text-white">Usuario activo</p>
                    <p className="text-xs text-gray-500">Si lo desactivas no podrá entrar y se cierra su sesión</p>
                  </div>
                  <Interruptor activo={activo} onChange={setActivo} disabled={esUnoMismo} />
                </div>
              )}

              {estado.error && <p className="text-sm text-rose-400">{estado.error}</p>}

              <div className="modal-acciones flex items-center justify-end gap-2">
                <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={estado.guardando}>Cancelar</button>
                <button type="button" className="btn-modal-primary" onClick={guardar}
                  disabled={estado.guardando || (nuevo && (!username.trim() || password.length < 8))}>
                  <Save className="h-3.5 w-3.5" /> {estado.guardando ? 'Guardando...' : nuevo ? 'Crear usuario' : 'Guardar cambios'}
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
