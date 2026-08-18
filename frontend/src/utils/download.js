export async function descargarBlob(promesa, nombreArchivo, tipo) {
  const response = await promesa;
  const blob = new Blob([response.data], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function descargarPdf(promesa, nombreArchivo) {
  return descargarBlob(promesa, nombreArchivo, 'application/pdf');
}

export async function descargarExcel(promesa, nombreArchivo) {
  return descargarBlob(
    promesa,
    nombreArchivo,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
