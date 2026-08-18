import SectionSeatMap from './SectionSeatMap';
import { LEVEL_ORDER, sectionKey } from './seatLayouts';

/**
 * Mapa del teatro:
 * - overview: elegir sección (herradura)
 * - seats: asientos individuales (croquis) con zoom
 */

const VB = { w: 480, h: 430 };

const PATHS = {
  palco3: `
    M 22 315 L 22 95 Q 22 35 85 35 L 395 35 Q 458 35 458 95
    L 458 315 L 412 315 L 412 105 Q 412 72 378 72 L 102 72
    Q 68 72 68 105 L 68 315 Z
  `,
  palco2: `
    M 68 315 L 68 105 Q 68 72 102 72 L 378 72 Q 412 72 412 105
    L 412 315 L 368 315 L 368 125 Q 368 98 342 98 L 138 98
    Q 112 98 112 125 L 112 315 Z
  `,
  palco1: `
    M 112 315 L 112 125 Q 112 98 138 98 L 342 98 Q 368 98 368 125
    L 368 315 L 330 315 L 330 142 Q 330 128 315 128 L 165 128
    Q 150 128 150 142 L 150 315 Z
  `,
  platea: `M 150 142 L 330 142 L 330 318 L 150 318 Z`,
};

const LABELS = {
  palco3: [
    { x: 70, y: 55, text: 'Palco 3' },
    { x: 410, y: 55, text: 'Palco 3' },
  ],
  palco2: [
    { x: 85, y: 200, text: 'Palco 2' },
    { x: 395, y: 200, text: 'Palco 2' },
  ],
  palco1: [
    { x: 125, y: 230, text: 'Palco 1' },
    { x: 355, y: 230, text: 'Palco 1' },
  ],
  platea: [{ x: 240, y: 230, text: 'PLATEA', size: 18 }],
};

const MATCHERS = {
  platea: (n) => n.includes('platea'),
  palco1: (n) => n.includes('palco 1'),
  palco2: (n) => n.includes('palco 2'),
  palco3: (n) => n.includes('palco 3'),
};

const DRAW_ORDER = ['palco3', 'palco2', 'palco1', 'platea'];

function LevelSelector({ secciones, selectedSeccionId, view, onSelect, onDeselect }) {
  const levels = LEVEL_ORDER.map((key, idx) => {
    const seccion = secciones.find((s) => sectionKey(s.nombre) === key);
    return { num: idx + 1, seccion };
  }).filter((l) => l.seccion);

  if (levels.length === 0) return null;

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-auto">
      {levels.map(({ num, seccion }) => {
        const active = selectedSeccionId === seccion.id && view === 'seats';
        return (
          <button
            key={seccion.id}
            type="button"
            title={active ? `${seccion.nombre} (tocar para ver mapa completo)` : seccion.nombre}
            onClick={() => {
              if (active) onDeselect?.();
              else onSelect(seccion);
            }}
            className={`w-9 h-9 rounded-md text-sm font-bold transition border ${
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-ink border-gray-200 hover:border-primary'
            }`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

function OverviewMap({ secciones, selectedSeccionId, onSelectSeccion }) {
  const byKey = {};
  for (const [key, match] of Object.entries(MATCHERS)) {
    byKey[key] = secciones.find((s) => match(s.nombre.toLowerCase())) || null;
  }

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full h-auto block"
      role="img"
      aria-label="Mapa de secciones del teatro"
    >
      <rect width={VB.w} height={VB.h} fill="#020202" />

      {DRAW_ORDER.map((key) => {
        const seccion = byKey[key];
        if (!seccion) return null;
        const selected = selectedSeccionId === seccion.id;
        const color = seccion.color || '#FF0013';
        const dimmed = selectedSeccionId && !selected;

        return (
          <g key={key} opacity={dimmed ? 0.25 : 1}>
            <path
              d={PATHS[key]}
              fill={selected ? '#f5f5f5' : color}
              fillOpacity={selected ? 0.95 : 0.75}
              stroke={selected ? color : 'rgba(255,255,255,0.25)'}
              strokeWidth={selected ? 2.5 : 1}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectSeccion(seccion)}
            >
              <title>
                {seccion.nombre} — ${Number(seccion.precio).toFixed(2)}
              </title>
            </path>
            {LABELS[key]?.map((lab, i) => (
              <text
                key={i}
                x={lab.x}
                y={lab.y}
                textAnchor="middle"
                fill={selected ? '#111' : 'white'}
                fontSize={lab.size || 11}
                fontWeight="700"
                style={{ pointerEvents: 'none' }}
              >
                {lab.text}
              </text>
            ))}
          </g>
        );
      })}

      <rect x="120" y="345" width="240" height="50" rx="8" fill="#D4D4D4" />
      <text
        x={240}
        y={377}
        textAnchor="middle"
        fill="#222"
        fontSize="18"
        fontWeight="700"
        letterSpacing="1.5"
      >
        ESCENARIO
      </text>
    </svg>
  );
}

export default function TheaterMap({
  secciones,
  asientos = [],
  selectedSeccionId = null,
  selectedAsientoId = null,
  selectedAsientoIds = null,
  onSelectSeccion,
  onSelectAsiento,
  view = 'overview',
  onChangeView,
  loadingAsientos = false,
}) {
  if (!secciones || secciones.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-[#020202] rounded-2xl">
        <p className="text-gray-400">No hay secciones disponibles</p>
      </div>
    );
  }

  const selectedSeccion = secciones.find((s) => s.id === selectedSeccionId);
  const inSeats = view === 'seats' && selectedSeccion;

  const goToSeccion = (sec) => {
    onSelectSeccion(sec);
    onChangeView?.('seats');
  };

  const goOverview = () => {
    onSelectSeccion(null);
    onChangeView?.('overview');
  };

  return (
    <div className="space-y-3">
      <div className="relative bg-[#020202] rounded-2xl overflow-hidden shadow-lg min-h-[460px]">
        <LevelSelector
          secciones={secciones}
          selectedSeccionId={selectedSeccionId}
          view={view}
          onSelect={goToSeccion}
          onDeselect={goOverview}
        />

        {inSeats ? (
          <div className="pt-3 px-12 pb-16">
            <div className="flex items-center justify-center mb-2">
              <span className="text-sm font-semibold text-white bg-white/10 px-4 py-1.5 rounded-full">
                {selectedSeccion.nombre}
              </span>
            </div>

            <SectionSeatMap
              seccion={selectedSeccion}
              asientos={asientos}
              selectedAsientoId={selectedAsientoId}
              selectedAsientoIds={selectedAsientoIds}
              onSelectAsiento={onSelectAsiento}
              loading={loadingAsientos}
            />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <button
                type="button"
                onClick={goOverview}
                className="min-w-[200px] px-8 py-3 rounded-xl bg-[#f5c518] text-ink font-bold text-sm shadow-lg hover:bg-[#e6b800] transition"
              >
                Ver mapa completo
              </button>
            </div>
          </div>
        ) : (
          <OverviewMap
            secciones={secciones}
            selectedSeccionId={null}
            onSelectSeccion={goToSeccion}
          />
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        {inSeats
          ? 'Toca asientos verdes para agregarlos · Toca de nuevo para quitar · Ctrl+scroll para zoom'
          : 'Elige una sección para ver y vender asientos'}
      </p>
    </div>
  );
}
