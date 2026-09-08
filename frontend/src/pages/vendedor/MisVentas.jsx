import { useEffect, useState } from 'react';
import { getMisVentas, cancelarVenta } from '../../api';

export default function VendedorMisVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelandoId, setCancelandoId] = useState(null);

  useEffect(() => {
    fetchMisVentas();
  }, []);

  const fetchMisVentas = async () => {
    try {
      setLoading(true);
      const response = await getMisVentas();
      setVentas(response.data.ventas || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarVenta = async (venta) => {
    const asiento = venta.asiento
      ? `${venta.asiento.fila ?? ''}${venta.asiento.numero ?? ''}`
      : '—';
    const msg =
      `¿Cancelar esta venta?\n\n` +
      `Cliente: ${venta.cliente_nombre}\n` +
      `Asiento: ${asiento}\n\n` +
      `Solo puedes cancelar tus propias ventas. El asiento quedará disponible.`;

    if (!confirm(msg)) return;

    try {
      setCancelandoId(venta.id);
      setError('');
      await cancelarVenta(venta.id);
      await fetchMisVentas();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar venta');
    } finally {
      setCancelandoId(null);
    }
  };

  const totalVentas = ventas.reduce((sum, v) => sum + (v.precio_unitario || 0), 0);

  if (loading) return <div className="p-8 text-center">Cargando mis ventas...</div>;

  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-ink sm:text-4xl">Mis Ventas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Puedes cancelar únicamente las ventas que registraste tú.
        </p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-600 mb-2">Total Vendido</p>
          <p className="text-4xl font-bold text-primary">${totalVentas.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-600 mb-2">Número de Ventas</p>
          <p className="text-4xl font-bold text-primary">{ventas.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-600 mb-2">Promedio por Venta</p>
          <p className="text-4xl font-bold text-primary">
            ${ventas.length > 0 ? (totalVentas / ventas.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {ventas.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Evento</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Función</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Asiento</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Pago</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Monto</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Fecha</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-ink">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-body font-600">{venta.cliente_nombre}</td>
                    <td className="px-6 py-4 text-body">{venta.funcion?.evento?.nombre}</td>
                    <td className="px-6 py-4 text-body">
                      {new Date(venta.funcion?.fecha_hora).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-body font-mono">
                      {venta.asiento?.fila}
                      {venta.asiento?.numero}
                    </td>
                    <td className="px-6 py-4 text-body text-sm capitalize">
                      {venta.metodo_pago || '—'}
                      {venta.referencia_pago && (
                        <span className="block text-xs text-gray-500 font-mono">
                          Ref: {venta.referencia_pago}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-body font-bold">${venta.precio_unitario?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-body">
                      {new Date(venta.fecha_venta).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleCancelarVenta(venta)}
                        disabled={cancelandoId === venta.id}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-600 disabled:opacity-50"
                      >
                        {cancelandoId === venta.id ? 'Cancelando…' : 'Cancelar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No tienes ventas registradas. ¡Comienza a vender boletos!
        </div>
      )}
    </div>
  );
}
