import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import BrandLogo from '../components/BrandLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await forgotPassword(email.trim());
      setSuccess(response.data.message || 'Si el email existe, recibirás un enlace de recuperación.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <BrandLogo className="h-28 w-auto object-contain mx-auto mb-3" />
          <h1 className="text-xl font-600 text-ink">Recuperar contraseña</h1>
          <p className="text-gray-600 text-sm mt-1">
            Te enviaremos un enlace a tu correo registrado
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 rounded-md text-sm bg-red-100 text-red-700 border border-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-md text-sm bg-green-100 text-green-700 border border-green-300">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="correo@ejemplo.com"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-primary text-white font-600 py-2 rounded-md hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="text-primary font-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
