import { useState, useCallback, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import UploadClientes from './components/UploadClientes';
import UploadRuas from './components/UploadRuas';
import PainelConfiguracao from './components/PainelConfiguracao';
import PainelResumo from './components/PainelResumo';
import MapaClientes from './components/MapaClientes';
import TabelaResumo from './components/TabelaResumo';
import * as api from './api';

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [ruas, setRuas] = useState([]);
  const [config, setConfig] = useState({ raio_busca: 50 });
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ sem_saida: '', setor: '', busca: '' });
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  const clearError = () => setError(null);

  const carregarClientes = useCallback(async (overrideFiltros) => {
    try {
      const f = overrideFiltros || filtros;
      const data = await api.getClientes(f);
      setClientes(data);
    } catch (e) {
      setError(e.message);
    }
  }, [filtros]);

  const carregarRuas = useCallback(async () => {
    try {
      const data = await api.getRuas();
      setRuas(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const carregarResumo = useCallback(async () => {
    try {
      const data = await api.getResumo();
      setResumo(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const carregarConfig = useCallback(async () => {
    try {
      const data = await api.getConfiguracao();
      setConfig(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    carregarConfig();
    carregarRuas();
    carregarClientes();
    carregarResumo();
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    carregarClientes();
    carregarResumo();
  }, [filtros]);

  const handleImportClientes = async (clientesData, substituir) => {
    setLoading(true);
    clearError();
    try {
      const result = await api.importarClientes(clientesData, substituir);
      setFiltros({ sem_saida: '', setor: '', busca: '' });
      await carregarClientes({ sem_saida: '', setor: '', busca: '' });
      await carregarResumo();
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const handleClearClientes = async () => {
    setLoading(true);
    clearError();
    try {
      await api.deletarClientes();
      setClientes([]);
      setResumo(null);
      setFiltros({ sem_saida: '', setor: '', busca: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportRuas = async (ruasData, substituir) => {
    setLoading(true);
    clearError();
    try {
      const result = await api.importarRuas(ruasData, substituir);
      await carregarRuas();
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const handleClearRuas = async () => {
    setLoading(true);
    clearError();
    try {
      await api.deletarRuas();
      setRuas([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (raio_busca) => {
    clearError();
    try {
      await api.atualizarConfiguracao(raio_busca);
      setConfig({ raio_busca });
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRecalcular = async () => {
    setLoading(true);
    clearError();
    try {
      const result = await api.recalcular();
      setFiltros({ sem_saida: 'Sim', setor: '', busca: '' });
      await carregarClientes({ sem_saida: 'Sim', setor: '', busca: '' });
      await carregarResumo();
      const pct = result.total_clientes > 0 ? Math.round((result.em_rua_sem_saida / result.total_clientes) * 100) : 0;
      let msg = `Recalculo concluido em ${result.tempo_segundos || '?'}s!\n`;
      msg += `${result.processados} clientes processados.\n`;
      msg += `${result.em_rua_sem_saida} em rua sem saida (${pct}%).\n`;
      msg += `${result.total_ruas} ruas (${result.ruas_validas || result.total_ruas} geometricas validas).`;
      if (result.falhas_turf > 0) msg += `\nAVISO: ${result.falhas_turf} falhas no calculo Turf.js.`;
      alert(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => {
    window.open(api.getExportarUrl(), '_blank');
  };

  const setoresUnicos = [...new Set(clientes.map(c => c.setor).filter(Boolean))].sort();

  const filtrosBar = (
    <div className="filtros-bar">
      <label>
        <input
          type="radio"
          name="sem_saida"
          value="Sim"
          checked={filtros.sem_saida === 'Sim'}
          onChange={(e) => setFiltros(f => ({ ...f, sem_saida: e.target.value }))}
        />
        Apenas Sim
      </label>
      <label>
        <input
          type="radio"
          name="sem_saida"
          value="Nao"
          checked={filtros.sem_saida === 'Nao'}
          onChange={(e) => setFiltros(f => ({ ...f, sem_saida: e.target.value }))}
        />
        Apenas Nao
      </label>
      <label>
        <input
          type="radio"
          name="sem_saida"
          value=""
          checked={filtros.sem_saida === ''}
          onChange={(e) => setFiltros(f => ({ ...f, sem_saida: '' }))}
        />
        Todos
      </label>
      <select
        value={filtros.setor}
        onChange={(e) => setFiltros(f => ({ ...f, setor: e.target.value }))}
        className="filtro-setor"
      >
        <option value="">Todos os setores</option>
        {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        type="text"
        placeholder="Buscar codigo ou nome..."
        value={filtros.busca}
        onChange={(e) => setFiltros(f => ({ ...f, busca: e.target.value }))}
        className="filtro-busca"
      />
      <button onClick={() => setFiltros({ sem_saida: '', setor: '', busca: '' })} className="btn-sm">
        Limpar filtros
      </button>
    </div>
  );

  const sidebar = (
    <>
      <UploadClientes onImport={handleImportClientes} onClear={handleClearClientes} loading={loading} />
      <UploadRuas onImport={handleImportRuas} onClear={handleClearRuas} loading={loading} />
      <PainelConfiguracao
        config={config}
        onRecalcular={handleRecalcular}
        onConfigChange={handleConfigChange}
        loading={loading}
        onExportar={handleExportar}
      />
      <PainelResumo resumo={resumo} />
    </>
  );

  return (
    <>
      {error && (
        <div className="error-banner" onClick={clearError}>
          {error} (clique para fechar)
        </div>
      )}
      {loading && <div className="loading-overlay">Processando...</div>}
      <Layout sidebar={sidebar} filtros={filtrosBar}>
        <MapaClientes clientes={clientes} ruas={ruas} />
        <TabelaResumo clientes={clientes} filtros={filtros} onFiltroChange={setFiltros} />
      </Layout>
    </>
  );
}
