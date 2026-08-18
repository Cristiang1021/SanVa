import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEstadoFuncion,
  getAsientos,
  registrarVenta,
  reservarAsiento,
  liberarAsiento,
} from '../../api';
import TheaterMap from '../../components/TheaterMap';
import SeatLegend from '../../components/SeatLegend';
import Modal from '../../components/Modal';

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function seatLabel(asiento) {
  if (!asiento) return '';
  const prefix = (asiento.fila || '').toLowerCase();
  if (prefix.length === 1 && /[a-z]/.test(prefix) && !['p', 'v', 'z'].includes(prefix)) {
    return `${asiento.fila}${asiento.numero}`;
  }
  const p = ['p', 'v', 'z'].includes(prefix) ? prefix : 'p';
  return `${p}${String(asiento.numero).padStart(2, '0')}`;
}

const EMPTY_CLIENTE = {
  cliente_nombre: '',
  cliente_tel: '',
  cliente_email: '',
  metodo_pago: 'efectivo',
  referencia_pago: '',
};

export default function VendedorVenta() {
  const { funcionId } = useParams();
  const navigate = useNavigate();
  const [funcion, setFuncion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [selectedSeccionId, setSelectedSeccionId] = useState(null);
  const [cart, setCart] = useState([]); // { id, fila, numero, seccionId, seccionNombre, precio, reservado_hasta }
  const [mapView, setMapView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [loadingAsientos, setLoadingAsientos] = useState(false);
  const [error, setError] = useState('');
  const [ventaModalOpen, setVentaModalOpen] = useState(false);
  const [ventaData, setVentaData] = useState(EMPTY_CLIENTE);
  const [enviando, setEnviando] = useState(false);
  const [reservando, setReservando] = useState(false);
  const [countdown, setCountdown] = useState('');
  const cartRef = useRef([]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    fetchData();
  }, [funcionId]);

  useEffect(() => {
    if (selectedSeccionId && mapView === 'seats') {
      fetchAsientos(selectedSeccionId);
      const poll = setInterval(() => fetchAsientos(selectedSeccionId, true), 10000);
      return () => clearInterval(poll);
    }
  }, [selectedSeccionId, mapView]);

  // Countdown basado en la reserva que expire primero
  useEffect(() => {
    if (!cart.length) {
      setCountdown('');
      return;
    }
    const tick = () => {
      const minHasta = Math.min(
        ...cart.map((c) => new Date(c.reservado_hasta).getTime())
      );
      const left = minHasta - Date.now();
      setCountdown(formatCountdown(left));
      if (left <= 0) {
        setError('Una o más reservas expiraron. Vuelve a seleccionar los asientos.');
        liberarTodoCarrito();
        setVentaModalOpen(false);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cart]);

  useEffect(() => {
    return () => {
      cartRef.current.forEach((item) => {
        liberarAsiento(item.id).catch(() => {});
      });
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getEstadoFuncion(funcionId);
      setFuncion(response.data.funcion);
      setSecciones(response.data.secciones || []);
      setSelectedSeccionId(null);
      setMapView('overview');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAsientos = async (seccionId, silent = false) => {
    try {
      if (!silent) setLoadingAsientos(true);
      const response = await getAsientos(seccionId);
      setAsientos(response.data.asientos || []);
    } catch {
      if (!silent) setError('Error al cargar asientos');
    } finally {
      if (!silent) setLoadingAsientos(false);
    }
  };

  const liberarTodoCarrito = useCallback(async () => {
    const items = [...cartRef.current];
    setCart([]);
    cartRef.current = [];
    await Promise.all(items.map((item) => liberarAsiento(item.id).catch(() => {})));
  }, []);

  const handleSelectSeccion = async (seccion) => {
    if (!seccion) {
      setVentaModalOpen(false);
      await liberarTodoCarrito();
      setSelectedSeccionId(null);
      if (selectedSeccionId) await fetchAsientos(selectedSeccionId, true);
      return;
    }
    setSelectedSeccionId(seccion.id);
  };

  const removeFromCart = async (asientoId) => {
    setCart((prev) => prev.filter((c) => c.id !== asientoId));
    try {
      await liberarAsiento(asientoId);
    } catch {
      // ignore
    }
    if (selectedSeccionId) await fetchAsientos(selectedSeccionId, true);
  };

  const handleSelectAsiento = async (asiento) => {
    if (reservando) return;

    // Si ya está en el carrito, quitarlo
    if (cart.some((c) => c.id === asiento.id)) {
      await removeFromCart(asiento.id);
      return;
    }

    if (asiento.estado !== 'disponible') return;

    setReservando(true);
    setError('');
    try {
      const res = await reservarAsiento(asiento.id);
      const seccion = secciones.find((s) => s.id === selectedSeccionId);
      setCart((prev) => [
        ...prev,
        {
          id: asiento.id,
          fila: asiento.fila,
          numero: asiento.numero,
          seccionId: selectedSeccionId,
          seccionNombre: seccion?.nombre || '',
          precio: Number(seccion?.precio || 0),
          reservado_hasta: res.data.reservado_hasta,
        },
      ]);
      await fetchAsientos(selectedSeccionId, true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reservar el asiento');
      await fetchAsientos(selectedSeccionId, true);
    } finally {
      setReservando(false);
    }
  };

  const openVentaModal = () => {
    if (!cart.length) return;
    setVentaModalOpen(true);
  };

  const closeVentaModal = (release = false) => {
    setVentaModalOpen(false);
    if (release) {
      liberarTodoCarrito().then(() => {
        if (selectedSeccionId) fetchAsientos(selectedSeccionId, true);
      });
    }
  };

  const handleRegistrarVenta = async (e) => {
    e.preventDefault();
    if (!cart.length) return;

    if (ventaData.metodo_pago === 'transferencia' && !ventaData.referencia_pago.trim()) {
      setError('Ingresa el número de transferencia.');
      return;
    }

    setEnviando(true);
    setError('');
    try {
      await registrarVenta({
        funcion_id: parseInt(funcionId),
        asiento_ids: cart.map((c) => c.id),
        cliente_nombre: ventaData.cliente_nombre,
        cliente_tel: ventaData.cliente_tel,
        cliente_email: ventaData.cliente_email,
        metodo_pago: ventaData.metodo_pago,
        referencia_pago: ventaData.referencia_pago,
      });
      setCart([]);
      cartRef.current = [];
      setVentaModalOpen(false);
      // Conservar datos del cliente para la siguiente venta
      setVentaData((prev) => ({
        ...prev,
        referencia_pago: '',
      }));
      if (selectedSeccionId) await fetchAsientos(selectedSeccionId);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar venta');
      if (selectedSeccionId) await fetchAsientos(selectedSeccionId, true);
    } finally {
      setEnviando(false);
    }
  };

  const limpiarCliente = () => setVentaData(EMPTY_CLIENTE);

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  const selectedSeccion = secciones.find((s) => s.id === selectedSeccionId);
  const disponibles = asientos.filter((a) => a.estado === 'disponible').length;
  const selectedIds = cart.map((c) => c.id);
  const totalCarrito = cart.reduce((s, c) => s + c.precio, 0);

  return (
    <div className="w-full">
      <button onClick={() => navigate('/vendedor')} className="text-primary hover:underline font-600 mb-4">
        ← Volver
      </button>

      <h1 className="text-4xl font-bold text-ink mb-2">Venta de Boletos</h1>
      {funcion && (
        <p className="text-body mb-6">
          {funcion.evento?.nombre} — {funcion.lugar}
        </p>
      )}

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        <TheaterMap
          secciones={secciones}
          asientos={asientos}
          selectedSeccionId={selectedSeccionId}
          selectedAsientoIds={selectedIds}
          onSelectSeccion={handleSelectSeccion}
          onSelectAsiento={handleSelectAsiento}
          view={mapView}
          onChangeView={setMapView}
          loadingAsientos={loadingAsientos || reservando}
        />

        <div className="space-y-4">
          <SeatLegend />

          {selectedSeccion && mapView === 'seats' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-bold text-ink mb-1">{selectedSeccion.nombre}</h3>
              <p className="text-sm text-primary mb-2">
                Precio: <span className="font-bold">${selectedSeccion.precio}</span>
              </p>
              <p className="text-xs text-gray-500">
                {disponibles} disponibles de {asientos.length}
              </p>
            </div>
          )}

          {/* Carrito de asientos */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-ink">Selección</h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    liberarTodoCarrito().then(() => {
                      if (selectedSeccionId) fetchAsientos(selectedSeccionId, true);
                    })
                  }
                  className="text-xs text-primary hover:underline font-600"
                >
                  Limpiar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-gray-500">
                Toca asientos verdes para agregarlos. Puedes elegir varios antes de registrar.
              </p>
            ) : (
              <>
                <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {cart.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <span className="text-ink font-600 truncate">
                        {item.seccionNombre} · {seatLabel(item)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500 tabular-nums">${item.precio.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-primary text-xs font-bold hover:underline"
                          title="Quitar"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between text-sm font-bold text-ink mb-2">
                  <span>{cart.length} entrada{cart.length > 1 ? 's' : ''}</span>
                  <span>${totalCarrito.toFixed(2)}</span>
                </div>
                {countdown && (
                  <p className="text-xs text-amber-700 font-600 mb-2">
                    Reserva · se libera en {countdown}
                  </p>
                )}
                <button
                  type="button"
                  onClick={openVentaModal}
                  className="w-full px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600 text-sm"
                >
                  Registrar venta
                </button>
              </>
            )}
          </div>

          {ventaData.cliente_nombre && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs text-gray-500">Cliente guardado</p>
                  <p className="text-sm font-600 text-ink">{ventaData.cliente_nombre}</p>
                </div>
                <button
                  type="button"
                  onClick={limpiarCliente}
                  className="text-xs text-gray-500 hover:text-primary font-600"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={ventaModalOpen}
        title={cart.length > 1 ? `Registrar ${cart.length} entradas` : 'Registrar Venta'}
        onClose={() => closeVentaModal(false)}
        size="3xl"
      >
        <form onSubmit={handleRegistrarVenta}>
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
            {/* Resumen asientos */}
            <aside className="bg-green-50 border border-green-200 rounded-lg p-4 h-fit">
              <p className="text-sm text-green-800 font-600 mb-2">Asientos</p>
              <ul className="space-y-1 mb-3">
                {cart.map((c) => (
                  <li key={c.id} className="text-sm text-green-800 flex justify-between gap-2">
                    <span className="truncate">
                      {c.seccionNombre} {seatLabel(c)}
                    </span>
                    <span className="tabular-nums shrink-0">${c.precio.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-base font-bold text-ink border-t border-green-200 pt-2">
                Total: ${totalCarrito.toFixed(2)}
              </p>
              {countdown && (
                <p className="text-xs text-amber-700 mt-2 font-600">
                  Reservado · se libera en {countdown}
                </p>
              )}
            </aside>

            {/* Datos cliente */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-600 text-ink mb-1.5">Nombre Cliente *</label>
                <input
                  type="text"
                  value={ventaData.cliente_nombre}
                  onChange={(e) => setVentaData({ ...ventaData, cliente_nombre: e.target.value })}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-600 text-ink mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={ventaData.cliente_tel}
                    onChange={(e) => setVentaData({ ...ventaData, cliente_tel: e.target.value })}
                    placeholder="123456789"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-600 text-ink mb-1.5">Email</label>
                  <input
                    type="email"
                    value={ventaData.cliente_email}
                    onChange={(e) => setVentaData({ ...ventaData, cliente_email: e.target.value })}
                    placeholder="juan@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-600 text-ink mb-1.5">Método de Pago *</label>
                  <select
                    value={ventaData.metodo_pago}
                    onChange={(e) =>
                      setVentaData({
                        ...ventaData,
                        metodo_pago: e.target.value,
                        referencia_pago:
                          e.target.value === 'transferencia' ? ventaData.referencia_pago : '',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                {ventaData.metodo_pago === 'transferencia' ? (
                  <div>
                    <label className="block text-sm font-600 text-ink mb-1.5">
                      Nº de transferencia *
                    </label>
                    <input
                      type="text"
                      value={ventaData.referencia_pago}
                      onChange={(e) =>
                        setVentaData({ ...ventaData, referencia_pago: e.target.value })
                      }
                      placeholder="Ej. 0012345678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => closeVentaModal(false)}
                  className="px-5 py-2 text-body border border-gray-300 rounded-md hover:bg-gray-50 transition font-600"
                >
                  Volver al mapa
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-5 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600 disabled:bg-gray-400"
                >
                  {enviando
                    ? 'Registrando...'
                    : cart.length > 1
                      ? `Confirmar ${cart.length} entradas`
                      : 'Confirmar Venta'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
