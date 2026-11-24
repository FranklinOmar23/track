import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../Context/AuthContext';
import { Marca } from '../layout/AppLayout';

const LoginView = () => {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Panel de marca */}
      <div className="hidden lg:flex flex-col justify-between p-14 xl:p-16" style={{ background: 'var(--lateral)' }}>
        <Marca />
        <div className="max-w-md">
          <h1 className="text-[2.1rem] leading-tight font-bold text-white tracking-tight">
            Todos tus viajes y cobros, en un solo lugar.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
            Registra pagos por habitación, da seguimiento a lo pendiente y genera reportes para el hotel y el bus.
          </p>
        </div>
        <p className="text-xs text-slate-500">{window.location.host}</p>
      </div>

      {/* Formulario */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden mb-10 self-center rounded-xl px-4 py-3" style={{ background: 'var(--lateral)' }}>
          <Marca />
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-[368px] animate-fade-in-up">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Iniciar sesión</h2>
          <p className="text-sm text-slate-500 mt-1">Ingresa con tu usuario para continuar.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-usuario" className="modal-section-label !mb-1.5">Usuario</label>
              <input id="login-usuario" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="input-dark" placeholder="Tu usuario" autoFocus autoComplete="username" />
            </div>
            <div>
              <label htmlFor="login-clave" className="modal-section-label !mb-1.5">Contraseña</label>
              <input id="login-clave" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-dark" placeholder="••••••••" autoComplete="current-password" />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>
            )}

            <button type="submit" disabled={loading || !username || !password}
              className="btn btn-primario w-full h-11 text-sm">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
