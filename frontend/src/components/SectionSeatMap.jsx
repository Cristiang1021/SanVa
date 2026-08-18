import { useRef, useState, useEffect, useCallback } from 'react';
import { layoutForSeccion } from './seatLayouts';

const ESTADO_FILL = {
  disponible: '#22c55e',
  vendido: '#FF0013',
  bloqueado: '#9ca3af',
  reservado: '#f59e0b',
};

/** Fantasma rectangular del platea (decorativo en vistas de palco) */
function GhostPlatea() {
  const rows = 12;
  const cols = 14;
  const dots = [];
  const gapX = 22;
  const gapY = 28;
  const w = (cols - 1) * gapX;
  for (let r = 0; r < rows; r++) {
    const y = 160 + r * gapY;
    for (let i = 0; i < cols; i++) {
      const x = 400 - w / 2 + i * gapX;
      dots.push({ x, y, key: `${r}-${i}` });
    }
  }
  return (
    <g opacity="0.2" style={{ pointerEvents: 'none' }}>
      {dots.map((d) => (
        <rect
          key={d.key}
          x={d.x - 5}
          y={d.y - 4}
          width="10"
          height="8"
          rx="1"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="1.2"
        />
      ))}
    </g>
  );
}

/**
 * Vista detalle con zoom/pan: asientos clicables.
 */
export default function SectionSeatMap({
  seccion,
  asientos = [],
  selectedAsientoId = null,
  selectedAsientoIds = null,
  onSelectAsiento,
  loading = false,
}) {
  const selectedSet = new Set(
    selectedAsientoIds?.length
      ? selectedAsientoIds
      : selectedAsientoId
        ? [selectedAsientoId]
        : []
  );
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  // Reset zoom al cambiar de sección
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [seccion?.id]);

  const zoomBy = useCallback((factor, cx, cy) => {
    setScale((prev) => {
      const next = Math.min(3.5, Math.max(0.6, prev * factor));
      if (cx != null && cy != null && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const px = cx - rect.left;
        const py = cy - rect.top;
        setPan((p) => ({
          x: px - ((px - p.x) * next) / prev,
          y: py - ((py - p.y) * next) / prev,
        }));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    // No iniciar drag si se hace clic en un asiento
    if (e.target.closest('[data-seat]')) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  if (!seccion) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-white/50">
        Cargando asientos...
      </div>
    );
  }

  if (!asientos.length) {
    return (
      <div className="flex items-center justify-center h-80 text-white/50">
        No hay asientos en esta sección
      </div>
    );
  }

  const layout = layoutForSeccion(seccion, asientos);

  const fillOf = (asiento) => {
    if (selectedSet.has(asiento.id)) return '#fbbf24';
    return ESTADO_FILL[asiento.estado] || '#6b7280';
  };

  const seatLabel = (asiento) => {
    const prefix = (asiento.fila || '').toLowerCase();
    if (prefix.length === 1 && /[a-z]/.test(prefix) && prefix !== 'p' && prefix !== 'v' && prefix !== 'z') {
      return String(asiento.numero);
    }
    const p = prefix === 'p' || prefix === 'v' || prefix === 'z' ? prefix : 'p';
    return `${p}${String(asiento.numero).padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Controles zoom */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          className="w-9 h-9 rounded-md bg-white text-ink font-bold shadow hover:bg-gray-100"
          title="Acercar"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          className="w-9 h-9 rounded-md bg-white text-ink font-bold shadow hover:bg-gray-100"
          title="Alejar"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-9 h-9 rounded-md bg-white text-ink text-[10px] font-bold shadow hover:bg-gray-100"
          title="Restablecer"
        >
          1:1
        </button>
      </div>
      <p className="absolute bottom-3 left-14 z-10 text-[11px] text-white/50 pointer-events-none">
        Ctrl + scroll para zoom · arrastra para mover
      </p>

      <div
        ref={containerRef}
        className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: drag.current ? 'none' : 'transform 0.05s linear',
          }}
        >
          <svg
            viewBox={layout.viewBox}
            className="w-full h-auto block"
            role="img"
            aria-label={`Asientos de ${seccion.nombre}`}
          >
            <rect width="100%" height="100%" fill="#020202" />

            {layout.ghostSeats && <GhostPlatea />}

            {layout.rowLabels?.map((lab, i) => (
              <text
                key={`rl-${i}`}
                x={lab.x}
                y={lab.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.55)"
                fontSize="11"
                fontWeight="600"
              >
                {lab.fila}
              </text>
            ))}

            {layout.positions.map(({ x, y, r, asiento }) => {
              const disponible = asiento.estado === 'disponible';
              const selected = selectedSet.has(asiento.id);
              const label = seatLabel(asiento);

              return (
                <g
                  key={asiento.id}
                  data-seat="1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (disponible) onSelectAsiento?.(asiento);
                  }}
                  style={{ cursor: disponible ? 'pointer' : 'not-allowed' }}
                  opacity={disponible || selected || asiento.estado === 'reservado' ? 1 : 0.55}
                >
                  <rect
                    x={x - r}
                    y={y - r * 0.85}
                    width={r * 2}
                    height={r * 1.7}
                    rx="3"
                    fill={fillOf(asiento)}
                    stroke={selected ? '#fff' : 'rgba(255,255,255,0.35)'}
                    strokeWidth={selected ? 2 : 1}
                  />
                  <text
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={label.length > 3 ? 7 : 8}
                    fontWeight="700"
                    style={{ pointerEvents: 'none' }}
                  >
                    {label}
                  </text>
                  <title>
                    {label} — {asiento.estado}
                  </title>
                </g>
              );
            })}

            {layout.stage && (
              <>
                <rect
                  x={layout.stage.x}
                  y={layout.stage.y}
                  width={layout.stage.w}
                  height={layout.stage.h}
                  rx="8"
                  fill="#D4D4D4"
                />
                <text
                  x={layout.stage.x + layout.stage.w / 2}
                  y={layout.stage.y + layout.stage.h / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#222"
                  fontSize="18"
                  fontWeight="700"
                  letterSpacing="1.5"
                >
                  ESCENARIO
                </text>
              </>
            )}

            {layout.footer && (() => {
              const vbH = parseFloat(String(layout.viewBox).split(/\s+/)[3]) || 820;
              const fy = vbH - 35;
              return (
                <g>
                  <rect x="280" y={fy} width="240" height="28" rx="4" fill="none" stroke="#666" />
                  <text
                    x="400"
                    y={fy + 11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {layout.footer.text}
                    {layout.footer.sub ? `  ${layout.footer.sub}` : ''}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}
