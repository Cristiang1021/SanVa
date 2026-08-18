import ListaEntradaPanel from '../components/ListaEntradaPanel';

export default function ReportesVendedor() {
  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-ink mb-8">Reportes</h1>
      <ListaEntradaPanel allowDownload={false} />
    </div>
  );
}
