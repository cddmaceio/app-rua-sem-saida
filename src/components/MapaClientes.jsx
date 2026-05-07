import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { getMarkerIcon } from '../utils/geoUtils';
import L from 'leaflet';

const CENTER = [-9.6658, -35.7353];
const DEFAULT_ZOOM = 14;

function RuaLayer({ rua }) {
  try {
    const geom = JSON.parse(rua.geojson);
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates;
      if (isNaN(lat) || isNaN(lng)) return null;
      return (
        <Marker position={[lat, lng]} icon={L.divIcon({
          className: 'custom-marker',
          html: '<div style="width:10px;height:10px;border-radius:50%;background:#e67e22;border:2px solid white;"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })}>
          <Popup>
            <strong>{rua.nome || 'Sem nome'}</strong><br />
            OSM ID: {rua.osm_id}
          </Popup>
        </Marker>
      );
    }
    if (geom.type === 'LineString') {
      const coords = geom.coordinates.map(([lng, lat]) => [lat, lng]);
      return <Polyline positions={coords} pathOptions={{ color: '#e67e22', weight: 3, opacity: 0.7 }} />;
    }
    if (geom.type === 'MultiLineString') {
      return (
        <>
          {geom.coordinates.map((line, i) => {
            const coords = line.map(([lng, lat]) => [lat, lng]);
            return <Polyline key={i} positions={coords} pathOptions={{ color: '#e67e22', weight: 3, opacity: 0.7 }} />;
          })}
        </>
      );
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default function MapaClientes({ clientes, ruas }) {
  return (
    <div className="map-container">
      <MapContainer center={CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ruas.map((rua) => (
          <RuaLayer key={`rua-${rua.id}`} rua={rua} />
        ))}
        {clientes.filter(c => c.latitude && c.longitude).map((cliente) => (
          <Marker
            key={`cliente-${cliente.id}`}
            position={[Number(cliente.latitude), Number(cliente.longitude)]}
            icon={getMarkerIcon(cliente.sem_saida)}
          >
            <Popup>
              <strong>{cliente.nome_cliente || 'Sem nome'}</strong><br />
              Codigo: {cliente.codigo_cliente}<br />
              Setor: {cliente.setor}<br />
              Rua sem saida: <strong style={{ color: cliente.sem_saida === 'Sim' ? '#e74c3c' : '#3498db' }}>
                {cliente.sem_saida}
              </strong><br />
              Distancia: {cliente.distancia_metros ? `${cliente.distancia_metros}m` : 'N/A'}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-legend">
        <div><span className="legend-dot" style={{ background: '#e74c3c' }} /> Em rua sem saida</div>
        <div><span className="legend-dot" style={{ background: '#3498db' }} /> Fora</div>
        <div><span className="legend-dot" style={{ background: '#e67e22' }} /> Ruas sem saida</div>
      </div>
    </div>
  );
}
