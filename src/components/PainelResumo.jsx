import { memo } from 'react';

function PainelResumo({ resumo }) {
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
    { label: 'Em Rua Sem Saida', value: resumo.em_rua_sem_saida, color: '#27ae60' },
    { label: 'Fora', value: resumo.fora, color: '#3498db' },
    { label: 'Total Ruas', value: resumo.total_ruas },
    { label: 'Raio Atual', value: `${resumo.raio_busca}m` },
    { label: 'Percentual', value: `${resumo.percentual}%`, color: resumo.percentual > 0 ? '#27ae60' : undefined },
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

export default memo(PainelResumo);
