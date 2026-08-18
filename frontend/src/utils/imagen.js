const MAX_BYTES = 5 * 1024 * 1024;

export async function fileToDataUrl(file, maxWidth = 1200, quality = 0.85) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes.');
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const output = canvas.toDataURL('image/jpeg', quality);
  const base64 = output.split(',')[1] || '';
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > MAX_BYTES) {
    throw new Error('La imagen no puede superar 5 MB. Prueba con otra más pequeña.');
  }

  return output;
}
