import { useEffect, useMemo, useState } from 'react';
import { getEventos, getFunciones, getListaPuerta, downloadListaPuertaPdf, downloadListaPuertaExcel } from '../api';
import { descargarPdf, descargarExcel } from '../utils/download';

export default function ListaEntradaPanel({ allowDownload = false }) {
  const [eventos, setEventos] = useState([]);
  const [eventoId, setEventoId] = useState('');
  const [funciones, setFunciones] = useState([]);
  const [funcionId, setFuncionId] = useState('');
  const [lista, setLista] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [descargando, setDescargando] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await getEventos();
        setEventos(data.eventos || []);
      } catch {
        setError('Error al cargar eventos.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    if (!eventoId) {
      setFunciones([]);
      setFuncionId('');
      setLista(null);
      return;
    }
    const cargarFunciones = async () => {
      try {
        const { data } = await getFunciones(eventoId);
        setFunciones(data.funciones || []);
        setFuncionId('');
        setLista(null);
      } catch {
        setError('Error al cargar funciones.');
      }
    };
    cargarFunciones();
  }, [eventoId]);

  useEffect(() => {
    if (!funcionId) {
      setLista(null);
      return;
    }
    const cargarLista = async () => {
      setCargandoLista(true);
      setError('');
      try {
        const { data } = await getListaPuerta(funcionId);
        setLista(data);
      } catch (err) {
        setLista(null);
        setError(err.response?.data?.error || 'Error al cargar la lista.');
      } finally {
        setCargandoLista(false);
      }
    };
    cargarLista();
  }, [funcionId]);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const clientes = lista?.clientes || [];
    if (!q) return clientes;
    return clientes.filter((c) => {
      const asientos = (c.asientos || []).join(' ').toLowerCase();
      return (
        c.nombre.toLowerCase().includes(q)
        || (c.telefono || '').toLowerCase().includes(q)
        || (c.email || '').toLowerCase().includes(q)
        || asientos.includes(q)
      );
    });
  }, [lista, busqueda]);

  const handleDescargarPdf = async () => {
    if (!funcionId || !allowDownload) return;
    setDescargando('pdf');
    setError('');
    try {
      await descargarPdf(downloadListaPuertaPdf(funcionId), 'lista-entrada.pdf');
    } catch {
      setError('No se pudo descargar el PDF.');
    } finally {
      setDescargando('');
    }
  };

  const handleDescargarExcel = async () => {
    if (!funcionId || !allowDownload) return;
    setDescargando('excel');
    setError('');
    try {
      await descargarExcel(downloadListaPuertaExcel(funcionId), 'lista-entrada.xlsx');
    } catch {
      setError('No se pudo descargar el Excel.');
    } finally {
      setDescargando('');
    }
  };

  if (loading) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Lista de entrada</h2>
          <p className="text-gray-600 text-sm mt-1">
            Verifica a los clientes cuando lleguen a la función.
          </p>
        </div>
        {allowDownload && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDescargarPdf}
              disabled={!funcionId || !!descargando}
              className="px-4 py-2 border border-gray-300 bg-white text-ink rounded-lg hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
            >
              {descargando === 'pdf' ? 'Descargando…' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={handleDescargarExcel}
              disabled={!funcionId || !!descargando}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium disabled:opacity-50"
            >
              {descargando === 'excel' ? 'Descargando…' : 'Excel'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-600 text-ink mb-2">Evento</label>
          <select
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecciona un evento</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>{evento.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-600 text-ink mb-2">Función</label>
          <select
            value={funcionId}
            onChange={(e) => setFuncionId(e.target.value)}
            disabled={!eventoId}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
          >
            <option value="">Selecciona una función</option>
            {funciones.map((funcion) => (
              <option key={funcion.id} value={funcion.id}>
                {new Date(funcion.fecha_hora).toLocaleString()} {funcion.lugar ? `· ${funcion.lugar}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-600 text-ink mb-2">Buscar</label>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, teléfono, correo o asiento"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {lista && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-gray-600 text-sm font-600">Clientes</p>
            <p className="text-3xl font-bold text-primary">{lista.clientes.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-gray-600 text-sm font-600">Boletos</p>
            <p className="text-3xl font-bold text-primary">{lista.cantidad}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-gray-600 text-sm font-600">Total</p>
            <p className="text-3xl font-bold text-primary">${Number(lista.total || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {cargandoLista ? (
        <p className="text-gray-500">Cargando lista…</p>
      ) : !funcionId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Elige evento y función para ver la lista.
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No hay coincidencias en esta función.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Teléfono</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Correo</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Asientos</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Pago</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-ink">Boletos</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={`${cliente.nombre}-${cliente.telefono}-${cliente.email}`} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-600 text-ink">{cliente.nombre}</td>
                    <td className="px-6 py-4 text-body">{cliente.telefono || '—'}</td>
                    <td className="px-6 py-4 text-body">{cliente.email || '—'}</td>
                    <td className="px-6 py-4 text-body font-600 text-primary">
                      {(cliente.asientos || []).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-body capitalize">{cliente.metodos || '—'}</td>
                    <td className="px-6 py-4 text-body">{cliente.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
