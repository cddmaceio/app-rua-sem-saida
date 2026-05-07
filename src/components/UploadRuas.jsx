import { useState, useRef } from 'react';

export default function UploadRuas({ onImport, onClear, loading }) {
  const [file, setFile] = useState(null);
  const [features, setFeatures] = useState(null);
  const [ruasData, setRuasData] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    try {
      const text = await f.text();
      const geojson = JSON.parse(text);

      if (!geojson.features || !Array.isArray(geojson.features)) {
        throw new Error('Arquivo GeoJSON invalido: sem array features');
      }

      const parsedRuas = [];
      let skipCount = 0;

      for (const feature of geojson.features) {
        try {
          if (!feature.geometry) {
            skipCount++;
            continue;
          }
          const props = feature.properties || {};
          parsedRuas.push({
            osm_id: String(props['@id'] || props.osm_id || props.id || ''),
            nome: props.name || props.nome || '',
            geojson: JSON.stringify(feature.geometry),
          });
        } catch (e) {
          skipCount++;
        }
      }

      setFeatures(geojson.features.length);
      setRuasData(parsedRuas);

      if (skipCount > 0) {
        alert(`${skipCount} features ignoradas por geometria invalida`);
      }
    } catch (err) {
      alert('Erro ao processar GeoJSON: ' + err.message);
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!ruasData || ruasData.length === 0) return;
    const substituir = window.confirm('Substituir todas as ruas existentes?');
    setImporting(true);
    try {
      await onImport(ruasData, substituir);
      setFile(null);
      setFeatures(null);
      setRuasData(null);
    } catch (err) {
      alert('Erro na importacao: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="panel">
      <h3>Ruas Sem Saida</h3>
      <input
        type="file"
        accept=".geojson,.json"
        onChange={handleFileChange}
        ref={fileRef}
        disabled={loading}
      />
      {file && features !== null && (
        <div className="file-info">
          <p>{file.name}</p>
          <p>{ruasData.length} ruas importadas de {features} features</p>
          {features - ruasData.length > 0 && (
            <p className="info-ignorados">{features - ruasData.length} features ignoradas (geometria vazia/invalida)</p>
          )}
        </div>
      )}
      <div className="btn-group">
        <button onClick={handleImport} disabled={!ruasData || loading || importing} className="btn-primary">
          {importing ? 'Importando...' : 'Importar'}
        </button>
        <button onClick={() => { onClear(); setFile(null); setFeatures(null); setRuasData(null); }} disabled={loading || importing} className="btn-danger">
          Limpar base
        </button>
      </div>
    </div>
  );
}
