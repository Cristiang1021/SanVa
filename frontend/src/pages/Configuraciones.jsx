import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminCorreo from './admin/Correo';
import CambiarPassword from './CambiarPassword';

export default function Configuraciones() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState(isAdmin ? 'correo' : 'cuenta');

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-ink mb-6">Configuraciones</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setTab('correo')}
            className={`px-4 py-2 text-sm font-600 border-b-2 -mb-px transition ${
              tab === 'correo'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-ink'
            }`}
          >
            Correo (Gmail)
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('cuenta')}
          className={`px-4 py-2 text-sm font-600 border-b-2 -mb-px transition ${
            tab === 'cuenta'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          Mi contraseña
        </button>
      </div>

      {tab === 'correo' && isAdmin ? (
        <AdminCorreo embedded />
      ) : (
        <div className="max-w-xl">
          <CambiarPassword embedded />
        </div>
      )}
    </div>
  );
}
