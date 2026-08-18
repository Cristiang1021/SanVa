import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFunciones, getEvento, createFuncion, updateFuncion, deleteFuncion } from '../../api';
import Modal from '../../components/Modal';

export default function AdminFunciones() {
  const { eventoId } = useParams();
  const navigate = useNavigate();
  const [evento, setEvento] = useState(null);
  const [funciones, setFunciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha_hora: '',
    lugar: '',
  });

  useEffect(() => {
    if (eventoId) {
      fetchData();
    }
  }, [eventoId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventoRes, funcionesRes] = await Promise.all([
        getEvento(eventoId),
        getFunciones(eventoId),
      ]);
      setEvento(eventoRes.data.evento);
      setFunciones(funcionesRes.data.funciones || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (funcion = null) => {
    if (funcion) {
      setEditingId(funcion.id);
      // Convertir formato ISO a datetime-local (YYYY-MM-DDTHH:MM)
      const fechaLocal = funcion.fecha_hora ? new Date(funcion.fecha_hora).toISOString().slice(0, 16) : '';
      setFormData({
        fecha_hora: fechaLocal,
        lugar: funcion.lugar,
      });
    } else {
      setEditingId(null);
      setFormData({ fecha_hora: '', lugar: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = {
        evento_id: parseInt(eventoId),
        fecha_hora: formData.fecha_hora ? new Date(formData.fecha_hora).toISOString() : '',
        lugar: formData.lugar,
      };
      if (editingId) {
        await updateFuncion(editingId, data);
      } else {
        await createFuncion(data);
      }
      await fetchData();
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar función');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta función?')) {
      try {
        await deleteFuncion(id);
        await fetchData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar función');
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="w-full">
      <div className="mb-8">
        <button onClick={() => navigate('/admin/eventos')} className="text-primary hover:underline font-600 mb-4">
          ← Volver a Eventos
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-ink">{evento?.nombre}</h1>
            <p className="text-body mt-2">Funciones</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition font-600"
          >
            + Nueva Función
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {funciones.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay funciones. Crea una para comenzar.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Fecha y Hora</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Lugar</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-ink">Estado</th>
                <th className="px-6 py-3 text-center text-sm font-bold text-ink">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {funciones.map((funcion) => (
                <tr key={funcion.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-body">
                    {new Date(funcion.fecha_hora).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-body">{funcion.lugar}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded ${funcion.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {funcion.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2 justify-center">
                    <button
                      onClick={() => navigate(`/admin/secciones/${funcion.id}`)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-600"
                    >
                      Secciones
                    </button>
                    <button
                      onClick={() => handleOpenModal(funcion)}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition text-sm font-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(funcion.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-600"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} title={editingId ? 'Editar Función' : 'Nueva Función'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Fecha y Hora *</label>
            <input
              type="datetime-local"
              value={formData.fecha_hora}
              onChange={(e) => setFormData({ ...formData, fecha_hora: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Lugar *</label>
            <input
              type="text"
              value={formData.lugar}
              onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
              placeholder="Teatro Nacional"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-6 py-2 text-body border border-gray-300 rounded-md hover:bg-gray-50 transition font-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600"
            >
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
