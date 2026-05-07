export default function PainelResumo({ resumo }) {
  if (!resumo) {
    return (
      <div className="panel">
        <h3>Resumo</h3>
        <p className="text-muted">Importe dados e recalcule para ver o resumo.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Clientes', value: resumo.total_clientes },
    { label: 'Em Rua Sem Saida', value: resumo.em_rua_sem_saida, color: '#e74c3c' },
    { label: 'Fora', value: resumo.fora, color: '#3498db' },
    { label: 'Total Ruas', value: resumo.total_ruas },
    { label: 'Raio Atual', value: `${resumo.raio_busca}m` },
    { label: 'Percentual', value: `${resumo.percentual}%`, color: resumo.percentual > 0 ? '#e67e22' : undefined },
  ];

  return (
    <div className="panel">
      <h3>Resumo</h3>
      <div className="cards-grid">
        {cards.map((card, i) => (
          <div key={i} className="card" style={card.color ? { borderLeftColor: card.color } : {}}>
            <div className="card-value" style={card.color ? { color: card.color } : {}}>{card.value}</div>
            <div className="card-label">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
