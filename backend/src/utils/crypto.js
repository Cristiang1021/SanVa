const crypto = require('crypto');

const ALGORITMO = 'aes-256-gcm';
const SALT = 'sanva-smtp-config';

const obtenerClave = () => {
  const secreto = process.env.JWT_SECRET || 'sanva_jwt_secret_local';
  return crypto.scryptSync(secreto, SALT, 32);
};

const encrypt = (texto) => {
  if (!texto) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${cifrado.toString('hex')}`;
};

const decrypt = (payload) => {
  if (!payload) return null;
  const partes = String(payload).split(':');
  if (partes.length !== 3) return null;

  const [ivHex, tagHex, dataHex] = partes;
  const decipher = crypto.createDecipheriv(
    ALGORITMO,
    obtenerClave(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const texto = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]);
  return texto.toString('utf8');
};

module.exports = { encrypt, decrypt };
