export default function TabelaResumo({ clientes, filtros, onFiltroChange }) {
  const columns = [
    { key: 'codigo_cliente', label: 'Codigo' },
    { key: 'nome_cliente', label: 'Nome' },
    { key: 'setor', label: 'Setor' },
    { key: 'endereco', label: 'Endereco' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'sem_saida', label: 'Sem Saida' },
    { key: 'distancia_metros', label: 'Distancia (m)' },
  ];

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <span>{clientes.length} clientes encontrados</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.key === 'sem_saida' ? 'clickable' : ''}
                onClick={() => {
                  if (col.key === 'sem_saida') {
                    const next = filtros.sem_saida === 'Sim' ? 'Nao' : filtros.sem_saida === 'Nao' ? '' : 'Sim';
                    onFiltroChange(f => ({ ...f, sem_saida: next }));
                  }
                }}
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
          {clientes.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center">Nenhum cliente encontrado</td></tr>
          ) : (
            clientes.map(cliente => (
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
