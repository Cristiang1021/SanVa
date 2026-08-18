const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const COLOR = '#FF0013';
const LOGO = path.join(__dirname, '../../assets/email/logo-sanva.png');

const dinero = (n) => `$${Number(n || 0).toFixed(2)}`;

const fechaCorta = (valor) => {
  if (!valor) return '—';
  try {
    return new Date(valor).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(valor);
  }
};

const fechaLarga = (valor) => {
  if (!valor) return '';
  try {
    return new Date(valor).toLocaleString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(valor);
  }
};

const dibujarEncabezado = (doc, titulo, subtitulo) => {
  if (fs.existsSync(LOGO)) {
    doc.image(LOGO, 40, 28, { width: 78 });
  }
  doc.fillColor(COLOR).font('Helvetica-Bold').fontSize(18)
    .text('San Valentin', 130, 36, { width: doc.page.width - 180 });
  doc.fillColor('#111111').fontSize(13)
    .text(titulo, 130, 58, { width: doc.page.width - 180 });
  if (subtitulo) {
    doc.fillColor('#666666').font('Helvetica').fontSize(9)
      .text(subtitulo, 130, 76, { width: doc.page.width - 180 });
  }
  doc.moveTo(40, 112).lineTo(doc.page.width - 40, 112)
    .strokeColor(COLOR).lineWidth(2).stroke();
  doc.y = 124;
};

const piePagina = (doc) => {
  const bottom = doc.page.height - 32;
  doc.font('Helvetica').fontSize(8).fillColor('#888888');
  doc.text(
    `Generado ${fechaCorta(new Date())}  ·  San Valentin`,
    40,
    bottom,
    { width: doc.page.width - 80, align: 'center' }
  );
};

const asegurarEspacio = (doc, alto) => {
  if (doc.y + alto > doc.page.height - 48) {
    doc.addPage();
    piePagina(doc);
    doc.y = 40;
  }
};

const dibujarTabla = (doc, columnas, filas) => {
  const x0 = 40;
  const anchoTotal = doc.page.width - 80;
  const sumaFracciones = columnas.reduce((s, c) => s + c.w, 0);
  const anchos = columnas.map((c) => (c.w / sumaFracciones) * anchoTotal);

  const pintarCabecera = () => {
    asegurarEspacio(doc, 22);
    const y = doc.y;
    doc.rect(x0, y, anchoTotal, 20).fill(COLOR);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    let x = x0;
    columnas.forEach((col, i) => {
      doc.text(col.label, x + 4, y + 6, { width: anchos[i] - 8, lineBreak: false });
      x += anchos[i];
    });
    doc.y = y + 20;
  };

  pintarCabecera();

  filas.forEach((fila, idx) => {
    const valores = columnas.map((col) => String(fila[col.key] ?? '—'));
    const altos = valores.map((texto, i) =>
      doc.heightOfString(texto, { width: anchos[i] - 8 })
    );
    const altoFila = Math.max(18, ...altos) + 6;

    if (doc.y + altoFila > doc.page.height - 48) {
      doc.addPage();
      piePagina(doc);
      doc.y = 40;
      pintarCabecera();
    }

    const y = doc.y;
    if (idx % 2 === 0) {
      doc.rect(x0, y, anchoTotal, altoFila).fill('#f7f7f7');
    }

    doc.font('Helvetica').fontSize(8).fillColor('#222222');
    let x = x0;
    valores.forEach((texto, i) => {
      doc.text(texto, x + 4, y + 4, { width: anchos[i] - 8 });
      x += anchos[i];
    });
    doc.y = y + altoFila;
  });
};

const crearDocumento = (res, filename, options, render) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: options.layout || 'portrait',
    margin: 40,
    info: {
      Title: options.title || 'Reporte San Valentin',
      Author: 'San Valentin'
    }
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  dibujarEncabezado(doc, options.title, options.subtitle);
  render(doc);
  piePagina(doc);
  doc.end();
};

const generarPdfVentas = (res, { ventas, total, cantidad, filtros }) => {
  const rango = [filtros?.fecha_inicio, filtros?.fecha_fin].filter(Boolean).join(' a ')
    || 'Todas las fechas';

  crearDocumento(res, 'reporte-ventas.pdf', {
    title: 'Reporte de ventas',
    subtitle: `Período: ${rango}  ·  ${cantidad || 0} boletos  ·  Total ${dinero(total)}`
  }, (doc) => {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111')
      .text('Resumen', 40, doc.y);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10).fillColor('#333333')
      .text(`Boletos vendidos: ${cantidad || 0}`);
    doc.text(`Total recaudado: ${dinero(total)}`);
    doc.moveDown(1);

    const filas = (ventas || []).map((v) => ({
      cliente: v.cliente_nombre || '—',
      vendedor: v.vendedor?.nombre_completo || '—',
      evento: v.funcion?.evento?.nombre || '—',
      asiento: `${v.asiento?.seccion?.nombre ? `${v.asiento.seccion.nombre} ` : ''}${v.asiento?.fila || ''}${v.asiento?.numero ?? ''}`,
      pago: [v.metodo_pago, v.referencia_pago].filter(Boolean).join(' / ') || '—',
      monto: dinero(v.precio_unitario),
      fecha: fechaCorta(v.fecha_venta)
    }));

    dibujarTabla(doc, [
      { key: 'cliente', label: 'Cliente', w: 2 },
      { key: 'vendedor', label: 'Vendedor', w: 1.6 },
      { key: 'evento', label: 'Evento', w: 1.8 },
      { key: 'asiento', label: 'Asiento', w: 1.4 },
      { key: 'pago', label: 'Pago', w: 1.3 },
      { key: 'monto', label: 'Monto', w: 1 },
      { key: 'fecha', label: 'Fecha', w: 1.4 }
    ], filas);

    if (!filas.length) {
      doc.moveDown().font('Helvetica').fontSize(10).fillColor('#666')
        .text('No hay ventas en este período.');
    }
  });
};

const generarPdfRanking = (res, { ranking, totales }) => {
  crearDocumento(res, 'ranking-vendedores.pdf', {
    title: 'Ranking de vendedores',
    subtitle: `${totales?.cantidad || 0} boletos  ·  Total ${dinero(totales?.total)}`
  }, (doc) => {
    const filas = (ranking || []).map((item, i) => ({
      pos: String(i + 1),
      vendedor: item.vendedor?.nombre_completo || '—',
      ventas: String(item.cantidad_ventas ?? 0),
      total: dinero(item.total_vendido)
    }));

    dibujarTabla(doc, [
      { key: 'pos', label: '#', w: 0.5 },
      { key: 'vendedor', label: 'Vendedor', w: 4 },
      { key: 'ventas', label: 'Boletos', w: 1.2 },
      { key: 'total', label: 'Total', w: 1.5 }
    ], filas);
  });
};

const generarPdfListaPuerta = (res, { funcion, clientes, cantidad, total }) => {
  const evento = funcion?.evento?.nombre || 'Función';
  const cuando = fechaLarga(funcion?.fecha_hora);
  const lugar = funcion?.lugar || '';

  crearDocumento(res, 'lista-entrada.pdf', {
    layout: 'landscape',
    title: 'Lista de entrada',
    subtitle: [evento, cuando, lugar].filter(Boolean).join('  ·  ')
      + `  ·  ${cantidad} boletos  ·  ${dinero(total)}`
  }, (doc) => {
    doc.font('Helvetica').fontSize(9).fillColor('#555555')
      .text('Use esta lista en puerta para verificar al cliente por nombre, teléfono o asiento.', 40, doc.y);
    doc.moveDown(0.8);

    const filas = (clientes || []).map((c) => ({
      cliente: c.nombre,
      tel: c.telefono || '—',
      email: c.email || '—',
      asientos: (c.asientos || []).join(', '),
      pago: c.metodos || '—',
      boletos: String(c.cantidad)
    }));

    dibujarTabla(doc, [
      { key: 'cliente', label: 'Cliente', w: 2.2 },
      { key: 'tel', label: 'Teléfono', w: 1.3 },
      { key: 'email', label: 'Correo', w: 2.2 },
      { key: 'asientos', label: 'Asientos', w: 2.6 },
      { key: 'pago', label: 'Pago', w: 1.2 },
      { key: 'boletos', label: 'Boletos', w: 0.8 }
    ], filas);

    if (!filas.length) {
      doc.moveDown().text('Aún no hay ventas para esta función.');
    }
  });
};

module.exports = {
  dinero,
  fechaCorta,
  fechaLarga,
  generarPdfVentas,
  generarPdfRanking,
  generarPdfListaPuerta
};
