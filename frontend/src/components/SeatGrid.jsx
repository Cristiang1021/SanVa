import { useMemo } from 'react';

/**
 * mode:
 * - "venta": solo asientos disponibles son clicables
 * - "admin": disponible ↔ bloqueado (toggle); vendido/reservado no se tocan
 */
export default function SeatGrid({
  asientos,
  onSelectAsiento,
  selectedAsientoId = null,
  loading = false,
  mode = 'venta',
}) {
  const asientosPorFila = useMemo(() => {
    const grouped = {};
    asientos.forEach((asiento) => {
      if (!grouped[asiento.fila]) {
        grouped[asiento.fila] = [];
      }
      grouped[asiento.fila].push(asiento);
    });

    const ordenadas = {};
    Object.keys(grouped).sort().forEach((fila) => {
      ordenadas[fila] = grouped[fila].sort((a, b) => a.numero - b.numero);
    });
    return ordenadas;
  }, [asientos]);

  const getAsientoColor = (asiento) => {
    if (selectedAsientoId === asiento.id) {
      return 'bg-amber-400 border-2 border-amber-600';
    }
    if (asiento.estado === 'disponible') return 'bg-green-500 hover:bg-green-600';
    if (asiento.estado === 'vendido') return 'bg-primary cursor-not-allowed';
    if (asiento.estado === 'reservado') return 'bg-amber-500 cursor-not-allowed';
    if (asiento.estado === 'bloqueado') {
      return mode === 'admin'
        ? 'bg-gray-400 hover:bg-gray-500 cursor-pointer'
        : 'bg-gray-300 cursor-not-allowed';
    }
    return 'bg-gray-200';
  };

  const canClick = (asiento) => {
    if (mode === 'admin') {
      return asiento.estado === 'disponible' || asiento.estado === 'bloqueado';
    }
    return asiento.estado === 'disponible';
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando asientos...</div>;
  }

  if (Object.keys(asientosPorFila).length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay asientos en esta sección</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(asientosPorFila).map(([fila, asientosDelaFila]) => (
        <div key={fila} className="flex items-center gap-4">
          <div className="w-8 text-right font-bold text-ink">{fila}</div>
          <div className="flex gap-2 flex-wrap">
            {asientosDelaFila.map((asiento) => {
              const clickable = canClick(asiento);
              return (
                <button
                  key={asiento.id}
                  type="button"
                  onClick={() => clickable && onSelectAsiento?.(asiento)}
                  disabled={!clickable}
                  className={`
                    w-10 h-10 rounded text-xs font-bold text-white transition
                    ${getAsientoColor(asiento)}
                    ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                  title={`${fila}${asiento.numero} — ${asiento.estado}${
                    mode === 'admin' && clickable
                      ? asiento.estado === 'bloqueado'
                        ? ' (tocar para desbloquear)'
                        : ' (tocar para bloquear)'
                      : ''
                  }`}
                >
                  {asiento.numero}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
