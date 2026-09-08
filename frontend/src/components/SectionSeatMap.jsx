import { useRef, useState, useEffect, useCallback } from 'react';
import { layoutForSeccion } from './seatLayouts';

const ESTADO_FILL = {
  disponible: '#22c55e',
  vendido: '#FF0013',
  bloqueado: '#9ca3af',
  reservado: '#f59e0b',
};

const MOBILE_MQ = '(max-width: 768px)';

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

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
 * Vista detalle con zoom/pan.
 * Móvil: mapa completo a lo ancho; controles fuera del canvas (arriba).
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
  const [mobile, setMobile] = useState(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const asientosByIdRef = useRef(new Map());
  const onSelectRef = useRef(onSelectAsiento);
  const skipSelectUntil = useRef(0);
  const mobileRef = useRef(false);
  const TAP_PX = 10;
  const mapReady = Boolean(seccion && !loading && asientos.length);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    onSelectRef.current = onSelectAsiento;
  }, [onSelectAsiento]);
  useEffect(() => {
    asientosByIdRef.current = new Map(asientos.map((a) => [String(a.id), a]));
  }, [asientos]);
  useEffect(() => {
    mobileRef.current = mobile;
  }, [mobile]);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    setMobile(isMobileViewport());
    resetView();
  }, [seccion?.id, asientos.length, resetView]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => {
      setMobile(mq.matches);
      resetView();
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [resetView]);

  const applyZoom = useCallback((next, cx, cy, prevScale, prevPan) => {
    const clamped = Math.min(4, Math.max(1, next));
    if (cx != null && cy != null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const px = cx - rect.left;
      const py = cy - rect.top;
      setPan({
        x: px - ((px - prevPan.x) * clamped) / prevScale,
        y: py - ((py - prevPan.y) * clamped) / prevScale,
      });
    }
    setScale(clamped);
    return clamped;
  }, []);

  const zoomBy = useCallback(
    (factor, cx, cy) => {
      const prev = scaleRef.current;
      applyZoom(prev * factor, cx, cy, prev, panRef.current);
    },
    [applyZoom]
  );

  // Re-enganchar wheel cuando el canvas ya está montado (antes fallaba en loading)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapReady) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy, mapReady, seccion?.id]);

  const seatFromEvent = (e) => {
    const node = e.target?.closest?.('[data-seat]');
    if (!node) return null;
    const id = node.getAttribute('data-seat-id');
    if (!id) return null;
    return asientosByIdRef.current.get(id) || null;
  };

  const beginPinch = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    gesture.current = {
      mode: 'pinch',
      startDist: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
      startScale: scaleRef.current,
      startPan: { ...panRef.current },
      startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const applyPinch = () => {
    const g = gesture.current;
    if (!g || g.mode !== 'pinch') return;
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const d = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
    const next = Math.min(4, Math.max(1, g.startScale * (d / g.startDist)));
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const el = containerRef.current;
    if (!el) {
      setScale(next);
      return;
    }
    const rect = el.getBoundingClientRect();
    const sx = g.startMid.x - rect.left;
    const sy = g.startMid.y - rect.top;
    setScale(next);
    setPan({
      x: sx - ((sx - g.startPan.x) * next) / g.startScale + (m.x - g.startMid.x),
      y: sy - ((sy - g.startPan.y) * next) / g.startScale + (m.y - g.startMid.y),
    });
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Capture solo mouse: en touch captura el 1er dedo y rompe el pellizco
    if (e.pointerType === 'mouse') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }

    gesture.current = {
      mode: 'pan',
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      moved: false,
      seat: seatFromEvent(e),
    };
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      if (!gesture.current || gesture.current.mode !== 'pinch') beginPinch();
      applyPinch();
      return;
    }

    const g = gesture.current;
    if (!g || g.mode !== 'pan') return;

    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) > TAP_PX) g.moved = true;
    if (!g.moved) return;

    if (scaleRef.current > 1.01 || mobileRef.current) {
      setPan({ x: g.panX + dx, y: g.panY + dy });
    }
  };

  const endPointer = (e, { cancel = false } = {}) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }

    if (gesture.current?.mode === 'pinch') {
      skipSelectUntil.current = Date.now() + 350;
      gesture.current = null;
      // Si queda un dedo, reanudar pan sin seleccionar
      if (pointers.current.size === 1) {
        const p = [...pointers.current.values()][0];
        gesture.current = {
          mode: 'pan',
          x: p.x,
          y: p.y,
          panX: panRef.current.x,
          panY: panRef.current.y,
          moved: true,
          seat: null,
        };
      }
      return;
    }

    if (pointers.current.size === 0) {
      const g = gesture.current;
      gesture.current = null;
      if (cancel || !g || g.mode !== 'pan' || g.moved) return;
      if (Date.now() < skipSelectUntil.current) return;
      if (g.seat?.estado === 'disponible') onSelectRef.current?.(g.seat);
    }
  };

  const onPointerUp = (e) => endPointer(e);
  const onPointerCancel = (e) => endPointer(e, { cancel: true });

  if (!seccion) return null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-white/50 sm:h-80">
        Cargando asientos...
      </div>
    );
  }

  if (!asientos.length) {
    return (
      <div className="flex h-64 items-center justify-center text-white/50 sm:h-80">
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
    const fila = String(asiento.fila || '');
    const prefix = fila.toLowerCase();
    if (prefix === 'p' || prefix === 'v' || prefix === 'z') {
      return `${prefix}${String(asiento.numero).padStart(2, '0')}`;
    }
    if (prefix.length === 1 && /[a-z]/i.test(prefix)) {
      return `${fila.toUpperCase()}${String(asiento.numero).padStart(2, '0')}`;
    }
    return `${fila}${asiento.numero}`;
  };

  const toolBtn =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-ink shadow-sm active:bg-gray-100 sm:h-9 sm:min-w-9 sm:rounded-md sm:px-0';

  const zoomToolbar = (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => zoomBy(1.25)} className={toolBtn} aria-label="Acercar">
        +
      </button>
      <button type="button" onClick={() => zoomBy(1 / 1.25)} className={toolBtn} aria-label="Alejar">
        −
      </button>
      <button type="button" onClick={resetView} className={`${toolBtn} text-[11px]`} aria-label="Ver todo">
        Ver todo
      </button>
    </div>
  );

  return (
    <div className="relative flex flex-col gap-2">
      {/* Controles fuera del mapa: móvil siempre arriba; desktop flotantes abajo-izq */}
      <div className="flex items-center justify-end gap-2 px-1 sm:hidden">
        {zoomToolbar}
      </div>

      <div className="relative">
        <div className="absolute bottom-3 left-3 z-10 hidden flex-col gap-1 sm:flex">
          <button type="button" onClick={() => zoomBy(1.2)} className={toolBtn} title="Acercar">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.2)} className={toolBtn} title="Alejar">
            −
          </button>
          <button type="button" onClick={resetView} className={`${toolBtn} text-[10px]`} title="Ver todo">
            1:1
          </button>
        </div>
        {!mobile && (
          <p className="pointer-events-none absolute bottom-3 left-14 z-10 text-[11px] text-white/50">
            Ctrl + scroll · arrastra para mover
          </p>
        )}

        <div
          ref={containerRef}
          className={`select-none overflow-hidden rounded-lg ${
            scale > 1.01 || mobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: gesture.current ? 'none' : 'transform 0.05s linear',
            }}
          >
            <svg
              viewBox={layout.viewBox}
              className="block h-auto w-full"
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
                const hit = r * (mobile ? 1.25 : 1.1);

                return (
                  <g
                    key={asiento.id}
                    data-seat="1"
                    data-seat-id={String(asiento.id)}
                    style={{ cursor: disponible ? 'pointer' : 'not-allowed' }}
                    opacity={disponible || selected || asiento.estado === 'reservado' ? 1 : 0.55}
                  >
                    <rect
                      x={x - hit}
                      y={y - hit * 0.9}
                      width={hit * 2}
                      height={hit * 1.8}
                      fill="transparent"
                    />
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
    </div>
  );
}
