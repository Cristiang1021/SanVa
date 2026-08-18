/** Origen del backend (sin /api). En producción con Vercel Services usa el mismo dominio. */
export const getApiOrigin = () => {
  const env = import.meta.env.VITE_API_URL;
  if (env !== undefined && env !== '') {
    return String(env).replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  return '';
};
