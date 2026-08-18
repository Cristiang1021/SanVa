import { useEffect, useState } from 'react';
import { getSmtpConfig, saveSmtpConfig, testSmtpConfig } from '../../api';

const EMPTY_FORM = {
  smtp_email: '',
  smtp_password: '',
  from_nombre: 'SanVa Teatro',
  contacto_email: '',
  contacto_telefono: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  youtube: '',
  twitter: '',
};

export default function AdminCorreo({ embedded = false }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [tienePassword, setTienePassword] = useState(false);
  const [activo, setActivo] = useState(false);
  const [emailPrueba, setEmailPrueba] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await getSmtpConfig();
        setForm({
          smtp_email: data.smtp_email || '',
          smtp_password: '',
          from_nombre: data.from_nombre || 'SanVa Teatro',
          contacto_email: data.contacto_email || '',
          contacto_telefono: data.contacto_telefono || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
          twitter: data.twitter || '',
        });
        setTienePassword(Boolean(data.tiene_password));
        setActivo(Boolean(data.activo));
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar la configuración.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await saveSmtpConfig(form);
      setTienePassword(Boolean(data.tiene_password));
      setActivo(Boolean(data.activo));
      setForm((prev) => ({ ...prev, smtp_password: '' }));
      setSuccess(data.message || 'Configuración guardada.');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await testSmtpConfig(emailPrueba);
      setSuccess(data.message || 'Correo de prueba enviado.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el correo de prueba.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className={embedded ? 'py-4' : 'p-8'}>Cargando...</div>;

  return (
    <div className="w-full">
      {!embedded && (
        <>
          <h1 className="text-3xl font-bold text-ink mb-2">Correo (Gmail)</h1>
          <p className="text-gray-600 text-sm mb-6">
            Desde aquí se envían las confirmaciones de compra y la recuperación de contraseña.
          </p>
        </>
      )}

      {embedded && (
        <p className="text-gray-600 text-sm mb-6">
          Configura Gmail, redes sociales y datos de contacto que aparecen en los correos.
        </p>
      )}

      <div className={`mb-6 p-3 rounded-md text-sm border ${
        activo
          ? 'bg-green-50 text-green-800 border-green-200'
          : 'bg-yellow-50 text-yellow-800 border-yellow-200'
      }`}>
        {activo
          ? 'Gmail está configurado y listo para enviar.'
          : 'Aún no hay una cuenta de Gmail activa. Completa los datos y guarda.'}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md text-sm bg-red-100 text-red-700 border border-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 rounded-md text-sm bg-green-100 text-green-700 border border-green-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-600 text-ink">Cuenta de envío</h2>

            <div>
              <label className="block text-sm font-600 text-ink mb-2">Correo de Gmail</label>
              <input
                type="email"
                name="smtp_email"
                value={form.smtp_email}
                onChange={handleChange}
                placeholder="tucorreo@gmail.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-600 text-ink mb-2">
                Contraseña de aplicación
              </label>
              <input
                type="password"
                name="smtp_password"
                value={form.smtp_password}
                onChange={handleChange}
                placeholder={tienePassword ? 'Deja vacío para no cambiarla' : 'xxxx xxxx xxxx xxxx'}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                No uses la contraseña normal de Gmail. Debes generar una contraseña de aplicación.
              </p>
            </div>

            <div>
              <label className="block text-sm font-600 text-ink mb-2">Nombre del remitente</label>
              <input
                type="text"
                name="from_nombre"
                value={form.from_nombre}
                onChange={handleChange}
                placeholder="SanVa Teatro"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
            <div>
              <h2 className="text-lg font-600 text-ink">Redes sociales en el correo</h2>
              <p className="text-xs text-gray-500 mt-1">
                Usuario (sin @) o enlace completo. Si dejas un campo vacío, esa red no aparece en el mail.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-600 text-ink mb-2">Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="usuario"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-600 text-ink mb-2">Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={form.facebook}
                  onChange={handleChange}
                  placeholder="usuario o página"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-600 text-ink mb-2">TikTok</label>
                <input
                  type="text"
                  name="tiktok"
                  value={form.tiktok}
                  onChange={handleChange}
                  placeholder="usuario"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-600 text-ink mb-2">YouTube</label>
                <input
                  type="text"
                  name="youtube"
                  value={form.youtube}
                  onChange={handleChange}
                  placeholder="usuario"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-600 text-ink mb-2">X (Twitter)</label>
                <input
                  type="text"
                  name="twitter"
                  value={form.twitter}
                  onChange={handleChange}
                  placeholder="usuario"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h3 className="text-sm font-600 text-ink">Contacto del pie del correo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-600 text-ink mb-2">Email de contacto</label>
                  <input
                    type="email"
                    name="contacto_email"
                    value={form.contacto_email}
                    onChange={handleChange}
                    placeholder="contacto@sanva.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-600 text-ink mb-2">Teléfono</label>
                  <input
                    type="text"
                    name="contacto_telefono"
                    value={form.contacto_telefono}
                    onChange={handleChange}
                    placeholder="(593) 000-0000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full xl:w-auto min-w-[220px] bg-primary text-white font-600 py-2.5 px-8 rounded-md hover:bg-primary-dark transition disabled:bg-gray-400"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-600 text-ink mb-1">Enviar correo de prueba</h2>
          <p className="text-xs text-gray-500 mb-3">
            Llega la misma plantilla de confirmación, con una compra de ejemplo (Platea A12, A13 y Palco B4).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={emailPrueba}
              onChange={(e) => setEmailPrueba(e.target.value)}
              placeholder="destino@ejemplo.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !emailPrueba.trim() || !activo}
              className="px-6 py-2 bg-primary text-white font-600 rounded-md hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0"
            >
              {testing ? 'Enviando...' : 'Probar'}
            </button>
          </div>
          {!activo && (
            <p className="text-xs text-gray-500 mt-2">Guarda la configuración antes de probar.</p>
          )}
        </div>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-700 space-y-2">
          <p className="font-600 text-blue-900">Cómo obtener la contraseña de aplicación</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>En tu cuenta de Google, activa la verificación en 2 pasos.</li>
            <li>Ve a <span className="font-600">Seguridad → Contraseñas de aplicaciones</span>.</li>
            <li>Crea una para “Correo” y pega aquí las 16 letras (los espacios no importan).</li>
          </ol>
          <p>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-600 hover:underline"
            >
              Abrir contraseñas de aplicación
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
