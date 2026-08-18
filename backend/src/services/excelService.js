const ExcelJS = require('exceljs');

const dinero = (n) => `$${Number(n || 0).toFixed(2)}`;

const fechaLarga = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const generarExcelListaPuerta = async (res, { funcion, clientes, cantidad, total }) => {
  const evento = funcion?.evento?.nombre || 'Función';
  const cuando = fechaLarga(funcion?.fecha_hora);
  const lugar = funcion?.lugar || '';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SanVa Shows';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Lista de entrada', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  sheet.columns = [
    { key: 'cliente', width: 28 },
    { key: 'telefono', width: 16 },
    { key: 'email', width: 30 },
    { key: 'asientos', width: 24 },
    { key: 'pago', width: 14 },
    { key: 'boletos', width: 10 },
  ];

  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'SanVa Shows — Lista de entrada';
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF020202' } };

  sheet.mergeCells('A2:F2');
  sheet.getCell('A2').value = evento;
  sheet.getCell('A2').font = { bold: true, size: 12 };

  sheet.mergeCells('A3:F3');
  sheet.getCell('A3').value = [cuando, lugar].filter(Boolean).join(' · ');
  sheet.getCell('A3').font = { size: 11, color: { argb: 'FF666666' } };

  sheet.mergeCells('A4:F4');
  sheet.getCell('A4').value = `${cantidad} boletos · Total ${dinero(total)}`;
  sheet.getCell('A4').font = { size: 11, color: { argb: 'FF666666' } };

  const headerRow = sheet.getRow(5);
  headerRow.values = ['Cliente', 'Teléfono', 'Correo', 'Asientos', 'Pago', 'Boletos'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF0013' },
  };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;

  (clientes || []).forEach((c, i) => {
    const row = sheet.addRow({
      cliente: c.nombre,
      telefono: c.telefono || '',
      email: c.email || '',
      asientos: (c.asientos || []).join(', '),
      pago: c.metodos || '',
      boletos: c.cantidad,
    });
    if (i % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9F9F9' },
      };
    }
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E5E5' } },
          left: { style: 'thin', color: { argb: 'FFE5E5E5' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } },
          right: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const nombre = `lista-entrada-${funcion?.id || 'funcion'}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(Buffer.from(buffer));
};

module.exports = {
  generarExcelListaPuerta,
};
