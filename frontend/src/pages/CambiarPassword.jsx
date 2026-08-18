import { useState } from 'react';
import { Link } from 'react-router-dom';
import { changePassword } from '../api';
import { useAuth, esPanelAdmin } from '../context/AuthContext';
import PasswordRequirements from '../components/PasswordRequirements';

export default function CambiarPassword({ embedded = false }) {
  const { usuario } = useAuth();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const volverA = esPanelAdmin(usuario?.rol) ? '/admin' : '/vendedor';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordNueva !== passwordConfirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword(passwordActual, passwordNueva);
      setSuccess(response.data.message || 'Contraseña actualizada correctamente.');
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requisitos_faltantes?.length) {
        setError(`${data.error} ${data.requisitos_faltantes.join('. ')}.`);
      } else {
        setError(data?.error || 'Error al cambiar la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? '' : 'max-w-lg mx-auto px-4 py-8'}>
      {!embedded && (
        <div className="mb-6">
          <Link to={volverA} className="text-sm text-primary font-600 hover:underline">
            ← Volver
          </Link>
          <h1 className="text-2xl font-600 text-ink mt-2">Cambiar contraseña</h1>
          <p className="text-gray-600 text-sm mt-1">
            Ingresa tu contraseña actual y define una nueva
          </p>
        </div>
      )}

      {embedded && (
        <p className="text-gray-600 text-sm mb-4">
          Ingresa tu contraseña actual y define una nueva
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
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
          <label className="block text-sm font-600 text-ink mb-2">Contraseña actual</label>
          <input
            type="password"
            value={passwordActual}
            onChange={(e) => {
              setPasswordActual(e.target.value);
              setError('');
            }}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-600 text-ink mb-2">Nueva contraseña</label>
          <input
            type="password"
            value={passwordNueva}
            onChange={(e) => {
              setPasswordNueva(e.target.value);
              setError('');
            }}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
          />
          <PasswordRequirements password={passwordNueva} />
        </div>

        <div>
          <label className="block text-sm font-600 text-ink mb-2">Confirmar nueva contraseña</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value);
              setError('');
            }}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !passwordActual || !passwordNueva || !passwordConfirm}
          className="w-full bg-primary text-white font-600 py-2 rounded-md hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}
