import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { getStatus } from '@/components/maps/PinStatusBadge';

function createColorIcon(color) {
  const size = 30;
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 24 32" width="${size}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8 12 20 12 20S24 20 24 12C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 10],
  });
}

export default function ClusteredPins({ pins, onPinClick }) {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    // Dynamically import leaflet.markercluster
    import('leaflet.markercluster').then(() => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }

      const cluster = L.markerClusterGroup({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (c) => {
          const count = c.getChildCount();
          return L.divIcon({
            className: '',
            html: `<div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;font-family:system-ui">${count}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
        },
      });

      pins.forEach(pin => {
        const s = getStatus(pin.status);
        const marker = L.marker([pin.lat, pin.lng], { icon: createColorIcon(s.color) });
        marker.on('click', () => onPinClick && onPinClick(pin));
        cluster.addLayer(marker);
      });

      map.addLayer(cluster);
      clusterRef.current = cluster;
    });

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [pins, map]);

  return null;
}