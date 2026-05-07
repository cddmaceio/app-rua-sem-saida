import { useState, useRef } from 'react';
import { parseFile } from '../utils/parseClientes';

export default function UploadClientes({ onImport, onClear, loading }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ignorados, setIgnorados] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    try {
      const result = await parseFile(f);
      setParsedData(result.clientes);
      setPreview(result.preview);
      setIgnorados(result.ignorados);
    } catch (err) {
      alert(err.message);
      setFile(null);
    }
  };

  const handleImport = () => {
    if (parsedData && parsedData.length > 0) {
      const substituir = window.confirm('Substituir todos os clientes existentes?');
      onImport(parsedData, substituir);
      setFile(null);
      setPreview(null);
      setParsedData(null);
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
      {file && (
        <div className="file-info">
          <p>{file.name} ({parsedData ? `${parsedData.length} clientes` : 'processando...'})</p>
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
        <button onClick={handleImport} disabled={!parsedData || loading} className="btn-primary">
          Importar
        </button>
        <button onClick={() => { onClear(); setFile(null); setPreview(null); setParsedData(null); }} disabled={loading} className="btn-danger">
          Limpar base
        </button>
      </div>
    </div>
  );
}
