import { useState, useRef } from 'react';
import { parseFile } from '../utils/parseClientes';

export default function UploadClientes({ onImport, onClear, loading }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ignorados, setIgnorados] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setParsing(true);
    setParsedData(null);
    setPreview(null);
    setIgnorados(0);
    try {
      const result = await parseFile(f);
      setParsedData(result.clientes);
      setPreview(result.preview);
      setIgnorados(result.ignorados);
    } catch (err) {
      alert(err.message);
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    const substituir = window.confirm('Substituir todos os clientes existentes?');
    setImporting(true);
    try {
      await onImport(parsedData, substituir);
      setFile(null);
      setPreview(null);
      setParsedData(null);
    } catch (err) {
      alert('Erro na importacao: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="panel">
      <h3>Clientes</h3>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        ref={fileRef}
        disabled={loading}
      />
      {parsing && <div className="file-info"><p>Processando arquivo... Isso pode levar alguns segundos para arquivos grandes.</p></div>}
      {file && !parsing && (
        <div className="file-info">
          <p>{file.name} ({parsedData ? `${parsedData.length} clientes` : 'erro ao processar'})</p>
          {ignorados > 0 && <p className="info-ignorados">{ignorados} linhas ignoradas (sem coordenadas validas)</p>}
          {preview && (
            <div className="preview-table">
              <table>
                <thead>
                  <tr>{preview[0].map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="btn-group">
        <button onClick={handleImport} disabled={!parsedData || loading || importing} className="btn-primary">
          {importing ? 'Importando...' : 'Importar'}
        </button>
        <button onClick={() => { onClear(); setFile(null); setPreview(null); setParsedData(null); }} disabled={loading || importing} className="btn-danger">
          Limpar base
        </button>
      </div>
    </div>
  );
}
