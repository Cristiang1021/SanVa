export default function SeatLegend({ showSelected = true }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-bold text-ink mb-3">Leyenda</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-green-500"></div>
          <span className="text-sm text-body">Disponible</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-primary"></div>
          <span className="text-sm text-body">Vendido</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-amber-500"></div>
          <span className="text-sm text-body">Reservado (5 min)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-gray-300"></div>
          <span className="text-sm text-body">Bloqueado</span>
        </div>
        {showSelected && (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-400 border-2 border-amber-600"></div>
            <span className="text-sm text-body">Seleccionado</span>
          </div>
        )}
      </div>
    </div>
  );
}
