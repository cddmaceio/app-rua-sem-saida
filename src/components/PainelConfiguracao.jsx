import { memo, useState } from 'react';

const PRESETS = [20, 30, 40, 50, 75, 100];

function PainelConfiguracao({ config, onRecalcular, onConfigChange, loading, onExportar }) {
  const [customRaio, setCustomRaio] = useState('');

  const handlePreset = (r) => {
    setCustomRaio('');
    onConfigChange(r, null);
  };

  const handleCustom = () => {
    const val = parseInt(customRaio, 10);
    if (val > 0) {
      onConfigChange(val, null);
    }
  };

  const handleModoChange = (e) => {
    onConfigChange(null, e.target.value);
  };

  return (
    <div className="panel">
      <h3>Configuracao</h3>

      <div className="modo-selector">
        <label>Modo de calculo:</label>
        <select value={config.modo_calculo || 'ponto_final'} onChange={handleModoChange} disabled={loading} className="modo-select">
          <option value="ponto_final">Distancia do ponto final da rua</option>
          <option value="distancia_rua">Distancia de toda a rua</option>
        </select>
        <p className="modo-desc">
          {config.modo_calculo === 'distancia_rua'
            ? 'Calcula a distancia minima ate qualquer ponto da rua. Pode incluir clientes em ruas vizinhas.'
            : 'Calcula a distancia apenas ate a extremidade da rua sem saida. Evita falsos positivos em ruas paralelas.'}
        </p>
      </div>

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

export default memo(PainelConfiguracao);
