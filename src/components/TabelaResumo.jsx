import { memo, useState, useMemo } from 'react';

const PAGE_SIZE = 50;

function TabelaResumo({ clientes, filtros, onFiltroChange }) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(clientes.length / PAGE_SIZE));

  const paginaClientes = useMemo(() => {
    const inicio = pagina * PAGE_SIZE;
    return clientes.slice(inicio, inicio + PAGE_SIZE);
  }, [clientes, pagina]);

  useMemo(() => {
    if (pagina >= totalPaginas) setPagina(Math.max(0, totalPaginas - 1));
  }, [totalPaginas]);

  const columns = [
    { key: 'codigo_cliente', label: 'Codigo' },
    { key: 'nome_cliente', label: 'Nome' },
    { key: 'setor', label: 'Setor' },
    { key: 'endereco', label: 'Endereco' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'sem_saida', label: 'Sem Saida' },
    { key: 'distancia_metros', label: 'Distancia (m)' },
  ];

  const handleSemSaidaClick = () => {
    const next = filtros.sem_saida === 'Sim' ? 'Nao' : filtros.sem_saida === 'Nao' ? '' : 'Sim';
    onFiltroChange(f => ({ ...f, sem_saida: next }));
    setPagina(0);
  };

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <span>{clientes.length} clientes encontrados</span>
        {totalPaginas > 1 && (
          <div className="pagination">
            <button onClick={() => setPagina(0)} disabled={pagina === 0}>{'<<'}</button>
            <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}>{'<'}</button>
            <span className="page-info">Pag {pagina + 1} de {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>{'>'}</button>
            <button onClick={() => setPagina(totalPaginas - 1)} disabled={pagina >= totalPaginas - 1}>{'>>'}</button>
          </div>
        )}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.key === 'sem_saida' ? 'clickable' : ''}
                onClick={col.key === 'sem_saida' ? handleSemSaidaClick : undefined}
              >
                {col.label}
                {col.key === 'sem_saida' && (
                  <span className="filter-indicator">
                    {filtros.sem_saida ? ` (${filtros.sem_saida === 'Sim' ? 'Sim' : 'Nao'})` : ' (Todos)'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginaClientes.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center">Nenhum cliente encontrado</td></tr>
          ) : (
            paginaClientes.map(cliente => (
              <tr key={cliente.id}>
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={col.key === 'sem_saida' ? (cliente.sem_saida === 'Sim' ? 'td-sim' : 'td-nao') : ''}
                  >
                    {col.key === 'distancia_metros' && cliente.distancia_metros != null
                      ? `${cliente.distancia_metros}m`
                      : (cliente[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default memo(TabelaResumo);
