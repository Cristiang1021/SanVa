/**
 * Layouts de asientos según croquis del teatro.
 * Escenario arriba en vistas de detalle.
 */

const CX = 400;

export function groupByFila(asientos) {
  const map = {};
  for (const a of asientos) {
    if (!map[a.fila]) map[a.fila] = [];
    map[a.fila].push(a);
  }
  for (const fila of Object.keys(map)) {
    map[fila].sort((a, b) => a.numero - b.numero);
  }
  return map;
}

function byNumero(asientos) {
  const map = new Map();
  for (const a of asientos) map.set(a.numero, a);
  return map;
}

function byFilaNumero(asientos) {
  const map = new Map();
  for (const a of asientos) {
    const f = String(a.fila || '').toUpperCase();
    map.set(`${f}:${Number(a.numero)}`, a);
  }
  return map;
}

function place(map, numero, x, y, r = 12) {
  const asiento = map.get(numero);
  if (!asiento) return null;
  return { x, y, r, asiento };
}

function placeFN(map, fila, numero, x, y, r = 11) {
  const asiento = map.get(`${String(fila).toUpperCase()}:${Number(numero)}`);
  if (!asiento) return null;
  return { x, y, r, asiento };
}

/** Columna vertical de números (en orden de arriba → abajo) */
function column(map, numeros, x, y0, gap) {
  return numeros
    .map((n, i) => place(map, n, x, y0 + i * gap))
    .filter(Boolean);
}

/** Fila horizontal de números (izquierda → derecha) */
function row(map, numeros, x0, y, gap) {
  return numeros
    .map((n, i) => place(map, n, x0 + i * gap, y))
    .filter(Boolean);
}

/** Números descendentes inclusive (ej. 12→1) */
function desc(from, to) {
  const out = [];
  for (let n = from; n >= to; n -= 1) out.push(n);
  return out;
}

/**
 * Coloca una secuencia [fila, numero] de izq→der, centrada en CX.
 * `aislesBefore` = índices donde insertar hueco extra (pasillo/columna).
 */
function placeCenteredRow(map, specs, y, gapX, seatR, aislesBefore = []) {
  const aisleGap = gapX * 1.55;
  const aisleSet = new Set(aislesBefore);
  let totalW = 0;
  for (let i = 0; i < specs.length; i += 1) {
    if (i > 0) totalW += aisleSet.has(i) ? aisleGap : gapX;
  }
  let x = CX - totalW / 2;
  const positions = [];
  specs.forEach(([fila, numero], i) => {
    if (i > 0) x += aisleSet.has(i) ? aisleGap : gapX;
    const p = placeFN(map, fila, numero, x, y, seatR);
    if (p) positions.push(p);
  });
  return positions;
}

function filaDesc(fila, from, to) {
  return desc(from, to).map((n) => [fila, n]);
}

/**
 * Platea — croquis real:
 * - Fila A: A12–A07 · N03–N01 · A06–A01
 * - B–L: filas normales (números altos a la izquierda)
 * - Línea M: M06–M04 · N09–N04 · M03–M01
 * - Fondo: N15–N13 · N12–N10
 * La venta sigue siendo por asiento.id (fila+numero en BD).
 */
export function layoutPlatea(asientos) {
  const map = byFilaNumero(asientos);
  const gapX = 26;
  const gapY = 30;
  const seatR = 10;
  const y0 = 96;
  const positions = [];
  const rowLabels = [];
  const labelX = 52;
  const labelXR = 748;

  const pushLabels = (fila, y) => {
    rowLabels.push({ fila, x: labelX, y });
    rowLabels.push({ fila, x: labelXR, y });
  };

  // A — con N01–N03 al centro
  {
    const y = y0;
    const specs = [
      ...filaDesc('A', 12, 7),
      ...filaDesc('N', 3, 1),
      ...filaDesc('A', 6, 1),
    ];
    positions.push(...placeCenteredRow(map, specs, y, gapX, seatR));
    pushLabels('A', y);
  }

  const normalRows = [
    ['B', 15],
    ['C', 16],
    ['D', 16],
    ['E', 14],
    ['F', 16],
    ['G', 16],
    ['H', 15],
    ['I', 14],
    ['J', 16],
    ['K', 16],
    ['L', 15],
  ];

  normalRows.forEach(([fila, max], idx) => {
    const y = y0 + (idx + 1) * gapY;
    positions.push(
      ...placeCenteredRow(map, filaDesc(fila, max, 1), y, gapX, seatR)
    );
    pushLabels(fila, y);
  });

  // Línea M + N04–N09 (pasillos laterales como en croquis)
  {
    const y = y0 + 12 * gapY;
    const specs = [
      ...filaDesc('M', 6, 4),
      ...filaDesc('N', 9, 4),
      ...filaDesc('M', 3, 1),
    ];
    // huecos antes del bloque N (índice 3) y antes de M derecha (índice 9)
    positions.push(...placeCenteredRow(map, specs, y, gapX, seatR, [3, 9]));
    pushLabels('M', y);
  }

  // Fondo N10–N15 en dos grupos
  {
    const y = y0 + 13 * gapY + 8;
    const specs = [
      ...filaDesc('N', 15, 13),
      ...filaDesc('N', 12, 10),
    ];
    positions.push(...placeCenteredRow(map, specs, y, gapX, seatR, [3]));
    pushLabels('N', y);
  }

  const height = y0 + 14 * gapY + 90;

  return {
    viewBox: `0 0 800 ${Math.max(height, 620)}`,
    positions,
    rowLabels,
    stage: { x: 200, y: 16, w: 400, h: 44 },
    footer: { text: 'PLATEA', sub: 'A–M · N01–15' },
  };
}

/**
 * PALCO 1 — croquis p01–p65
 * Derecha 1–20 · abajo doble fila · izquierda 65→46
 */
export function layoutPalco1(asientos) {
  const map = byNumero(asientos);
  const gapY = 28;
  const gapX = 30;
  const yTop = 130;
  const xR = 720;
  const xL = 80;

  const positions = [
    // Derecha: p01→p20 (arriba→abajo)
    ...column(map, Array.from({ length: 20 }, (_, i) => i + 1), xR, yTop, gapY),

    // Abajo-derecha angulado (interno / externo)
    ...placeMany(map, [
      [21, 680, 710],
      [22, 640, 700],
      [32, 700, 750],
      [33, 660, 755],
      [34, 620, 760],
    ]),

    // Abajo centro — fila interna (p23 der → p29 izq) → dibujar L→R como 29..23
    ...row(map, [29, 28, 27, 26, 25, 24, 23], 250, 700, gapX),
    // Abajo centro — fila externa (p35 der → p42 izq) → L→R 42..35
    ...row(map, [42, 41, 40, 39, 38, 37, 36, 35], 235, 745, gapX),

    // Abajo-izquierda angulado
    ...placeMany(map, [
      [30, 160, 700],
      [31, 120, 710],
      [43, 180, 760],
      [44, 140, 755],
      [45, 100, 750],
    ]),

    // Izquierda: p65→p46 (arriba→abajo)
    ...column(map, Array.from({ length: 20 }, (_, i) => 65 - i), xL, yTop, gapY),
  ];

  return {
    viewBox: '0 0 800 820',
    positions,
    rowLabels: [],
    stage: { x: 200, y: 16, w: 400, h: 44 },
    ghostSeats: true,
    footer: { text: 'PALCO 1', sub: 'p01 – p65' },
  };
}

/**
 * PALCO 2 — croquis v01–v60
 */
export function layoutPalco2(asientos) {
  const map = byNumero(asientos);
  const gapY = 30;
  const gapX = 30;
  const yTop = 130;
  const xR = 720;
  const xL = 80;

  const positions = [
    ...column(map, Array.from({ length: 18 }, (_, i) => i + 1), xR, yTop, gapY),

    ...placeMany(map, [
      [19, 690, 700],
      [20, 655, 715],
      [21, 620, 730],
    ]),

    // Fila interna p28..p22 → L→R 28..22
    ...row(map, [28, 27, 26, 25, 24, 23, 22], 265, 700, gapX),
    // Fila externa p39..p32 → L→R 39..32
    ...row(map, [39, 38, 37, 36, 35, 34, 33, 32], 250, 745, gapX),

    ...placeMany(map, [
      [29, 180, 730],
      [30, 145, 715],
      [31, 110, 700],
      [40, 180, 770],
      [41, 140, 765],
      [42, 100, 760],
    ]),

    ...column(map, Array.from({ length: 18 }, (_, i) => 60 - i), xL, yTop, gapY),
  ];

  return {
    viewBox: '0 0 800 820',
    positions,
    rowLabels: [],
    stage: { x: 200, y: 16, w: 400, h: 44 },
    ghostSeats: true,
    footer: { text: 'PALCO 2', sub: 'v01 – v60' },
  };
}

/**
 * PALCO 3 — croquis z01–z57
 */
export function layoutPalco3(asientos) {
  const map = byNumero(asientos);
  const gapY = 32;
  const gapX = 30;
  const yTop = 130;
  const xR = 720;
  const xL = 80;

  const positions = [
    ...column(map, Array.from({ length: 14 }, (_, i) => i + 1), xR, yTop, gapY),

    ...placeMany(map, [
      [15, 700, 620],
      [16, 700, 655],
      [17, 700, 690],
      [18, 660, 720],
      [19, 625, 735],
      [20, 590, 750],
    ]),

    // Centro fila interna p27..p21 → L→R 27..21
    ...row(map, [27, 26, 25, 24, 23, 22, 21], 265, 700, gapX),
    // Centro fila externa p35..p28 → L→R 35..28
    ...row(map, [35, 34, 33, 32, 31, 30, 29, 28], 250, 745, gapX),

    ...placeMany(map, [
      [36, 210, 750],
      [37, 175, 735],
      [38, 140, 720],
      [39, 100, 690],
      [40, 100, 655],
      [41, 100, 620],
    ]),

    ...column(map, Array.from({ length: 16 }, (_, i) => 57 - i), xL, yTop, gapY),
  ];

  return {
    viewBox: '0 0 800 820',
    positions,
    rowLabels: [],
    stage: { x: 200, y: 16, w: 400, h: 44 },
    ghostSeats: true,
    footer: { text: 'PALCO 3', sub: 'z01 – z57' },
  };
}

function placeMany(map, triples) {
  return triples.map(([n, x, y]) => place(map, n, x, y)).filter(Boolean);
}

export function sectionKey(seccionOrNombre) {
  if (seccionOrNombre && typeof seccionOrNombre === 'object') {
    const key = seccionOrNombre.layout_key;
    if (key && LEVEL_ORDER.includes(key)) return key;
    return sectionKey(seccionOrNombre.nombre);
  }

  const n = String(seccionOrNombre || '').toLowerCase();
  if (n.includes('platea')) return 'platea';
  if (n.includes('palco 1')) return 'palco1';
  if (n.includes('palco 2')) return 'palco2';
  if (n.includes('palco 3')) return 'palco3';
  return 'other';
}

export function layoutForSeccion(seccion, asientos) {
  const key = sectionKey(seccion);
  let layout = layoutPlatea(asientos);
  if (key === 'palco1') layout = layoutPalco1(asientos);
  else if (key === 'palco2') layout = layoutPalco2(asientos);
  else if (key === 'palco3') layout = layoutPalco3(asientos);

  if (seccion?.nombre && layout.footer) {
    layout = {
      ...layout,
      footer: { ...layout.footer, text: seccion.nombre },
    };
  }
  return layout;
}

export const LEVEL_ORDER = ['platea', 'palco1', 'palco2', 'palco3'];
