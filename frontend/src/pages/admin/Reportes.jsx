import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReporteVentas, getReporteRanking, downloadReporteVentasPdf, downloadRankingPdf, cancelarVenta } from '../../api';
import { descargarPdf } from '../../utils/download';
import ListaEntradaPanel from '../../components/ListaEntradaPanel';

export default function AdminReportes() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return t === 'entrada' ? 'entrada' : 'ventas';
  });
  const [reporteVentas, setReporteVentas] = useState(null);
  const [reporteRanking, setReporteRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descargando, setDescargando] = useState('');
  const [cancelandoId, setCancelandoId] = useState(null);

  useEffect(() => {
    fetchReportes();
  }, []);

  const fetchReportes = async (inicio = '', fin = '') => {
    try {
      setLoading(true);
      const [ventasRes, rankingRes] = await Promise.all([
        getReporteVentas({
          ...(inicio && { fecha_inicio: inicio }),
          ...(fin && { fecha_fin: fin }),
        }),
        getReporteRanking(),
      ]);
      setReporteVentas(ventasRes.data);
      setReporteRanking(rankingRes.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    fetchReportes(fechaInicio, fechaFin);
  };

  const handleCancelarVenta = async (venta) => {
    const asiento = venta.asiento
      ? `${venta.asiento.fila || ''}${venta.asiento.numero || ''}`
      : '—';
    const msg = `¿Cancelar la venta #${venta.id}?\n\nCliente: ${venta.cliente_nombre}\nAsiento: ${asiento}\n\nEl asiento quedará disponible de nuevo.`;
    if (!confirm(msg)) return;

    try {
      setCancelandoId(venta.id);
      setError('');
      await cancelarVenta(venta.id);
      await fetchReportes(fechaInicio, fechaFin);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar venta');
    } finally {
      setCancelandoId(null);
    }
  };

  const filtros = {
    ...(fechaInicio && { fecha_inicio: fechaInicio }),
    ...(fechaFin && { fecha_fin: fechaFin }),
  };

  const handleDescargarVentas = async () => {
    setDescargando('ventas');
    setError('');
    try {
      await descargarPdf(downloadReporteVentasPdf(filtros), 'reporte-ventas.pdf');
    } catch {
      setError('No se pudo descargar el reporte de ventas.');
    } finally {
      setDescargando('');
    }
  };

  const handleDescargarRanking = async () => {
    setDescargando('ranking');
    setError('');
    try {
      await descargarPdf(downloadRankingPdf(filtros), 'ranking-vendedores.pdf');
    } catch {
      setError('No se pudo descargar el ranking.');
    } finally {
      setDescargando('');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando reportes...</div>;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-4xl font-bold text-ink">Reportes</h1>
        {tab !== 'entrada' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDescargarVentas}
              disabled={!!descargando}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600 text-sm disabled:bg-gray-400"
            >
              {descargando === 'ventas' ? 'Descargando…' : 'Descargar ventas PDF'}
            </button>
            <button
              type="button"
              onClick={handleDescargarRanking}
              disabled={!!descargando}
              className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/5 transition font-600 text-sm disabled:opacity-50"
            >
              {descargando === 'ranking' ? 'Descargando…' : 'Descargar ranking PDF'}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: 'ventas', label: 'Ventas' },
          { id: 'ranking', label: 'Ranking' },
          { id: 'entrada', label: 'Lista de entrada' },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-600 border-b-2 -mb-px transition ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {tab === 'entrada' ? (
        <ListaEntradaPanel allowDownload />
      ) : (
        <>
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-ink mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-600 text-ink mb-2">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFiltrar}
              className="w-full px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition font-600"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {reporteVentas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-600 mb-2">Total Ventas</p>
            <p className="text-4xl font-bold text-primary">${reporteVentas.total?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-gray-500 mt-2">{reporteVentas.cantidad} transacciones</p>
          </div>
        </div>
      )}

      {/* Tabla Ventas */}
      {reporteVentas?.ventas && reporteVentas.ventas.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-ink">Ventas Registradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Vendedor</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Asiento</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Pago</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Monto</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Fecha</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-ink">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reporteVentas.ventas.map((venta) => (
                  <tr key={venta.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-body">{venta.cliente_nombre}</td>
                    <td className="px-6 py-4 text-body">{venta.vendedor?.nombre_completo}</td>
                    <td className="px-6 py-4 text-body">{venta.asiento?.fila}{venta.asiento?.numero}</td>
                    <td className="px-6 py-4 text-body text-sm capitalize">
                      {venta.metodo_pago || '—'}
                      {venta.referencia_pago && (
                        <span className="block text-xs text-gray-500 font-mono">
                          Ref: {venta.referencia_pago}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-body font-bold">${venta.precio_unitario?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-body">{new Date(venta.fecha_venta).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
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
      ) : null}

      {/* Ranking Vendedores */}
      {reporteRanking?.ranking && reporteRanking.ranking.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-ink">Ranking de Vendedores</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Posición</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Vendedor</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Ventas</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Total</th>
                </tr>
              </thead>
              <tbody>
                {reporteRanking.ranking.map((item, index) => (
                  <tr key={item.vendedor.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full font-bold text-sm">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body">{item.vendedor.nombre_completo}</td>
                    <td className="px-6 py-4 text-body">{item.cantidad_ventas}</td>
                    <td className="px-6 py-4 text-body font-bold">${item.total_vendido?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}
