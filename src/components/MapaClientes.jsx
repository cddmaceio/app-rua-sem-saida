import { memo, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';

const CENTER = [-9.6658, -35.7353];
const DEFAULT_ZOOM = 14;
const MAX_CLIENTES_MAPA = 5000;
const MAX_RUAS_MAPA = 3000;

function RuaLayer({ rua }) {
  try {
    const geom = JSON.parse(rua.geojson);
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates;
      if (isNaN(lat) || isNaN(lng)) return null;
      return (
        <CircleMarker center={[lat, lng]} radius={4} color="#e67e22" fillColor="#e67e22" fillOpacity={0.7} weight={1}>
          <Popup>
            <strong>{rua.nome || 'Sem nome'}</strong><br />
            OSM ID: {rua.osm_id}
          </Popup>
        </CircleMarker>
      );
    }
    if (geom.type === 'LineString') {
      const coords = geom.coordinates.map(([lng, lat]) => [lat, lng]);
      return <Polyline positions={coords} pathOptions={{ color: '#e67e22', weight: 2, opacity: 0.5 }} />;
    }
    if (geom.type === 'MultiLineString') {
      return (
        <>
          {geom.coordinates.map((line, i) => {
            const coords = line.map(([lng, lat]) => [lat, lng]);
            return <Polyline key={i} positions={coords} pathOptions={{ color: '#e67e22', weight: 2, opacity: 0.5 }} />;
          })}
        </>
      );
    }
    return null;
  } catch (e) {
    return null;
  }
}

const MemoRuaLayer = memo(RuaLayer);

function MapaClientes({ clientes, ruas }) {
  const clientesVisiveis = useMemo(() => {
    if (clientes.length <= MAX_CLIENTES_MAPA) return clientes;
    const sim = clientes.filter(c => c.sem_saida === 'Sim');
    const nao = clientes.filter(c => c.sem_saida !== 'Sim');
    const limiteNao = MAX_CLIENTES_MAPA - sim.length;
    return [...sim, ...nao.slice(0, Math.max(0, limiteNao))];
  }, [clientes]);

  const ruasVisiveis = useMemo(() => {
    if (ruas.length <= MAX_RUAS_MAPA) return ruas;
    return ruas.slice(0, MAX_RUAS_MAPA);
  }, [ruas]);

  return (
    <div className="map-container">
      <MapContainer center={CENTER} zoom={DEFAULT_ZOOM} preferCanvas={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ruasVisiveis.map((rua) => (
          <MemoRuaLayer key={`rua-${rua.id}`} rua={rua} />
        ))}
        {clientesVisiveis.filter(c => c.latitude && c.longitude).map((cliente) => (
          <CircleMarker
            key={`cliente-${cliente.id}`}
            center={[Number(cliente.latitude), Number(cliente.longitude)]}
            radius={cliente.sem_saida === 'Sim' ? 6 : 4}
            color={cliente.sem_saida === 'Sim' ? '#e74c3c' : '#3498db'}
            fillColor={cliente.sem_saida === 'Sim' ? '#e74c3c' : '#3498db'}
            fillOpacity={0.7}
            weight={1}
          >
            <Popup>
              <strong>{cliente.nome_cliente || 'Sem nome'}</strong><br />
              Codigo: {cliente.codigo_cliente}<br />
              Setor: {cliente.setor}<br />
              Rua sem saida: <strong style={{ color: cliente.sem_saida === 'Sim' ? '#e74c3c' : '#3498db' }}>
                {cliente.sem_saida}
              </strong><br />
              Distancia: {cliente.distancia_metros != null ? `${cliente.distancia_metros}m` : 'N/A'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="map-legend">
        <div><span className="legend-dot" style={{ background: '#e74c3c' }} /> Em rua sem saida</div>
        <div><span className="legend-dot" style={{ background: '#3498db' }} /> Fora</div>
        <div><span className="legend-dot" style={{ background: '#e67e22' }} /> Ruas sem saida</div>
        {clientes.length > MAX_CLIENTES_MAPA && (
          <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
            Mapa: {MAX_CLIENTES_MAPA} de {clientes.length} clientes
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MapaClientes);
