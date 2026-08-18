import { useEffect, useState } from 'react';
import { getReporteDashboard } from '../../api';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await getReporteDashboard();
      setDashboard(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-ink mb-8">Dashboard</h1>

      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-600 mb-2">Eventos Activos</p>
            <p className="text-4xl font-bold text-primary">{dashboard.eventos_activos}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-600 mb-2">Funciones Activas</p>
            <p className="text-4xl font-bold text-primary">{dashboard.funciones_activas}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-600 mb-2">Ventas Hoy</p>
            <p className="text-4xl font-bold text-primary">{dashboard.ventas_hoy.cantidad}</p>
            <p className="text-gray-500 text-xs mt-2">${dashboard.ventas_hoy.total.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm font-600 mb-2">Vendedores Activos</p>
            <p className="text-4xl font-bold text-primary">{dashboard.vendedores_activos}</p>
          </div>
        </div>
      )}
    </div>
  );
}
