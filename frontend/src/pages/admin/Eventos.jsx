import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventos, createEvento, updateEvento, deleteEvento, inicializarTeatro, mediaUrl } from '../../api';
import Modal from '../../components/Modal';
import FechaUnicaPicker from '../../components/FechaUnicaPicker';
import { fileToDataUrl } from '../../utils/imagen';

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  fecha_unica_activa: false,
  fecha_unica: '',
  hora_unica: '20:00',
  imagen: null,
  imagen_base64: null,
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
        imagen_base64: null,
      });
      setPreviewUrl(mediaUrl(evento.imagen_url));
    } else {
      setEditingId(null);
      setFormData(EMPTY_FORM);
      setPreviewUrl(null);
    }
    setModalOpen(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setFormData({ ...formData, imagen: file, imagen_base64: dataUrl });
      setPreviewUrl(dataUrl);
      setError('');
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen');
    }
  };

  const buildPayload = () => {
    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || '',
    };
    if (formData.fecha_unica_activa && formData.fecha_unica && formData.hora_unica) {
      payload.fecha_unica = formData.fecha_unica;
      payload.hora_unica = formData.hora_unica;
    } else {
      payload.fecha_unica = '';
      payload.hora_unica = '';
    }
    if (formData.imagen_base64) {
      payload.imagen_base64 = formData.imagen_base64;
    }
    return payload;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.fecha_unica_activa && (!formData.fecha_unica || !formData.hora_unica)) {
      setError('Elige fecha y hora para el evento de fecha única.');
      return;
    }
    try {
      const payload = buildPayload();
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
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-ink sm:text-4xl">Eventos</h1>
        <button
          onClick={() => handleOpenModal()}
          className="w-full rounded-md bg-primary px-6 py-2.5 font-600 text-white transition hover:bg-primary-dark sm:w-auto"
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
                <>
                  <img
                    src={mediaUrl(evento.imagen_url)}
                    alt={evento.nombre}
                    className="w-full h-40 object-cover bg-surface-dark"
                    onError={(e) => {
                      e.currentTarget.classList.add('hidden');
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) {
                        fallback.classList.remove('hidden');
                        fallback.classList.add('flex');
                      }
                    }}
                  />
                  <div className="hidden w-full h-40 bg-surface-dark items-center justify-center">
                    <span className="text-white/40 text-sm">Sin imagen</span>
                  </div>
                </>
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
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleOpenModal(evento)}
                      className="flex-1 rounded px-3 py-2.5 text-sm font-600 text-blue-700 transition hover:bg-blue-200 bg-blue-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => navigate(`/admin/funciones/${evento.id}`)}
                      className="flex-1 rounded px-3 py-2.5 text-sm font-600 text-green-700 transition hover:bg-green-200 bg-green-100"
                    >
                      Funciones
                    </button>
                    <button
                      onClick={() => handleDelete(evento.id)}
                      className="flex-1 rounded px-3 py-2.5 text-sm font-600 text-red-700 transition hover:bg-red-200 bg-red-100"
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
        <form onSubmit={handleSave} className="space-y-4">
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

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-3 sm:-mx-6 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full rounded-md border border-gray-300 px-6 py-2.5 font-600 text-body transition hover:bg-gray-50 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-6 py-2.5 font-600 text-white transition hover:bg-primary-dark sm:w-auto"
            >
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
