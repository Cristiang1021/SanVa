import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFuncion,
  getSecciones,
  getAsientos,
  createSeccion,
  updateSeccion,
  generarAsientos,
  deleteAsientosPorSeccion,
  bloquearAsiento,
} from '../../api';
import Modal from '../../components/Modal';
import SeatGrid from '../../components/SeatGrid';
import SeatLegend from '../../components/SeatLegend';

export default function AdminSecciones() {
  const { funcionId } = useParams();
  const navigate = useNavigate();
  const [funcion, setFuncion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [selectedSeccionId, setSelectedSeccionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [generarModalOpen, setGenerarModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    evento_id: null,
    nombre: '',
    precio: '',
    color: '#3B82F6',
    capacidad: '',
  });
  const [generarData, setGenerarData] = useState({
    filas: 5,
    asientosPorFila: 10,
    inicioFila: 'A',
  });

  useEffect(() => {
    // Para esta implementación simplificada, cargamos secciones de forma estática
    // En producción, esto vendrá del endpoint de secciones del evento
    fetchData();
  }, [funcionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const funcionRes = await getFuncion(funcionId);
      const eventoId = funcionRes.data.funcion.evento_id;
      setFuncion(funcionRes.data.funcion);
      setFormData(prev => ({ ...prev, evento_id: eventoId }));

      const seccionesRes = await getSecciones(eventoId);
      setSecciones(seccionesRes.data.secciones || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSeccion = async (seccionId) => {
    setSelectedSeccionId(seccionId);
    try {
      const response = await getAsientos(seccionId);
      setAsientos(response.data.asientos || []);
    } catch (err) {
      setError('Error al cargar asientos');
    }
  };

  const handleGenerarAsientos = async (e) => {
    e.preventDefault();
    try {
      await generarAsientos(selectedSeccionId, generarData);
      await handleSelectSeccion(selectedSeccionId);
      setGenerarModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar asientos');
    }
  };

  const handleDeleteAsientos = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar todos los asientos de esta sección?')) {
      try {
        await deleteAsientosPorSeccion(selectedSeccionId);
        setAsientos([]);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar asientos');
      }
    }
  };

  const handleToggleBloqueo = async (asiento) => {
    if (asiento.estado === 'vendido' || asiento.estado === 'reservado') return;
    try {
      await bloquearAsiento(asiento.id);
      await handleSelectSeccion(selectedSeccionId);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al bloquear/desbloquear asiento');
    }
  };

  const handleOpenSeccionModal = (seccion = null) => {
    if (seccion) {
      setEditingId(seccion.id);
      setFormData({
        evento_id: seccion.evento_id || funcion.evento_id,
        nombre: seccion.nombre,
        precio: seccion.precio,
        color: seccion.color,
        capacidad: seccion.capacidad,
      });
    } else {
      setEditingId(null);
      setFormData({
        evento_id: funcion.evento_id,
        nombre: '',
        precio: '',
        color: '#3B82F6',
        capacidad: '',
      });
    }
    setModalOpen(true);
  };

  const handleSaveSeccion = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        precio: parseFloat(formData.precio),
        capacidad: parseInt(formData.capacidad),
      };
      if (editingId) {
        await updateSeccion(editingId, data);
      } else {
        await createSeccion(data);
      }
      await fetchData();
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar sección');
    }
  };

  const handleDeleteSeccion = async (seccionId, nombre) => {
    if (confirm(`¿Eliminar sección "${nombre}"? Esto también eliminará todos los asientos asociados.`)) {
      try {
        // Primero eliminar los asientos de la sección
        await deleteAsientosPorSeccion(seccionId);
        // Después eliminar la sección (cambiarla a inactiva)
        await updateSeccion(seccionId, { activo: false });
        await fetchData();
        setSelectedSeccionId(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar sección');
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="w-full">
      <button onClick={() => funcion && navigate(`/admin/funciones/${funcion.evento_id}`)} className="text-primary hover:underline font-600 mb-4">
        ← Volver a Funciones
      </button>

      <h1 className="text-4xl font-bold text-ink mb-8">Secciones y Asientos - Función {funcion?.lugar}</h1>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Secciones */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-ink">Secciones</h2>
            <button
              onClick={() => handleOpenSeccionModal()}
              className="bg-primary text-white px-3 py-1 rounded text-sm font-600 hover:bg-primary-dark transition"
            >
              + Nueva
            </button>
          </div>
          <div className="space-y-2">
            {secciones.map((seccion) => (
              <div
                key={seccion.id}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedSeccionId === seccion.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  onClick={() => handleSelectSeccion(seccion.id)}
                  className="w-full text-left mb-3 hover:opacity-80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: seccion.color }}></div>
                    <div>
                      <h3 className="font-bold text-ink">{seccion.nombre}</h3>
                      <p className="text-xs text-gray-500">${seccion.precio} x {seccion.asientos?.length || 0} asientos</p>
                    </div>
                  </div>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenSeccionModal(seccion)}
                    className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-600 hover:bg-blue-200 transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDeleteSeccion(seccion.id, seccion.nombre)}
                    className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-600 hover:bg-red-200 transition"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de Asientos */}
        <div className="lg:col-span-2">
          {selectedSeccionId ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-ink">Asientos</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenerarModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-600 text-sm"
                  >
                    Generar
                  </button>
                  <button
                    onClick={handleDeleteAsientos}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-600 text-sm"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-body mb-4">
                  Toca un asiento verde para <span className="font-600">bloquearlo</span> (no se venderá)
                  o uno gris para <span className="font-600">desbloquearlo</span>.
                </p>
                <div className="mb-4 max-w-xs">
                  <SeatLegend showSelected={false} />
                </div>
                <SeatGrid
                  asientos={asientos}
                  mode="admin"
                  onSelectAsiento={handleToggleBloqueo}
                />
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-center text-gray-500">
              Selecciona una sección para ver sus asientos
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear/editar sección */}
      <Modal
        isOpen={modalOpen}
        title={editingId ? 'Editar Sección' : 'Nueva Sección'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSaveSeccion} className="space-y-4">
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Platea, Palco 1, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Precio *</label>
            <input
              type="number"
              step="0.01"
              value={formData.precio}
              onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Capacidad *</label>
            <input
              type="number"
              value={formData.capacidad}
              onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
              placeholder="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Color</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
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

      {/* Modal para generar asientos */}
      <Modal
        isOpen={generarModalOpen}
        title="Generar Asientos"
        onClose={() => setGenerarModalOpen(false)}
      >
        <form onSubmit={handleGenerarAsientos} className="space-y-4">
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Número de Filas</label>
            <input
              type="number"
              value={generarData.filas}
              onChange={(e) => setGenerarData({ ...generarData, filas: parseInt(e.target.value) })}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Asientos por Fila</label>
            <input
              type="number"
              value={generarData.asientosPorFila}
              onChange={(e) => setGenerarData({ ...generarData, asientosPorFila: parseInt(e.target.value) })}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-600 text-ink mb-2">Inicial Fila</label>
            <input
              type="text"
              value={generarData.inicioFila}
              onChange={(e) => setGenerarData({ ...generarData, inicioFila: e.target.value.toUpperCase() })}
              maxLength="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setGenerarModalOpen(false)}
              className="px-6 py-2 text-body border border-gray-300 rounded-md hover:bg-gray-50 transition font-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600"
            >
              Generar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
