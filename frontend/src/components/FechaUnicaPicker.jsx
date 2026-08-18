import { useMemo, useState } from 'react';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function buildCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  // Monday-based index (0 = Monday)
  let start = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Toggle + calendario y hora estilizados para fecha única de evento.
 */
export default function FechaUnicaPicker({
  enabled,
  onEnabledChange,
  fecha,
  hora,
  onFechaChange,
  onHoraChange,
}) {
  const selected = parseYmd(fecha) || new Date();
  const [cursor, setCursor] = useState(() => ({
    year: selected.getFullYear(),
    month: selected.getMonth(),
  }));

  const cells = useMemo(
    () => buildCalendarDays(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  const todayStr = toYmd(new Date());
  const selectedStr = fecha || '';

  const shiftMonth = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => onEnabledChange(!enabled)}
        className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition ${
          enabled ? 'bg-primary/5' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div>
          <p className="text-sm font-600 text-ink">Fecha única</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Actívalo si el evento solo tiene una función
          </p>
        </div>
        <span
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
            enabled ? 'bg-primary' : 'bg-gray-300'
          }`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </button>

      {enabled && (
        <div className="p-4 space-y-4 border-t border-gray-200 bg-white">
          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="w-8 h-8 rounded-lg border border-gray-200 text-ink hover:bg-gray-50 font-bold"
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <p className="text-sm font-bold text-ink">
                {MONTHS[cursor.month]} {cursor.year}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="w-8 h-8 rounded-lg border border-gray-200 text-ink hover:bg-gray-50 font-bold"
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-600 text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="h-9" />;
                const ymd = toYmd(day);
                const isSelected = ymd === selectedStr;
                const isToday = ymd === todayStr;
                const isPast = ymd < todayStr;

                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={isPast}
                    onClick={() => onFechaChange(ymd)}
                    className={`h-9 rounded-lg text-sm font-600 transition ${
                      isSelected
                        ? 'bg-primary text-white shadow'
                        : isToday
                          ? 'bg-gray-100 text-ink ring-1 ring-primary/40'
                          : isPast
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-ink hover:bg-primary/10'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time — libre: cualquier hora y minuto */}
          <div>
            <p className="text-sm font-600 text-ink mb-2">Hora</p>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="sr-only">Horas</span>
                <select
                  value={(hora || '20:00').split(':')[0] || '20'}
                  onChange={(e) => {
                    const min = (hora || '20:00').split(':')[1] || '00';
                    onHoraChange(`${e.target.value}:${min}`);
                  }}
                  className="w-full appearance-none px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-ink font-600 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = String(h).padStart(2, '0');
                    return (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    );
                  })}
                </select>
                <span className="block text-[10px] text-center text-gray-400 mt-1 font-600">Horas</span>
              </label>

              <span className="text-2xl font-bold text-ink pb-5">:</span>

              <label className="flex-1">
                <span className="sr-only">Minutos</span>
                <select
                  value={(hora || '20:00').split(':')[1] || '00'}
                  onChange={(e) => {
                    const hr = (hora || '20:00').split(':')[0] || '20';
                    onHoraChange(`${hr}:${e.target.value}`);
                  }}
                  className="w-full appearance-none px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-ink font-600 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Array.from({ length: 60 }, (_, m) => {
                    const v = String(m).padStart(2, '0');
                    return (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    );
                  })}
                </select>
                <span className="block text-[10px] text-center text-gray-400 mt-1 font-600">Minutos</span>
              </label>
            </div>
          </div>

          {fecha && hora && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Se creará una función el{' '}
              <span className="font-600 text-ink">
                {parseYmd(fecha)?.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>{' '}
              a las <span className="font-600 text-ink">{hora}</span>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
