import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventos, getFunciones, mediaUrl } from '../../api';

export default function VendedorInicio() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [selectedEventoId, setSelectedEventoId] = useState(null);
  const [funciones, setFunciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      const response = await getEventos();
      const eventosActivos = (response.data.eventos || []).filter((e) => e.activo);
      setEventos(eventosActivos);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvento = async (eventoId) => {
    setSelectedEventoId(eventoId);
    try {
      const response = await getFunciones(eventoId);
      const funcionesActivas = (response.data.funciones || []).filter((f) => f.activo);
      setFunciones(funcionesActivas);
    } catch (err) {
      setError('Error al cargar funciones');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando eventos...</div>;

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-ink mb-8">Vender Boletos</h1>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {eventos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay eventos disponibles en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-ink mb-4">1. Selecciona Evento</h2>
            <div className="space-y-3">
              {eventos.map((evento) => (
                <button
                  key={evento.id}
                  onClick={() => handleSelectEvento(evento.id)}
                  className={`w-full text-left rounded-lg border-2 transition overflow-hidden ${
                    selectedEventoId === evento.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-primary/50'
                  }`}
                >
                  <div className="flex gap-3">
                    {evento.imagen_url ? (
                      <img
                        src={mediaUrl(evento.imagen_url)}
                        alt={evento.nombre}
                        className="w-28 h-24 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-28 h-24 bg-surface-dark shrink-0 flex items-center justify-center">
                        <span className="text-white/30 text-xs">Sin imagen</span>
                      </div>
                    )}
                    <div className="p-3 min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-ink">{evento.nombre}</h3>
                      <p className="text-sm text-body mt-1 line-clamp-2">{evento.descripcion}</p>
                      {evento.fecha_unica && (
                        <p className="text-xs text-primary font-600 mt-1">
                          {new Date(evento.fecha_unica + 'T12:00:00').toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {evento.hora_unica ? ` · ${evento.hora_unica}` : ''}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {evento.funciones?.length || 0} funciones disponibles
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-ink mb-4">2. Selecciona Función</h2>
            {selectedEventoId && funciones.length > 0 ? (
              <div className="space-y-3">
                {funciones.map((funcion) => (
                  <button
                    key={funcion.id}
                    onClick={() => navigate(`/vendedor/venta/${funcion.id}`)}
                    className="w-full text-left p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md hover:border-primary transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-ink">{funcion.lugar}</h3>
                        <p className="text-sm text-body mt-1">
                          {new Date(funcion.fecha_hora).toLocaleString()}
                        </p>
                      </div>
                      <span className="bg-primary text-white px-3 py-1 rounded text-sm font-bold">
                        Vender →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : selectedEventoId ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-700">
                No hay funciones disponibles para este evento.
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-gray-500 text-center">
                Selecciona un evento primero
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
