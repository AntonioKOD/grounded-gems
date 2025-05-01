'use client';

import React, { useState, useCallback } from 'react';
import Map, {
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
  Marker,
  Popup,
  type MapEvent,
  type MarkerEvent
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MapPin, Layers, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SimpleMapProps {
  className?: string;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
  }>;
}

export default function SimpleMap(props: SimpleMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-[#FF6B6B] flex items-center justify-center mx-auto mb-4">
            <Info className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Map Configuration Required
          </h3>
          <p className="text-gray-600 max-w-md">
            Please set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your environment.
          </p>
        </div>
      </div>
    );
  }
  return <MapContent {...props} token={token} />;
}

interface MapContentProps extends SimpleMapProps {
  token: string;
}

function MapContent({ className, markers = [], token }: MapContentProps) {
  const styleOptions = [
    { url: 'mapbox://styles/mapbox/standard',            name: 'Standard' },            // Mapbox Standard  [oai_citation:0‡Mapbox](https://docs.mapbox.com/api/maps/styles/?utm_source=chatgpt.com)
    { url: 'mapbox://styles/mapbox/standard-satellite',   name: 'Satellite' },           // Standard Satellite  [oai_citation:1‡Mapbox](https://docs.mapbox.com/map-styles/standard/guides/?utm_source=chatgpt.com)
    { url: 'mapbox://styles/mapbox/streets-v12',          name: 'Streets' },             // Streets v12  [oai_citation:2‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/?utm_source=chatgpt.com)
    { url: 'mapbox://styles/mapbox/outdoors-v12',         name: 'Outdoors' },            // Outdoors v12  [oai_citation:3‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/?utm_source=chatgpt.com)
    { url: 'mapbox://styles/mapbox/light-v11',            name: 'Light' },               // Light v11  [oai_citation:4‡Mapbox](https://docs.mapbox.com/help/glossary/style-id/?utm_source=chatgpt.com)
    { url: 'mapbox://styles/mapbox/dark-v11',             name: 'Dark' },                // Dark v11  [oai_citation:5‡Mapbox](https://docs.mapbox.com/help/glossary/style-id/?utm_source=chatgpt.com)
    { url: 'mapbox://styles/mapbox/satellite-streets-v12',name: 'Satellite Streets' }    // Satellite Streets v12  [oai_citation:6‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/?utm_source=chatgpt.com)
  ] as const;

  const [styleUrl, setStyleUrl] = useState<string>(styleOptions[0].url);
  const [showStyles, setShowStyles] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleMapLoad = useCallback((e: MapEvent) => {
    const map = e.target; // raw Mapbox GL JS instance
    if (map.getStyle().sources?.composite) {
      try {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 10,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['interpolate',['linear'],['zoom'],10,0,15,['get','height']],
            'fill-extrusion-base': ['interpolate',['linear'],['zoom'],10,0,15,['get','min_height']],
            'fill-extrusion-opacity': 0.6
          }
        });
      } catch (err) {
        console.warn('Could not add 3D buildings layer:', err);
      }
    }
  }, []);

  const handleMarkerClick = useCallback(
    (id: string, event: MarkerEvent<MouseEvent>) => {
      event.originalEvent.stopPropagation();
      setSelectedId(prev => (prev === id ? null : id));
    },
    []
  );

  return (
    <div className={cn(
      'w-full h-screen relative rounded-lg overflow-hidden bg-white shadow-lg',
      className
    )}>
      <Map
        initialViewState={{ longitude: -71.0589, latitude: 42.3601, zoom: 12 }}
        mapStyle={styleUrl}
        mapboxAccessToken={token}
        maxZoom={20}
        minZoom={3}
        attributionControl={false}
        onLoad={handleMapLoad}
        renderWorldCopies
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <NavigationControl showCompass={false} style={{ backgroundColor: 'white' }} />
          <FullscreenControl style={{ backgroundColor: 'white' }} />
          <GeolocateControl
            style={{ backgroundColor: 'white' }}
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation
          />
          <Button
            size="icon"
            variant="outline"
            className="bg-white shadow-md hover:bg-gray-50"
            onClick={() => setShowStyles(v => !v)}
          >
            <Layers className="text-[#FF6B6B]" />
          </Button>
        </div>

        {/* Style Selector */}
        {showStyles && (
          <div className="absolute top-4 right-16 bg-white p-2 rounded-lg shadow-lg z-10">
            {styleOptions.map(opt => (
              <button
                key={opt.url}
                className={cn(
                  'block w-full text-left px-3 py-1 text-sm rounded',
                  styleUrl === opt.url
                    ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] font-medium'
                    : 'hover:bg-gray-100'
                )}
                onClick={() => {
                  setStyleUrl(opt.url);
                  setShowStyles(false);
                }}
              >
                {opt.name}
              </button>
            ))}
          </div>
        )}

        {/* Markers & Popups */}
        {markers.map(m => (
          <Marker
            key={m.id}
            longitude={m.longitude}
            latitude={m.latitude}
            anchor="bottom"
            onClick={e => handleMarkerClick(m.id, e)}
          >
            <div className="relative cursor-pointer">
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FF6B6B] rotate-45" />
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-[#FF6B6B] text-[#FF6B6B] shadow-md hover:scale-110 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#FF6B6B]/20 animate-ping" />
            </div>
          </Marker>
        ))}

        {selectedId && (
          <Popup
            anchor="bottom"
            longitude={markers.find(x => x.id === selectedId)!.longitude}
            latitude={markers.find(x => x.id === selectedId)!.latitude}
            onClose={() => setSelectedId(null)}
            closeOnClick={false}
            className="z-20"
          >
            <div className="p-2">
              <h3 className="font-medium text-[#FF6B6B]">
                {markers.find(x => x.id === selectedId)!.title}
              </h3>
            </div>
          </Popup>
        )}

        {/* Branding & Attribution */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex items-center z-10">
          <div className="w-6 h-6 rounded-full bg-[#FF6B6B] flex items-center justify-center mr-2">
            <span className="text-white font-bold text-xs">GG</span>
          </div>
          <span className="text-sm font-medium text-gray-800">Grounded Gems</span>
        </div>
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-1 text-xs text-gray-600 z-10">
          ©{' '}
          <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className="text-[#4ECDC4] hover:underline">
            Mapbox
          </a>{' '}
          |{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[#4ECDC4] hover:underline">
            OpenStreetMap
          </a>
        </div>
      </Map>
    </div>
  );
}