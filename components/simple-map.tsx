"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Layers, Info } from "lucide-react";

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

export default function SimpleMap({
  className,
  height = "100%",
  // Use [lng, lat] by default (Boston)
  center = [-71.0589, 42.3601],
  zoom = 12,
  markers = [],
  showControls = true,
  interactive = true,
  isBackground = false,
  locations = [],
}: SimpleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [styleId, setStyleId] = useState("standard");
  const [showStyles, setShowStyles] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

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
    return colors[category] || colors.Default;
  }, []);

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${styleId}`,                 // Valid style URL  [oai_citation:5‡Mapbox](https://docs.mapbox.com/api/maps/styles/?utm_source=chatgpt.com)
      center,                                                     // [lng, lat] order  [oai_citation:6‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/?utm_source=chatgpt.com)
      zoom,
      interactive,
      attributionControl: !isBackground,
      projection: { name: "mercator" },
    });

    // On initial load or after setStyle, re-enable layers & controls
    const onLoad = () => {
      setMapLoaded(true);

      // 3D buildings layer
      if (!isBackground && map.getStyle().sources.composite) {
        map.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 10,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 10, 0, 15, ["get", "height"]],
            "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 10, 0, 15, ["get", "min_height"]],
            "fill-extrusion-opacity": 0.6,
          },
        });
      }

      // Controls: zoom only, no compass  [oai_citation:7‡Stack Overflow](https://stackoverflow.com/questions/42837381/how-to-display-only-and-in-the-mapbox-navigation-control?utm_source=chatgpt.com)
      if (interactive && showControls) {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }), "top-right");  //  [oai_citation:8‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/example/navigation/?utm_source=chatgpt.com)
        map.addControl(new mapboxgl.FullscreenControl(), "top-right");
        map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");  //  [oai_citation:9‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/api/markers/?utm_source=chatgpt.com)
      }
    };

    map.on("load", onLoad);
    mapRef.current = map;

    return () => {
      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
    };
  }, [interactive, showControls, styleId, isBackground, zoom, center]);

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
        width: "30px", height: "30px", borderRadius: "50%",
        backgroundColor: color, border: "2px solid white",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: "bold", fontSize: "12px", cursor: "pointer",
      });
      el.innerHTML = m.category.charAt(0);

      // Pulse effect (requires CSS keyframes)
      const pulse = document.createElement("div");
      Object.assign(pulse.style, {
        position: "absolute", inset: "0", borderRadius: "50%",
        backgroundColor: `${color}20`, animation: "pulse 2s infinite",
      });
      el.appendChild(pulse);

      // Popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">${m.title}</h3>
          <p class="text-xs text-gray-600">${m.category}</p>
        </div>
      `);

      // Add to map  [oai_citation:11‡Mapbox](https://docs.mapbox.com/mapbox-gl-js/example/add-a-marker/?utm_source=chatgpt.com)
      new mapboxgl.Marker(el).setLngLat([m.longitude, m.latitude]).setPopup(popup).addTo(mapRef.current!);
    });
  }, [markers, locations, mapLoaded, getCategoryColor]);

  // Style selector handlers
  const toggleStyleSelector = useCallback(() => setShowStyles(v => !v), []);
  const selectStyle = useCallback((id: string) => { setStyleId(id); setShowStyles(false); }, []);

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
      <div ref={mapContainer} className="h-full w-full" />

      {/* Style toggle */}
      {interactive && showControls && (
        <div className="absolute top-4 right-4 z-10">
          <Button size="icon" variant="outline" onClick={toggleStyleSelector}>
            <Layers className="h-4 w-4 text-[#FF6B6B]" />
          </Button>
        </div>
      )}
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

      {/* Global CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}