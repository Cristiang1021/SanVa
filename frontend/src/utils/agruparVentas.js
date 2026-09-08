/** Etiqueta de asiento desde una venta. */
export function seatLabelFromVenta(venta) {
  if (!venta?.asiento) return '—';
  return `${venta.asiento.fila ?? ''}${venta.asiento.numero ?? ''}`;
}

/**
 * Agrupa asientos de la misma compra
 * (mismo cliente / función / pago y mismo minuto).
 */
export function agruparVentas(ventas) {
  const map = new Map();

  for (const v of ventas) {
    const minuto = new Date(v.fecha_venta).toISOString().slice(0, 16);
    const key = [
      v.funcion_id,
      v.usuario_id || v.vendedor?.id || '',
      (v.cliente_nombre || '').trim().toLowerCase(),
      v.cliente_tel || '',
      (v.cliente_email || '').trim().toLowerCase(),
      v.metodo_pago || '',
      v.referencia_pago || '',
      minuto,
    ].join('|');

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        ventas: [],
        cliente_nombre: v.cliente_nombre,
        vendedor: v.vendedor,
        funcion: v.funcion,
        funcion_id: v.funcion_id,
        metodo_pago: v.metodo_pago,
        referencia_pago: v.referencia_pago,
        fecha_venta: v.fecha_venta,
      });
    }
    map.get(key).ventas.push(v);
  }

  return [...map.values()]
    .map((g) => {
      const sorted = [...g.ventas].sort((a, b) =>
        seatLabelFromVenta(a).localeCompare(seatLabelFromVenta(b), 'es', { numeric: true })
      );
      return {
        ...g,
        ventas: sorted,
        total: sorted.reduce((sum, v) => sum + (Number(v.precio_unitario) || 0), 0),
        asientosLabel: sorted.map(seatLabelFromVenta).join(', '),
      };
    })
    .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));
}

/** Opciones de evento/función derivadas de una lista de ventas. */
export function opcionesDesdeVentas(ventas) {
  const eventos = new Map();
  const funciones = new Map();

  for (const v of ventas) {
    const ev = v.funcion?.evento;
    const fn = v.funcion;
    if (ev?.id != null) {
      eventos.set(String(ev.id), { id: ev.id, nombre: ev.nombre || `Evento ${ev.id}` });
    }
    if (fn?.id != null) {
      funciones.set(String(fn.id), {
        id: fn.id,
        evento_id: fn.evento_id ?? ev?.id,
        label: [
          ev?.nombre,
          fn.fecha_hora ? new Date(fn.fecha_hora).toLocaleString() : null,
        ]
          .filter(Boolean)
          .join(' · ') || `Función ${fn.id}`,
      });
    }
  }

  return {
    eventos: [...eventos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    funciones: [...funciones.values()].sort((a, b) => a.label.localeCompare(b.label, 'es')),
  };
}
