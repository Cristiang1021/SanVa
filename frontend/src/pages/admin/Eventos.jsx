import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventos, createEvento, updateEvento, deleteEvento, inicializarTeatro, mediaUrl } from '../../api';
import Modal from '../../components/Modal';
import FechaUnicaPicker from '../../components/FechaUnicaPicker';

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  fecha_unica_activa: false,
  fecha_unica: '',
  hora_unica: '20:00',
  imagen: null,
};

function formatFechaUnica(evento) {
  if (!evento.fecha_unica) return null;
  const fecha = new Date(evento.fecha_unica + 'T12:00:00');
  const fechaTxt = fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return evento.hora_unica ? `${fechaTxt} · ${evento.hora_unica}` : fechaTxt;
}

export default function AdminEventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inicializando, setInicializando] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      const response = await getEventos();
      setEventos(response.data.eventos || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (evento = null) => {
    if (evento) {
      setEditingId(evento.id);
      setFormData({
        nombre: evento.nombre || '',
        descripcion: evento.descripcion || '',
        fecha_unica_activa: Boolean(evento.fecha_unica),
        fecha_unica: evento.fecha_unica || '',
        hora_unica: evento.hora_unica || '20:00',
        imagen: null,
      });
      setPreviewUrl(mediaUrl(evento.imagen_url));
    } else {
      setEditingId(null);
      setFormData(EMPTY_FORM);
      setPreviewUrl(null);
    }
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData({ ...formData, imagen: file });
    setPreviewUrl(URL.createObjectURL(file));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('nombre', formData.nombre);
    fd.append('descripcion', formData.descripcion || '');
    if (formData.fecha_unica_activa && formData.fecha_unica && formData.hora_unica) {
      fd.append('fecha_unica', formData.fecha_unica);
      fd.append('hora_unica', formData.hora_unica);
    } else {
      fd.append('fecha_unica', '');
      fd.append('hora_unica', '');
    }
    if (formData.imagen) {
      fd.append('imagen', formData.imagen);
    }
    return fd;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.fecha_unica_activa && (!formData.fecha_unica || !formData.hora_unica)) {
      setError('Elige fecha y hora para el evento de fecha única.');
      return;
    }
    try {
      const payload = buildFormData();
      if (editingId) {
        await updateEvento(editingId, payload);
      } else {
        await createEvento(payload);
      }
      await fetchEventos();
      setModalOpen(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar evento');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
      try {
        await deleteEvento(id);
        await fetchEventos();
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar evento');
      }
    }
  };

  const handleInicializarTeatro = async (id) => {
    if (confirm('¿Inicializar teatro con 4 secciones y todos los asientos según los croquis?')) {
      try {
        setInicializando(id);
        await inicializarTeatro(id);
        await fetchEventos();
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Error al inicializar teatro');
      } finally {
        setInicializando(null);
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-ink">Eventos</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition font-600"
        >
          + Nuevo Evento
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      {eventos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay eventos. Crea uno para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map((evento) => (
            <div key={evento.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition">
              {evento.imagen_url ? (
                <img
                  src={mediaUrl(evento.imagen_url)}
                  alt={evento.nombre}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-surface-dark flex items-center justify-center">
                  <span className="text-white/40 text-sm">Sin imagen</span>
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-bold text-ink mb-2">{evento.nombre}</h2>
                <p className="text-body mb-3 line-clamp-2">{evento.descripcion}</p>
                {evento.fecha_unica && (
                  <p className="text-sm text-primary font-600 mb-3">
                    Fecha única: {formatFechaUnica(evento)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded ${evento.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {evento.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {evento.secciones?.length || 0} secciones
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {evento.funciones?.length || 0} funciones
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {evento.secciones?.length === 0 && (
                    <button
                      onClick={() => handleInicializarTeatro(evento.id)}
                      disabled={inicializando === evento.id}
                      className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition text-sm font-600 disabled:opacity-50"
                    >
                      {inicializando === evento.id ? 'Inicializando...' : 'Inicializar Teatro'}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(evento)}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => navigate(`/admin/funciones/${evento.id}`)}
                      className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm font-600"
                    >
                      Funciones
                    </button>
                    <button
                      onClick={() => handleDelete(evento.id)}
                      className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        title={editingId ? 'Editar Evento' : 'Nuevo Evento'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Romeo y Julieta"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del evento..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Imagen del evento</label>
            {previewUrl && (
              <img src={previewUrl} alt="Vista previa" className="w-full h-36 object-cover rounded-md mb-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-body file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-white file:font-600 hover:file:bg-primary-dark"
            />
          </div>

          <FechaUnicaPicker
            enabled={formData.fecha_unica_activa}
            onEnabledChange={(on) =>
              setFormData({
                ...formData,
                fecha_unica_activa: on,
                fecha_unica: on ? formData.fecha_unica : '',
                hora_unica: on ? formData.hora_unica || '20:00' : '20:00',
              })
            }
            fecha={formData.fecha_unica}
            hora={formData.hora_unica}
            onFechaChange={(fecha_unica) => setFormData({ ...formData, fecha_unica })}
            onHoraChange={(hora_unica) => setFormData({ ...formData, hora_unica })}
          />

          <div className="flex gap-3 justify-end pt-2 sticky bottom-0 bg-white pb-1">
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
