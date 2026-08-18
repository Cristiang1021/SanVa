import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword, verifyResetToken } from '../api';
import BrandLogo from '../components/BrandLogo';
import PasswordRequirements from '../components/PasswordRequirements';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [usuarioInfo, setUsuarioInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const verificar = async () => {
      if (!token) {
        setError('Enlace inválido. Solicita un nuevo enlace de recuperación.');
        setVerificando(false);
        return;
      }

      try {
        const response = await verifyResetToken(token);
        if (!cancelled) {
          setTokenValido(true);
          setUsuarioInfo({
            email: response.data.email,
            username: response.data.username,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setTokenValido(false);
          setError(err.response?.data?.error || 'Token inválido o expirado.');
        }
      } finally {
        if (!cancelled) setVerificando(false);
      }
    };

    verificar();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordNueva !== passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, passwordNueva);
      setSuccess(response.data.message || 'Contraseña restablecida correctamente.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.requisitos_faltantes?.length) {
        setError(`${data.error} ${data.requisitos_faltantes.join('. ')}.`);
      } else {
        setError(data?.error || 'Error al restablecer la contraseña.');
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
          <h1 className="text-xl font-600 text-ink">Nueva contraseña</h1>
          {usuarioInfo && (
            <p className="text-gray-600 text-sm mt-1">
              Cuenta: <span className="font-600">{usuarioInfo.username}</span>
            </p>
          )}
        </div>

        {verificando ? (
          <p className="text-center text-gray-600 text-sm">Verificando enlace...</p>
        ) : !tokenValido ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md text-sm bg-red-100 text-red-700 border border-red-300">
              {error}
            </div>
            <p className="text-center text-sm">
              <Link to="/forgot-password" className="text-primary font-600 hover:underline">
                Solicitar un nuevo enlace
              </Link>
            </p>
          </div>
        ) : (
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
              <label className="block text-sm font-600 text-ink mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={passwordNueva}
                onChange={(e) => {
                  setPasswordNueva(e.target.value);
                  setError('');
                }}
                placeholder="Nueva contraseña"
                required
                disabled={loading || !!success}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              />
              <PasswordRequirements password={passwordNueva} />
            </div>

            <div>
              <label className="block text-sm font-600 text-ink mb-2">Confirmar contraseña</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  setError('');
                }}
                placeholder="Repite la contraseña"
                required
                disabled={loading || !!success}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success || !passwordNueva || !passwordConfirm}
              className="w-full bg-primary text-white font-600 py-2 rounded-md hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="text-primary font-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
