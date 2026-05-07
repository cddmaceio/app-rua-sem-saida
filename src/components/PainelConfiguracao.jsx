import { useState } from 'react';

const PRESETS = [20, 30, 40, 50, 75, 100];

export default function PainelConfiguracao({ config, onRecalcular, onConfigChange, loading, onExportar }) {
  const [customRaio, setCustomRaio] = useState('');

  const handlePreset = (r) => {
    setCustomRaio('');
    onConfigChange(r);
  };

  const handleCustom = () => {
    const val = parseInt(customRaio, 10);
    if (val > 0) {
      onConfigChange(val);
    }
  };

  return (
    <div className="panel">
      <h3>Configuracao</h3>
      <div className="raio-selector">
        <label>Raio de busca:</label>
        <div className="preset-btns">
          {PRESETS.map(r => (
            <button
              key={r}
              onClick={() => handlePreset(r)}
              className={`btn-preset ${config.raio_busca === r ? 'active' : ''}`}
              disabled={loading}
            >
              {r}m
            </button>
          ))}
        </div>
        <div className="custom-raio">
          <input
            type="number"
            placeholder="Personalizado (m)"
            value={customRaio}
            onChange={(e) => setCustomRaio(e.target.value)}
            min="1"
            disabled={loading}
          />
          <button onClick={handleCustom} disabled={loading || !customRaio}>Aplicar</button>
        </div>
      </div>
      <p className="raio-atual">Raio atual: <strong>{config.raio_busca}m</strong></p>
      <div className="btn-group">
        <button onClick={onRecalcular} disabled={loading} className="btn-primary btn-wide">
          {loading ? 'Recalculando...' : 'Recalcular Analise'}
        </button>
        <button onClick={onExportar} disabled={loading} className="btn-export">
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
