import { useEffect, useMemo, useState } from 'react';
import { getMisVentas, cancelarVenta } from '../../api';
import { useConfirmDialog } from '../../components/useConfirmDialog.jsx';
import {
  agruparVentas,
  opcionesDesdeVentas,
  seatLabelFromVenta,
} from '../../utils/agruparVentas';

export default function VendedorMisVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelandoKey, setCancelandoKey] = useState(null);
  const [filtroEventoId, setFiltroEventoId] = useState('');
  const [filtroFuncionId, setFiltroFuncionId] = useState('');
  const { askConfirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchMisVentas();
  }, []);

  const { eventos, funciones } = useMemo(() => opcionesDesdeVentas(ventas), [ventas]);

  const funcionesFiltradas = useMemo(() => {
    if (!filtroEventoId) return funciones;
    return funciones.filter((f) => String(f.evento_id) === String(filtroEventoId));
  }, [funciones, filtroEventoId]);

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (filtroEventoId && String(v.funcion?.evento?.id ?? v.funcion?.evento_id) !== String(filtroEventoId)) {
        return false;
      }
      if (filtroFuncionId && String(v.funcion_id) !== String(filtroFuncionId)) {
        return false;
      }
      return true;
    });
  }, [ventas, filtroEventoId, filtroFuncionId]);

  const grupos = useMemo(() => agruparVentas(ventasFiltradas), [ventasFiltradas]);

  const showFilters = eventos.length > 1 || funciones.length > 1;

  const fetchMisVentas = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getMisVentas();
      setVentas(response.data.ventas || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar ventas');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const cancelarIds = async (ids, key) => {
    try {
      setCancelandoKey(key);
      setError('');
      for (const id of ids) {
        await cancelarVenta(id);
      }
      await fetchMisVentas(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar venta');
      await fetchMisVentas(true);
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

  const totalVendido = ventasFiltradas.reduce(
    (sum, v) => sum + (Number(v.precio_unitario) || 0),
    0
  );
  const asientosVendidos = ventasFiltradas.length;
  const promedio = grupos.length > 0 ? totalVendido / grupos.length : 0;

  if (loading) return <div className="p-8 text-center">Cargando mis ventas...</div>;

  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-ink sm:text-4xl">Mis Ventas</h1>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-100 p-4 text-red-700">{error}</div>}

      {showFilters && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventos.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-600 text-ink">Evento</label>
                <select
                  value={filtroEventoId}
                  onChange={(e) => {
                    setFiltroEventoId(e.target.value);
                    setFiltroFuncionId('');
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
            )}
            {funciones.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-600 text-ink">Función</label>
                <select
                  value={filtroFuncionId}
                  onChange={(e) => setFiltroFuncionId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todas</option>
                  {funcionesFiltradas.map((fn) => (
                    <option key={fn.id} value={fn.id}>
                      {fn.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-2 text-sm font-600 text-gray-600">Total Vendido</p>
          <p className="text-4xl font-bold text-primary">${totalVendido.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-2 text-sm font-600 text-gray-600">Asientos Vendidos</p>
          <p className="text-4xl font-bold text-primary">{asientosVendidos}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-2 text-sm font-600 text-gray-600">Promedio por Venta</p>
          <p className="text-4xl font-bold text-primary">${promedio.toFixed(2)}</p>
        </div>
      </div>

      {grupos.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Cliente</th>
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
                      <td className="px-6 py-4 text-body">{grupo.funcion?.evento?.nombre}</td>
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
                                onClick={() => handleCancelarAsiento(venta, grupo.cliente_nombre)}
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
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          {ventas.length > 0
            ? 'No hay ventas con esos filtros.'
            : 'No tienes ventas registradas. ¡Comienza a vender boletos!'}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
