import client from './client';
import { getApiOrigin } from './config';

const API_ORIGIN = getApiOrigin();

export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path}`;
};

// ===== AUTH =====
export const login = (username, password) =>
  client.post('/auth/login', { username, password });

export const getCurrentUser = () => client.get('/auth/me');

export const logout = () => client.post('/auth/logout');

export const changePassword = (passwordActual, passwordNueva) =>
  client.post('/auth/cambiar-password', { passwordActual, passwordNueva });

export const forgotPassword = (email) =>
  client.post('/auth/forgot-password', { email });

export const verifyResetToken = (token) =>
  client.get(`/auth/verify-reset-token/${token}`);

export const resetPassword = (token, passwordNueva) =>
  client.post('/auth/reset-password', { token, passwordNueva });

// ===== EVENTOS =====
export const getEventos = () => client.get('/eventos');

export const getEvento = (id) => client.get(`/eventos/${id}`);

export const inicializarTeatro = (id) =>
  client.post(`/eventos/${id}/inicializar`);

export const createEvento = (data) => client.post('/eventos', data);

export const updateEvento = (id, data) => client.put(`/eventos/${id}`, data);

export const deleteEvento = (id) => client.delete(`/eventos/${id}`);

// ===== USUARIOS / VENDEDORES =====
export const getVendedores = () => client.get('/usuarios?rol=vendedor');

export const createVendedor = (data) => client.post('/usuarios', data);

export const updateVendedor = (id, data) => client.put(`/usuarios/${id}`, data);

export const deleteVendedor = (id) => client.delete(`/usuarios/${id}`);

export const invitarVendedor = (data) => client.post('/usuarios/invitar', data);

export const getAdministradores = () => client.get('/usuarios?rol=admin');

export const createAdministrador = (data) => client.post('/usuarios/admin', data);

export const invitarAdministrador = (data) => client.post('/usuarios/admin/invitar', data);

export const reenviarInvitacion = (id) =>
  client.post(`/usuarios/${id}/reenviar-invitacion`);

// ===== SECCIONES =====
export const getSecciones = (eventoId) =>
  client.get(`/secciones/evento/${eventoId}`);

export const getSeccion = (id) => client.get(`/secciones/${id}`);

export const createSeccion = (data) => client.post('/secciones', data);

export const updateSeccion = (id, data) => client.put(`/secciones/${id}`, data);

export const deleteSeccion = (id) => client.delete(`/secciones/${id}`);

// ===== ASIENTOS =====
export const getAsientos = (seccionId) =>
  client.get(`/asientos/seccion/${seccionId}`);

export const generarAsientos = (seccionId, data) =>
  client.post('/asientos/generar', { seccion_id: seccionId, ...data });

export const updateAsiento = (id, data) =>
  client.put(`/asientos/${id}`, data);

export const bloquearAsiento = (id) =>
  client.put(`/asientos/${id}/bloquear`);

export const reservarAsiento = (id) =>
  client.post(`/asientos/${id}/reservar`);

export const liberarAsiento = (id) =>
  client.post(`/asientos/${id}/liberar`);

export const bloquearAsientosMasivo = (data) =>
  client.post('/asientos/bloquear-masivo', data);

export const deleteAsientosPorSeccion = (seccionId) =>
  client.delete(`/asientos/seccion/${seccionId}`);

// ===== FUNCIONES =====
export const getFunciones = (eventoId) =>
  client.get(`/funciones/evento/${eventoId}`);

export const getFuncion = (id) => client.get(`/funciones/${id}`);

export const getEstadoFuncion = (id) =>
  client.get(`/funciones/${id}/estado`);

export const createFuncion = (data) => client.post('/funciones', data);

export const updateFuncion = (id, data) =>
  client.put(`/funciones/${id}`, data);

export const deleteFuncion = (id) => client.delete(`/funciones/${id}`);

// ===== VENTAS =====
export const registrarVenta = (data) => client.post('/ventas', data);

export const getVentasPorFuncion = (funcionId) =>
  client.get(`/ventas/funcion/${funcionId}`);

export const getVentasPorVendedor = (usuarioId) =>
  client.get(`/ventas/vendedor/${usuarioId}`);

export const getMisVentas = () => client.get('/ventas/mis-ventas');

export const cancelarVenta = (id) => client.delete(`/ventas/${id}`);

// ===== REPORTES =====
export const getReporteDashboard = () => client.get('/reportes/dashboard');

export const getReporteVentas = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return client.get(`/reportes/ventas?${params}`);
};

export const getReporteRanking = () => client.get('/reportes/vendedores');

export const getReporteEstadisticas = (funcionId) =>
  client.get(`/reportes/funcion/${funcionId}`);

export const downloadReporteVentasPdf = (filters = {}) => {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  ).toString();
  return client.get(`/reportes/ventas.pdf${params ? `?${params}` : ''}`, {
    responseType: 'blob',
  });
};

export const downloadRankingPdf = (filters = {}) => {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  ).toString();
  return client.get(`/reportes/vendedores.pdf${params ? `?${params}` : ''}`, {
    responseType: 'blob',
  });
};

export const getListaPuerta = (funcionId) =>
  client.get(`/reportes/lista-puerta?funcion_id=${funcionId}`);

export const downloadListaPuertaPdf = (funcionId) =>
  client.get(`/reportes/lista-puerta.pdf?funcion_id=${funcionId}`, {
    responseType: 'blob',
  });

export const downloadListaPuertaExcel = (funcionId) =>
  client.get(`/reportes/lista-puerta.xlsx?funcion_id=${funcionId}`, {
    responseType: 'blob',
  });

// ===== CONFIGURACIÓN SMTP =====
export const getSmtpConfig = () => client.get('/configuracion/smtp');

export const saveSmtpConfig = (data) => client.put('/configuracion/smtp', data);

export const testSmtpConfig = (email) =>
  client.post('/configuracion/smtp/probar', { email });
