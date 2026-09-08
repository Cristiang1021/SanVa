import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getReporteVentas,
  getReporteRanking,
  downloadReporteVentasPdf,
  downloadRankingPdf,
  cancelarVenta,
  getEventos,
  getFunciones,
} from '../../api';
import { descargarPdf } from '../../utils/download';
import ListaEntradaPanel from '../../components/ListaEntradaPanel';
import { useConfirmDialog } from '../../components/useConfirmDialog.jsx';
import {
  agruparVentas,
  seatLabelFromVenta,
} from '../../utils/agruparVentas';

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
  const [eventoId, setEventoId] = useState('');
  const [funcionId, setFuncionId] = useState('');
  const [eventos, setEventos] = useState([]);
  const [funciones, setFunciones] = useState([]);
  const [descargando, setDescargando] = useState('');
  const [cancelandoKey, setCancelandoKey] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchReportes();
    getEventos()
      .then((res) => setEventos(res.data.eventos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventoId) {
      setFunciones([]);
      setFuncionId('');
      return;
    }
    getFunciones(eventoId)
      .then((res) => setFunciones(res.data.funciones || []))
      .catch(() => setFunciones([]));
  }, [eventoId]);

  const grupos = useMemo(
    () => agruparVentas(reporteVentas?.ventas || []),
    [reporteVentas]
  );

  const fetchReportes = async (
    inicio = fechaInicio,
    fin = fechaFin,
    ev = eventoId,
    fn = funcionId
  ) => {
    try {
      setLoading(true);
      const filters = {
        ...(inicio && { fecha_inicio: inicio }),
        ...(fin && { fecha_fin: fin }),
        ...(ev && { evento_id: ev }),
        ...(fn && { funcion_id: fn }),
      };
      const [ventasRes, rankingRes] = await Promise.all([
        getReporteVentas(filters),
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
    fetchReportes(fechaInicio, fechaFin, eventoId, funcionId);
  };

  const cancelarIds = async (ids, key) => {
    try {
      setCancelandoKey(key);
      setError('');
      for (const id of ids) {
        await cancelarVenta(id);
      }
      await fetchReportes();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar venta');
      await fetchReportes();
    } finally {
      setCancelandoKey(null);
    }
  };

  const handleCancelarAsiento = async (venta, cliente) => {
    const asiento = seatLabelFromVenta(venta);
    const ok = await askConfirm({
      title: 'Cancelar asiento',
      confirmLabel: 'Cancelar asiento',
      message: (
        <div className="space-y-3">
          <p>
            Se liberará el asiento <strong className="font-mono">{asiento}</strong>.
          </p>
          <dl className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-gray-500">Cliente</dt>
              <dd className="font-600 text-ink">{cliente}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-gray-500">Monto</dt>
              <dd className="font-600 text-ink">${Number(venta.precio_unitario || 0).toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      ),
    });
    if (!ok) return;
    await cancelarIds([venta.id], `seat-${venta.id}`);
  };

  const handleCancelarGrupo = async (grupo) => {
    const n = grupo.ventas.length;
    const ok = await askConfirm({
      title: 'Cancelar venta',
      confirmLabel: n > 1 ? `Cancelar ${n} asientos` : 'Cancelar',
      message: (
        <div className="space-y-3">
          <p>
            {n > 1
              ? 'Se cancelarán todos los asientos de esta venta.'
              : 'Se cancelará esta venta.'}
          </p>
          <dl className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-gray-500">Cliente</dt>
              <dd className="font-600 text-ink">{grupo.cliente_nombre}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-gray-500">Asientos</dt>
              <dd className="text-right font-mono font-600 text-ink">{grupo.asientosLabel}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-gray-500">Total</dt>
              <dd className="font-600 text-ink">${grupo.total.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      ),
    });
    if (!ok) return;
    await cancelarIds(
      grupo.ventas.map((v) => v.id),
      `group-${grupo.id}`
    );
  };

  const filtros = {
    ...(fechaInicio && { fecha_inicio: fechaInicio }),
    ...(fechaFin && { fecha_fin: fechaFin }),
    ...(eventoId && { evento_id: eventoId }),
    ...(funcionId && { funcion_id: funcionId }),
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-ink">Reportes</h1>
        {tab !== 'entrada' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDescargarVentas}
              disabled={!!descargando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-600 text-white transition hover:bg-primary-dark disabled:bg-gray-400"
            >
              {descargando === 'ventas' ? 'Descargando…' : 'Descargar ventas PDF'}
            </button>
            <button
              type="button"
              onClick={handleDescargarRanking}
              disabled={!!descargando}
              className="rounded-md border border-primary px-4 py-2 text-sm font-600 text-primary transition hover:bg-primary/5 disabled:opacity-50"
            >
              {descargando === 'ranking' ? 'Descargando…' : 'Descargar ranking PDF'}
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {[
          { id: 'ventas', label: 'Ventas' },
          { id: 'ranking', label: 'Ranking' },
          { id: 'entrada', label: 'Lista de entrada' },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-600 transition ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-md bg-red-100 p-4 text-red-700">{error}</div>}

      {tab === 'entrada' ? (
        <ListaEntradaPanel allowDownload />
      ) : (
        <>
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-ink">Filtros</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-600 text-ink">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-600 text-ink">Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-600 text-ink">Evento</label>
                <select
                  value={eventoId}
                  onChange={(e) => {
                    setEventoId(e.target.value);
                    setFuncionId('');
                  }}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-600 text-ink">Función</label>
                <select
                  value={funcionId}
                  onChange={(e) => setFuncionId(e.target.value)}
                  disabled={!eventoId}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{eventoId ? 'Todas' : 'Elige un evento'}</option>
                  {funciones.map((fn) => (
                    <option key={fn.id} value={fn.id}>
                      {fn.fecha_hora
                        ? new Date(fn.fecha_hora).toLocaleString()
                        : `Función ${fn.id}`}
                      {fn.lugar ? ` · ${fn.lugar}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleFiltrar}
                  className="w-full rounded-md bg-primary px-6 py-2 font-600 text-white transition hover:bg-primary-dark"
                >
                  Filtrar
                </button>
              </div>
            </div>
          </div>

          {reporteVentas && (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <p className="mb-2 text-sm font-600 text-gray-600">Total Ventas</p>
                <p className="text-4xl font-bold text-primary">
                  ${reporteVentas.total?.toFixed(2) || '0.00'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {reporteVentas.cantidad} asiento{reporteVentas.cantidad === 1 ? '' : 's'} ·{' '}
                  {grupos.length} venta{grupos.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          )}

          {grupos.length > 0 ? (
            <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h2 className="text-xl font-bold text-ink">Ventas Registradas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Cliente</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Vendedor</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Evento</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Función</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Asientos</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Pago</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Monto</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-ink">Fecha</th>
                      <th className="px-6 py-3 text-center text-sm font-bold text-ink">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((grupo) => {
                      const multi = grupo.ventas.length > 1;
                      const busyGroup = cancelandoKey === `group-${grupo.id}`;

                      return (
                        <tr key={grupo.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 font-600 text-body">{grupo.cliente_nombre}</td>
                          <td className="px-6 py-4 text-body">
                            {grupo.vendedor?.nombre_completo || grupo.vendedor?.username || '—'}
                          </td>
                          <td className="px-6 py-4 text-body">{grupo.funcion?.evento?.nombre || '—'}</td>
                          <td className="px-6 py-4 text-body">
                            {grupo.funcion?.fecha_hora
                              ? new Date(grupo.funcion.fecha_hora).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {grupo.ventas.map((venta) => {
                                const busy = cancelandoKey === `seat-${venta.id}`;
                                const label = seatLabelFromVenta(venta);
                                return (
                                  <button
                                    key={venta.id}
                                    type="button"
                                    aria-label={`Cancelar asiento ${label}`}
                                    disabled={!!cancelandoKey}
                                    onClick={() =>
                                      handleCancelarAsiento(venta, grupo.cliente_nombre)
                                    }
                                    className="group inline-flex items-center gap-1 rounded border border-gray-200 bg-white py-0.5 pl-2 pr-1 font-mono text-sm text-body transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                  >
                                    <span>{busy ? '…' : label}</span>
                                    <span
                                      className="flex h-5 w-5 items-center justify-center rounded text-gray-400 group-hover:text-red-600"
                                      aria-hidden
                                    >
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm capitalize text-body">
                            {grupo.metodo_pago || '—'}
                            {grupo.referencia_pago && (
                              <span className="block font-mono text-xs text-gray-500">
                                Ref: {grupo.referencia_pago}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-body">${grupo.total.toFixed(2)}</td>
                          <td className="px-6 py-4 text-body">
                            {new Date(grupo.fecha_venta).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleCancelarGrupo(grupo)}
                              disabled={!!cancelandoKey}
                              className="rounded bg-red-100 px-3 py-1 text-sm font-600 text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                            >
                              {busyGroup ? 'Cancelando…' : multi ? 'Cancelar venta' : 'Cancelar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === 'ventas' ? (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
              No hay ventas con esos filtros.
            </div>
          ) : null}

          {reporteRanking?.ranking && reporteRanking.ranking.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h2 className="text-xl font-bold text-ink">Ranking de Vendedores</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
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
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-body">{item.vendedor.nombre_completo}</td>
                        <td className="px-6 py-4 text-body">{item.cantidad_ventas}</td>
                        <td className="px-6 py-4 font-bold text-body">
                          ${item.total_vendido?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
      {confirmDialog}
    </div>
  );
}
