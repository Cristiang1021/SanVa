const MAX_BYTES = 5 * 1024 * 1024;

function parseImagenBase64(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  let dataUrl = trimmed;

  if (!trimmed.startsWith('data:')) {
    dataUrl = `data:image/jpeg;base64,${trimmed}`;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de imagen inválido.');
  }

  const mime = match[1].toLowerCase();
  if (!mime.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes.');
  }

  const base64 = match[2];
  const bytes = Buffer.byteLength(base64, 'base64');
  if (bytes > MAX_BYTES) {
    throw new Error('La imagen no puede superar 5 MB.');
  }

  return dataUrl;
}

module.exports = { parseImagenBase64, MAX_BYTES };
