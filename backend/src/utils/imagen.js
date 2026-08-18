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
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length > MAX_BYTES) {
    throw new Error('La imagen no puede superar 5 MB.');
  }

  return { buffer, mime };
}

function imagenDesdeBody(body) {
  if (body?.imagen_base64 === undefined) return undefined;
  if (body.imagen_base64 === '' || body.imagen_base64 === null) {
    return { imagen_data: null, imagen_mime: null, imagen_url: null };
  }

  const parsed = parseImagenBase64(body.imagen_base64);
  return {
    imagen_data: parsed.buffer,
    imagen_mime: parsed.mime,
    imagen_url: null,
  };
}

function toNodeBuffer(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') {
    if (data.startsWith('data:')) return parseImagenBase64(data).buffer;
    return Buffer.from(data, 'base64');
  }
  if (data.type === 'Buffer' && Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }
  return Buffer.from(data);
}

function serializarEvento(evento) {
  const json = evento.toJSON();
  delete json.imagen_data;

  if (json.imagen_mime) {
    json.imagen_url = `/api/eventos/${evento.id}/imagen`;
  } else if (typeof json.imagen_url === 'string' && json.imagen_url.startsWith('data:')) {
    json.imagen_url = `/api/eventos/${evento.id}/imagen`;
  } else if (!json.imagen_url || json.imagen_url.startsWith('/uploads/')) {
    json.imagen_url = null;
  }

  delete json.imagen_mime;
  return json;
}

module.exports = {
  parseImagenBase64,
  imagenDesdeBody,
  serializarEvento,
  toNodeBuffer,
  MAX_BYTES,
};
