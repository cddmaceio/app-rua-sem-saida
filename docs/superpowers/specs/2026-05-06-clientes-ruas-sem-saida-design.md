# Design: Sistema de Análise de Clientes em Ruas Sem Saída — Maceió/AL

**Data:** 2026-05-06
**Status:** Aprovado

## Visão Geral

Aplicação local full-stack para identificar clientes localizados próximos a ruas sem saída em Maceió/AL. O usuário importa uma base de clientes (Excel/CSV) e uma base de ruas sem saída (GeoJSON do Overpass Turbo), configura um raio de busca em metros, e o sistema calcula quais clientes estão dentro do raio de alguma rua sem saída.

## Stack

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Frontend   | Vite + React (JavaScript)           |
| Backend    | Express (Node.js)                   |
| Banco      | SQLite via `better-sqlite3`         |
| Mapa       | Leaflet + React-Leaflet             |
| Geo        | Turf.js (backend)                   |
| Planilhas  | SheetJS/xlsx (frontend + backend)   |
| Dev runner | concurrently                        |

## Arquitetura

```
┌──────────────┐     proxy /api     ┌──────────────┐
│  Vite :5173  │ ──────────────────→│ Express :3001 │
│  React SPA   │                    │  Turf.js      │
│  SheetJS     │                    │  better-sqlite3│
│  Leaflet     │                    │               │
└──────────────┘                    └──────┬────────┘
                                           │
                                    ┌──────┴────────┐
                                    │  SQLite       │
                                    │  data/app.sqlite│
                                    └───────────────┘
```

O frontend faz parse dos arquivos (SheetJS no browser) e envia os dados crus para o backend. O backend gerencia o banco e executa os cálculos geoespaciais pesados com Turf.js. O frontend consulta os dados via API REST e renderiza o mapa e tabelas.

## Fluxo de Dados

1. **Upload clientes:** Arquivo .xlsx/.xls/.csv → SheetJS no frontend faz parse → normaliza nomes de colunas → POST `/api/clientes/importar` → INSERT no SQLite
2. **Upload ruas:** Arquivo .geojson/.json → frontend lê como JSON → POST `/api/ruas/importar` → cada feature salva no SQLite com geometria completa
3. **Recálculo:** POST `/api/analise/recalcular` → backend lê todos os clientes e ruas → para cada cliente, calcula distância mínima até qualquer rua com Turf.js → atualiza `sem_saida` e `distancia_metros`
4. **Visualização:** GET `/api/clientes` + GET `/api/ruas` → Leaflet renderiza marcadores com cores por status
5. **Exportação:** Backend gera workbook com 4 abas usando SheetJS → download

## Estrutura do Projeto

```
app_rua_sem_saida/
├── package.json
├── vite.config.js
├── server/
│   ├── index.js
│   ├── database.js
│   ├── routes/
│   │   ├── clientes.js
│   │   ├── ruas.js
│   │   └── analise.js
│   └── data/
│       └── app.sqlite (auto-criado)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api.js
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── UploadClientes.jsx
│   │   ├── UploadRuas.jsx
│   │   ├── PainelConfiguracao.jsx
│   │   ├── PainelResumo.jsx
│   │   ├── MapaClientes.jsx
│   │   └── TabelaResumo.jsx
│   ├── utils/
│   │   ├── parseClientes.js
│   │   ├── geoUtils.js
│   │   └── exportExcel.js
│   └── styles.css
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-06-clientes-ruas-sem-saida-design.md
```

## Componentes React

### App.jsx
Estado global: clientes, ruas, config (raio), resumo, loading. Fornece callbacks para upload, recálculo, exportação.

### Layout.jsx
Divide a tela: sidebar (350px, scroll) à esquerda, área principal (mapa + tabela) à direita. Responsivo: em telas menores, sidebar colapsa.

### UploadClientes.jsx
Input file (.xlsx/.xls/.csv), usa SheetJS para parse. Mostra preview das primeiras linhas. Confirma substituição se já houver dados. Botão "Limpar base".

### UploadRuas.jsx
Input file (.geojson/.json). Mostra contagem de features importadas. Botão "Limpar base".

### PainelConfiguracao.jsx
Select com opções rápidas (20/30/40/50/75/100m) + input para valor personalizado. Botão "Recalcular análise".

### PainelResumo.jsx
6 cards: Total clientes, Em rua sem saída, Fora, Total ruas, Raio atual, Percentual.

### MapaClientes.jsx
Mapa Leaflet centralizado em Maceió (-9.6658, -35.7353). Clientes "Sim" = vermelho, "Não" = azul, Ruas = laranja. Legendas. Popups com dados do cliente/rua.

### TabelaResumo.jsx
Tabela com colunas essenciais. Filtro: "Sem Saída = Sim" por padrão, toggle para "Todos".

### Filtros (inline no Layout)
Radio buttons: Todos / Apenas Sim / Apenas Não. Select de setor. Input de busca por código/nome. Botão limpar filtros.

## Banco de Dados (SQLite)

### Tabela `clientes`
| Coluna            | Tipo    | Descrição                    |
|-------------------|---------|------------------------------|
| id                | INTEGER | PK autoincrement             |
| codigo_cliente    | TEXT    |                              |
| nome_cliente      | TEXT    |                              |
| tipo_cliente      | TEXT    |                              |
| prioridade        | TEXT    |                              |
| tempo_espera      | TEXT    |                              |
| setor             | TEXT    |                              |
| endereco          | TEXT    |                              |
| cidade            | TEXT    |                              |
| estado            | TEXT    |                              |
| latitude          | REAL    |                              |
| longitude         | REAL    |                              |
| sem_saida         | TEXT    | DEFAULT 'Não'                |
| distancia_metros  | REAL    |                              |
| created_at        | DATETIME| DEFAULT CURRENT_TIMESTAMP    |

### Tabela `ruas_sem_saida`
| Coluna     | Tipo    |
|------------|---------|
| id         | INTEGER PK |
| osm_id     | TEXT    |
| nome       | TEXT    |
| geojson    | TEXT    |
| created_at | DATETIME|

### Tabela `configuracao`
| Coluna     | Tipo    | Default |
|------------|---------|---------|
| id         | INTEGER PK | 1    |
| raio_busca | INTEGER | 50      |

## API REST

| Método | Rota                      | Body/Params                          | Retorno                |
|--------|---------------------------|--------------------------------------|------------------------|
| GET    | `/api/health`             | —                                    | `{ status: "ok" }`    |
| GET    | `/api/clientes`           | Query: sem_saida, setor, busca       | Array de clientes      |
| POST   | `/api/clientes/importar`  | `{ clientes: [...], substituir }`    | `{ importados: N }`   |
| DELETE | `/api/clientes`           | —                                    | `{ removidos: N }`    |
| GET    | `/api/ruas`               | —                                    | Array de ruas          |
| POST   | `/api/ruas/importar`      | `{ ruas: [...], substituir }`        | `{ importados: N }`   |
| DELETE | `/api/ruas`               | —                                    | `{ removidos: N }`    |
| GET    | `/api/configuracao`       | —                                    | `{ raio_busca: N }`   |
| PUT    | `/api/configuracao`       | `{ raio_busca: N }`                  | `{ raio_busca: N }`   |
| POST   | `/api/analise/recalcular` | —                                    | Progresso + resultado  |
| GET    | `/api/resumo`             | —                                    | Objeto de totais       |
| GET    | `/api/exportar`           | —                                    | Arquivo .xlsx          |

## Cálculo Geoespacial

Executado no backend com Turf.js:

```
para cada cliente:
  se latitude ou longitude inválida → pular
  ponto = turf.point([longitude, latitude])
  menor_distancia = Infinity
  para cada rua:
    geometria = JSON.parse(rua.geojson)
    se tipo for LineString ou MultiLineString:
      dist = turf.pointToLineDistance(ponto, geometria, {units: 'meters'})
    senão se tipo for Point:
      dist = turf.distance(ponto, geometria, {units: 'meters'})
    menor_distancia = min(menor_distancia, dist)
  sem_saida = menor_distancia <= raio ? 'Sim' : 'Não'
  salvar sem_saida e distancia_metros no banco
```

## Exportação Excel

Backend gera workbook com 4 abas:
1. **base_cliente** — todos os clientes + colunas `sem_saida` e `distancia_metros`
2. **base_ruas_sem_saidas** — todas as ruas (id, osm_id, nome, geojson)
3. **resumo** — clientes com colunas essenciais (código, nome, setor, endereço, cidade, estado, lat, lng, sem_saida, distância)
4. **base_configuracao** — raio, totais, data de exportação

## Tratamento de Erros e Validações

- Linhas sem latitude/longitude válida → ignoradas, contagem exibida
- GeoJSON com feature inválida → skip individual
- Vírgula decimal em números → convertida para ponto
- Colunas com nomes alternativos → mapeamento flexível (ex: "Código Cliente", "Codigo Cliente", "codigo_cliente")
- Tabela vazia ao recalcular → alerta
- Loading state durante recálculo (pode demorar com ~14k clientes)
- Ordem correta: Turf.js usa `[longitude, latitude]`, Leaflet usa `[latitude, longitude]`

## CSS

- CSS puro em `styles.css`, sem frameworks
- Layout flexbox: sidebar fixa 350px + área principal flexível
- Cards de resumo em grid
- Tabela com scroll horizontal
- Cores: vermelho (#e74c3c), azul (#3498db), laranja (#e67e22)
- Responsivo: sidebar colapsa em telas < 768px

## Scripts

```json
{
  "dev": "concurrently \"npm run server\" \"npm run client\"",
  "server": "node server/index.js",
  "client": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

## Dependências

**Produção:** react, react-dom, leaflet, react-leaflet, @turf/turf, xlsx, express, better-sqlite3, cors, multer
**Desenvolvimento:** vite, @vitejs/plugin-react, concurrently
