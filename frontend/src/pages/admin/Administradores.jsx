import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getAdministradores,
  createAdministrador,
  invitarAdministrador,
  reenviarInvitacion,
  updateVendedor,
  deleteVendedor,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import PasswordRequirements from '../../components/PasswordRequirements';

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  nombre_completo: '',
};

export default function AdminAdministradores() {
  const { isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('crear');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reenviandoId, setReenviandoId] = useState(null);

  useEffect(() => {
    if (isSuperAdmin) fetchAdmins();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await getAdministradores();
      setAdmins(response.data.usuarios || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar administradores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode = 'crear', admin = null) => {
    setModalMode(mode);
    setSuccess('');
    if (admin) {
      setEditingId(admin.id);
      setFormData({
        username: admin.username,
        email: admin.email,
        password: '',
        nombre_completo: admin.nombre_completo,
      });
    } else {
      setEditingId(null);
      setFormData(EMPTY_FORM);
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        const payload = {
          nombre_completo: formData.nombre_completo,
          email: formData.email,
        };
        if (formData.password) payload.password = formData.password;
        await updateVendedor(editingId, payload);
        setSuccess('Administrador actualizado.');
      } else if (modalMode === 'invitar') {
        const { data } = await invitarAdministrador({
          username: formData.username,
          email: formData.email,
          nombre_completo: formData.nombre_completo,
        });
        setSuccess(data.message || 'Invitación enviada.');
      } else {
        await createAdministrador(formData);
        setSuccess('Administrador creado.');
      }
      await fetchAdmins();
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar administrador');
    } finally {
      setSaving(false);
    }
  };

  const handleReenviar = async (admin) => {
    setReenviandoId(admin.id);
    setError('');
    setSuccess('');
    try {
      const { data } = await reenviarInvitacion(admin.id);
      setSuccess(data.message || 'Invitación reenviada.');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reenviar invitación');
    } finally {
      setReenviandoId(null);
    }
  };

  const handleToggleActivo = async (admin) => {
    try {
      await updateVendedor(admin.id, { activo: !admin.activo });
      await fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar estado');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este administrador?')) return;
    try {
      await deleteVendedor(id);
      await fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar administrador');
    }
  };

  const modalTitle = editingId
    ? 'Editar administrador'
    : modalMode === 'invitar'
      ? 'Enviar invitación'
      : 'Nuevo administrador';

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-ink">Administradores</h1>
          <p className="text-gray-600 text-sm mt-1">
            Crea cuentas de administrador para gestionar eventos, vendedores y reportes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleOpenModal('invitar')}
            className="border border-primary text-primary px-5 py-2 rounded-md hover:bg-primary/5 transition font-600"
          >
            Enviar invitación
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal('crear')}
            className="bg-primary text-white px-5 py-2 rounded-md hover:bg-primary-dark transition font-600"
          >
            + Nuevo administrador
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">{success}</div>}

      {admins.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay administradores. Crea uno para delegar la gestión del sistema.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Usuario</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Email</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Estado</th>
                <th className="px-6 py-3 text-center text-sm font-bold text-ink">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-ink font-600">{a.nombre_completo}</td>
                  <td className="px-6 py-4 text-sm text-body">{a.username}</td>
                  <td className="px-6 py-4 text-sm text-body">{a.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-xs px-2 py-1 rounded ${
                        a.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      {a.invitacion_pendiente && (
                        <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                          Invitación pendiente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button type="button" onClick={() => handleOpenModal('crear', a)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-600 hover:bg-blue-200 transition">
                        Editar
                      </button>
                      {a.invitacion_pendiente && (
                        <button type="button" onClick={() => handleReenviar(a)} disabled={reenviandoId === a.id} className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm font-600 hover:bg-purple-200 transition disabled:opacity-50">
                          {reenviandoId === a.id ? 'Enviando…' : 'Reenviar invitación'}
                        </button>
                      )}
                      <button type="button" onClick={() => handleToggleActivo(a)} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-600 hover:bg-yellow-200 transition">
                        {a.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      {a.activo && (
                        <button type="button" onClick={() => handleDelete(a.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-600 hover:bg-red-200 transition">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editingId && modalMode === 'invitar' && (
            <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-md p-3">
              Se enviará un correo para que el administrador cree su contraseña.
            </p>
          )}
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Nombre completo *</label>
            <input type="text" value={formData.nombre_completo} onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Usuario *</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100" required disabled={!!editingId} />
          </div>
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Email *</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          {(modalMode === 'crear' || editingId) && (
            <div>
              <label className="block text-sm font-600 text-ink mb-2">
                Contraseña {editingId ? '(dejar vacío para no cambiar)' : '*'}
              </label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required={!editingId && modalMode === 'crear'} />
              {!editingId && modalMode === 'crear' && <PasswordRequirements password={formData.password} />}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2 text-body border border-gray-300 rounded-md hover:bg-gray-50 transition font-600">Cancelar</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600 disabled:opacity-50">
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : modalMode === 'invitar' ? 'Enviar invitación' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
