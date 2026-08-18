import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as loginApi } from '../api';
import { useAuth, esPanelAdmin } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await loginApi(formData.username, formData.password);
      const { token, usuario } = response.data;

      login(token, usuario);
      navigate(esPanelAdmin(usuario?.rol) ? '/admin' : '/vendedor');
    } catch (err) {
      const errorData = err.response?.data;

      if (err.response?.status === 403) {
        setBloqueadoHasta(errorData.bloqueado_hasta);
        setError(errorData.error || 'Cuenta bloqueada. Intenta más tarde.');
      } else if (errorData?.intentos_restantes !== undefined) {
        setError(`${errorData.error} Intentos restantes: ${errorData.intentos_restantes}`);
      } else {
        setError(errorData?.error || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <BrandLogo className="h-28 w-auto object-contain mx-auto mb-3" />
          <p className="text-gray-600">Sistema de Venta de Boletos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-4 rounded-md text-sm font-500 ${
              bloqueadoHasta
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            }`}>
              {error}
              {bloqueadoHasta && (
                <p className="text-xs mt-1">
                  Bloqueado hasta: {new Date(bloqueadoHasta).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Usuario</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Ingresa tu usuario"
              disabled={loading || !!bloqueadoHasta}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-600 text-ink">Contraseña</label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary font-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña"
              disabled={loading || !!bloqueadoHasta}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!bloqueadoHasta}
            className="w-full bg-primary text-white font-600 py-2 rounded-md hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
