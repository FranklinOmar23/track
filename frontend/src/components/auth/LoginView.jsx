import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuthContext } from '../../Context/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] bg-dot-grid px-4">
      <div className="relative overflow-hidden rounded-2xl w-full max-w-sm p-8 animate-fade-in-scale"
        style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2538 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div className="orb w-56 h-56" style={{ top: '-60px', left: '-40px', background: '#0d9488', opacity: 0.12 }} />

        <div className="relative">
          <h1 className="text-xl font-bold gradient-text text-center">ResortMamaTingo</h1>
          <p className="text-gray-500 text-sm text-center mt-1 mb-6">Inicia sesión para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-dark w-full mt-1.5"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark w-full mt-1.5"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-press w-full text-white px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                boxShadow: '0 4px 20px -4px rgba(13,148,136,0.5)',
              }}
            >
              <LogIn className="h-4 w-4" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
