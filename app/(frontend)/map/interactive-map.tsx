// app/(frontend)/map/interactive-map.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { cn } from '@/lib/utils';
import type { Location } from './map-data';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

interface InteractiveMapProps {
  locations: Location[];
  userLocation: [number, number] | null;
  center: [number, number];
  zoom: number;
  onMarkerClickAction: (location: Location) => void;
  onMapClickAction: (coords: { lat: number; lng: number }) => void;
  onMapMoveAction: (center: [number, number], zoom: number) => void;
  searchRadiusKm?: number;
  className?: string;
}

export default function InteractiveMap({
  locations,
  center,
  zoom,
  onMarkerClickAction,
  onMapClickAction,
  onMapMoveAction,
  searchRadiusKm,
  className,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initialize map + controls once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center[1], center[0]],
      zoom,
    }); //  [oai_citation:5‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/api/map/?utm_source=chatgpt.com)

    // Add navigation (zoom) control
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Add built-in GeolocateControl
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
      fitBoundsOptions: { maxZoom: 15 },
    }); //  [oai_citation:6‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/api/markers/?utm_source=chatgpt.com)

    map.addControl(geolocate, 'top-right'); //  [oai_citation:7‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/example/locate-user/?utm_source=chatgpt.com)

    map.on('load', () => {
      setLoaded(true);
      geolocate.trigger(); // auto-trigger geolocation on load  [oai_citation:8‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/api/map/?utm_source=chatgpt.com)

      // Add clustered GeoJSON source
      map.addSource('places', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: locations.map(loc => ({
            type: 'Feature',
            properties: { id: loc.id, name: loc.name, category: loc.category },
            geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] },
          })),
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
        },
      });

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
        },
      });

      // Unclustered points
      map.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'marker-15',
          'icon-size': 1.2,
        },
      });
    });

    // Cluster click → zoom into cluster
    map.on('click', 'clusters', e => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties!.cluster_id as number;
      (map.getSource('places') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoomLevel) => {
          if (!err) {
            const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
            map.easeTo({ center: coords, zoom: zoomLevel ?? map.getZoom() });
          }
        }
      );
    });

    // Unclustered click → show popup / notify parent
    map.on('click', 'unclustered-point', e => {
      const feat = e.features?.[0];
      if (!feat) return;
      const id = feat.properties!.id as string;
      const loc = locations.find(l => l.id === id);
      if (loc) onMarkerClickAction(loc);
    });

    // Background click
    map.on('click', () => {
      const c = map.getCenter();
      onMapClickAction({ lat: c.lat, lng: c.lng });
    });

    // Moveend (user pan/zoom)
    map.on('moveend', e => {
      if (!('originalEvent' in e)) return;
      const c = map.getCenter();
      onMapMoveAction([c.lat, c.lng], map.getZoom());
    });

    mapRef.current = map;
    return () => map.remove();
  }, [locations]);

  // Fly to updated center/zoom props
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    mapRef.current.flyTo({ center: [center[1], center[0]], zoom, essential: true });
  }, [center, zoom, loaded]);

  // Render location markers manually (if needed)
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    // Clear existing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add markers
    for (const loc of locations) {
      const el = document.createElement('div');
      Object.assign(el.style, {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: '#FF6B6B',
        border: '2px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
      });
      el.innerText = loc.category.charAt(0);

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2"><h3 class="font-bold text-sm">${loc.name}</h3><p class="text-xs text-gray-600">${loc.category}</p></div>`
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      marker.getElement().addEventListener('click', () => onMarkerClickAction(loc));
      markersRef.current.push(marker);
    }
  }, [locations, loaded]);

  // Draw / filter by search radius
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const map = mapRef.current;

    // Only apply filter if layer exists
    const layers = map.getStyle().layers || [];
    if (!layers.find(l => l.id === 'unclustered-point')) return; //  [oai_citation:9‡MapLibre](https://www.maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/?utm_source=chatgpt.com)

    if (searchRadiusKm == null) {
      map.setFilter('unclustered-point', ['!', ['has', 'point_count']]);
    } else {
      const coords = [center[1], center[0]] as [number, number];
      map.setFilter('unclustered-point', [
        'all',
        ['!', ['has', 'point_count']],
        [
          '<=',
          ['distance', ['geometry'], ['literal', coords]],
          searchRadiusKm * 1000
        ],
      ]);
    }
  }, [searchRadiusKm, center, loaded]);

  return (
    <div className={cn('relative bg-white shadow-lg rounded-lg overflow-hidden', className)}>
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}