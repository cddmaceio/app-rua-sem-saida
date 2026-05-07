import L from 'leaflet';

export function isValidCoordinate(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return !isNaN(latNum) && !isNaN(lngNum)
    && latNum >= -90 && latNum <= 90
    && lngNum >= -180 && lngNum <= 180;
}

export function getMarkerColor(semSaida) {
  return semSaida === 'Sim' ? '#e74c3c' : '#3498db';
}

export function getMarkerIcon(semSaida) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${semSaida === 'Sim' ? '#e74c3c' : '#3498db'};
      border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
