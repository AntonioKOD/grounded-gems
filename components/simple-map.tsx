"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

import {  Info } from "lucide-react";

// Set your Mapbox access token
mapboxgl.accessToken = "pk.eyJ1IjoiYW50b25pby1rb2RoZWxpIiwiYSI6ImNtYTQ3bTlibTAyYTUyanBzem5qZGV1ZzgifQ.cSUliejFuQnIHZ-DDinPRQ";

interface SimpleMapProps {
  className?: string;
  height?: string;
  center?: [number, number];
  zoom?: number;
  markers?: Array<{ id: string; latitude: number; longitude: number; title: string }>;
  showControls?: boolean;
  interactive?: boolean;
  isBackground?: boolean;
  locations?: Array<{ id: string; name: string; latitude: number; longitude: number; category: string }>;
}

function SimpleMap({
  className,
  height = "100%",
  // Use [lng, lat] by default (Boston)
  center = [-71.0589, 42.3601],
  zoom = 12,
  markers = [],
  showControls = false,
  interactive = true,
  isBackground = false,
  locations = [],
}: SimpleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [styleId, setStyleId] = useState("standard");
  const [showStyles, setShowStyles] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client side to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Valid Mapbox style options
  const styles = [
    { id: "standard", name: "Standard" },
    { id: "streets-v12", name: "Streets" },
    { id: "light-v11", name: "Light" },
    { id: "dark-v11", name: "Dark" },
    { id: "satellite-streets-v12", name: "Satellite Streets" },
    { id: "outdoors-v12", name: "Outdoors" },
  ];

  // Choose category color
  const getCategoryColor = useCallback((category: string): string => {
    const colors: Record<string, string> = {
      Music: "#FF6B6B",
      Art: "#4ECDC4",
      Food: "#FFE66D",
      Tech: "#6B66FF",
      Wellness: "#66FFB4",
      Entertainment: "#FF66E3",
      Default: "#FF6B6B",
    };
    return colors[category] || colors.Default || '#FF6B6B';
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!isClient || mapRef.current || !mapContainer.current) return;
    
    console.log('Initializing map with center:', center, 'zoom:', zoom);
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${styleId}`,
      center,
      zoom,
      interactive,
      attributionControl: !isBackground,
      projection: { name: "mercator" },
    });

    // On initial load or after setStyle, re-enable layers & controls
    const onLoad = () => {
      console.log('Map loaded successfully!');
      setMapLoaded(true);

      // Skip 3D buildings layer for now to simplify debugging

      // Controls: zoom only, no compass
      if (interactive && showControls) {
        try {
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }), "top-right");
          map.addControl(new mapboxgl.FullscreenControl(), "top-right");
          map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");
        } catch (error) {
          console.warn('Could not add map controls:', error);
        }
      }
    };
    
    const onError = (error: any) => {
      console.error('Map error:', error);
    };

    map.on("load", onLoad);
    map.on("error", onError);
    mapRef.current = map;

    return () => {
      map.off("load", onLoad);
      map.off("error", onError);
      map.remove();
      mapRef.current = null;
    };
  }, [isClient, interactive, showControls, styleId, isBackground, zoom, center]);

  // Re-apply style (and reload layers/controls) on styleId change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${styleId}`);  // triggers a new "load" event  [oai_citation:10‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/?utm_source=chatgpt.com)
    }
  }, [styleId]);

  // Manage markers after map is ready
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove existing markers
    document.querySelectorAll<HTMLElement>(".custom-marker").forEach(el => el.remove());

    // Combine props
    const all = [
      ...markers.map(m => ({ ...m, category: "Default" })),
      ...locations.map(l => ({ id: l.id, latitude: l.latitude, longitude: l.longitude, title: l.name, category: l.category })),
    ];

    // Add markers
    all.forEach(m => {
      const el = document.createElement("div");
      const color = getCategoryColor(m.category);
      el.className = "custom-marker";
      Object.assign(el.style, {
        width: "32px", height: "32px", borderRadius: "50%",
        backgroundColor: color, border: "3px solid white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer",
        transition: "all 0.2s ease-in-out", position: "relative", zIndex: "1"
      });
      el.innerHTML = m.category.charAt(0);

      // Hover effects
      el.addEventListener('mouseenter', () => {
        Object.assign(el.style, {
          transform: "scale(1.1)",
          zIndex: "2",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)"
        });
      });

      el.addEventListener('mouseleave', () => {
        Object.assign(el.style, {
          transform: "scale(1)",
          zIndex: "1",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)"
        });
      });

      // Pulse effect (requires CSS keyframes)
      const pulse = document.createElement("div");
      Object.assign(pulse.style, {
        position: "absolute", inset: "-4px", borderRadius: "50%",
        backgroundColor: `${color}25`, animation: "pulse 3s infinite ease-in-out",
        zIndex: "-1"
      });
      el.appendChild(pulse);

      // Enhanced popup with more information
      const popup = new mapboxgl.Popup({ 
        offset: 30,
        closeButton: true,
        closeOnClick: true,
        className: 'custom-popup'
      }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background-color: ${color}">
              ${m.category.charAt(0)}
            </div>
            <h3 class="font-bold text-sm text-gray-900">${m.title}</h3>
          </div>
          <p class="text-xs text-gray-600 mb-3">${m.category}</p>
          <div class="flex gap-2">
            <button 
              onclick="window.open('/locations/${m.id}', '_blank')" 
              class="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
            >
              View Details
            </button>
            <button 
              onclick="navigator.geolocation && navigator.geolocation.getCurrentPosition(pos => {
                const directions = \`https://maps.google.com/maps?saddr=\${pos.coords.latitude},\${pos.coords.longitude}&daddr=\${m.latitude},\${m.longitude}\`;
                window.open(directions, '_blank');
              })" 
              class="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors"
            >
              Directions
            </button>
          </div>
        </div>
      `);

      // Add to map with enhanced interactivity
      const marker = new mapboxgl.Marker(el)
        .setLngLat([m.longitude, m.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      // Add click animation
      el.addEventListener('click', () => {
        el.style.animation = 'marker-click 0.3s ease-in-out';
        setTimeout(() => {
          el.style.animation = '';
        }, 300);
      });
    });
  }, [markers, locations, mapLoaded, getCategoryColor]);

  // Style selector handlers

  const selectStyle = useCallback((id: string) => { setStyleId(id); setShowStyles(false); }, []);

  // Show placeholder during SSR and client-side hydration
  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <Info className="h-12 w-12 text-[#FF6B6B]" />
        <p className="ml-4 text-gray-600">Loading map...</p>
      </div>
    );
  }
  
  // Debug information
  console.log('SimpleMap rendering on client:', { isClient, mapLoaded, height, center, zoom });

  // Fallback for no WebGL
  if (!mapboxgl.supported()) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <Info className="h-12 w-12 text-[#FF6B6B]" />
        <p className="ml-4 text-gray-600">Your browser doesn’t support WebGL.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)} style={{ height }}>
      <div ref={mapContainer} className="h-full w-full" style={{ backgroundColor: '#f0f0f0', minHeight: '300px' }} />

      {/* Style toggle */}
      {showStyles && (
        <div className="absolute top-12 right-4 bg-white rounded-lg shadow-lg p-2 z-10">
          {styles.map(s => (
            <button
              key={s.id}
              className={cn(
                "block w-full px-3 py-1 text-left text-sm rounded",
                s.id === styleId ? "bg-[#FF6B6B]/20" : "hover:bg-gray-100"
              )}
              onClick={() => selectStyle(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      
      {/* Attribution & Branding */}
      {!isBackground && (
        <div className="absolute bottom-2 left-2 bg-white/80 rounded px-2 py-1 text-xs text-gray-600">
          ©{" "}
          <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className="underline">
            Mapbox
          </a>{" "}
          | ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>
        </div>
      )}

      {/* Global CSS for animations and styling */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        
        @keyframes marker-click {
          0% { transform: scale(1); }
          50% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        
        .custom-popup .mapboxgl-popup-content {
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
          padding: 0 !important;
          font-family: inherit !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        
        .custom-popup .mapboxgl-popup-close-button {
          font-size: 18px !important;
          color: #666 !important;
          padding: 8px !important;
          right: 8px !important;
          top: 8px !important;
          background: rgba(255, 255, 255, 0.9) !important;
          border-radius: 50% !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .custom-popup .mapboxgl-popup-tip {
          border-top-color: white !important;
        }
        
        .mapboxgl-ctrl-group {
          border-radius: 8px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        .mapboxgl-ctrl-group button {
          background: rgba(255, 255, 255, 0.95) !important;
          border: none !important;
          color: #333 !important;
        }
        
        .mapboxgl-ctrl-group button:hover {
          background: white !important;
        }
      `}</style>
    </div>
  );
}

export default memo(SimpleMap);