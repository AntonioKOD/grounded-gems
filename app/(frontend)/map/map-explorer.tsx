'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, X, ChevronLeft, ChevronRight, Compass, Circle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

import { cn } from "@/lib/utils";
import LocationList from "./location-list";
import LocationDetail from "./location-detail";
import InteractiveMap from "./interactive-map";
import { mockLocations, searchLocations, type Location } from "./map-data";

export default function MapExplorer() {
   // 1️⃣ Search & filter state
   const [searchQuery, setSearchQuery] = useState("");
   const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
   const [locations] = useState<Location[]>(mockLocations);
   const [filteredLocations, setFilteredLocations] = useState<Location[]>(mockLocations);
   const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
 
   // 2️⃣ Geolocation & map viewport
   const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
   const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006]); // default NYC 
   const [mapZoom, setMapZoom] = useState(12);
 
   // 3️⃣ UI state
   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
   const [isDetailOpen, setIsDetailOpen] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [searchMode, setSearchMode] = useState<"text" | "area">("text");
   const [radiusKm, setRadiusKm] = useState(5);
   const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
   const [errorMessage, setErrorMessage] = useState<string | null>(null);
 
   const searchInputRef = useRef<HTMLInputElement>(null);
 
   // 4️⃣ Request geolocation on mount  
   useEffect(() => {
     if (!navigator.geolocation) {
       setErrorMessage("Geolocation not supported. Showing default.");  
       return;
     }
     navigator.geolocation.getCurrentPosition(
       ({ coords }) => {
         const loc: [number, number] = [coords.latitude, coords.longitude];
         setUserLocation(loc);
         setMapCenter(loc);
         setMapZoom(14);
       },
       () => {
         setErrorMessage("Location denied. Showing default.");  
       }
     );
   }, []);
 
   // 5️⃣ Map event handlers
   const handleMapMove = useCallback(
     (newCenter: [number, number], newZoom: number) => {
       setMapCenter(newCenter);
       setMapZoom(newZoom);
     },
     []
   );
   const handleMapClick = useCallback(
     ({ lat, lng }: { lat: number; lng: number }) => {
       setMapCenter([lat, lng]);
     },
     []
   );
   const handleMarkerClick = useCallback((loc: Location) => {
     setSelectedLocation(loc);
     setIsDetailOpen(true);
   }, []);
 
   // 6️⃣ Text search suggestions
   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const q = e.target.value;
     setSearchQuery(q);
     if (q.length > 2) {
       setIsLoading(true);
       setTimeout(() => {
         setSearchSuggestions(
           mockLocations
             .filter(l =>
               l.name.toLowerCase().includes(q.toLowerCase()) ||
               l.address.toLowerCase().includes(q.toLowerCase())
             )
             .map(l => l.name)
             .slice(0, 5)
         );
         setIsLoading(false);
       }, 300);
     } else {
       setSearchSuggestions([]);
     }
   };
   const handleSearch = (e?: React.FormEvent) => {
     e?.preventDefault();
     if (!searchQuery.trim()) {
       setFilteredLocations(locations);
       return;
     }
     setIsLoading(true);
     setTimeout(() => {
       const results = searchLocations(locations, searchQuery);
       setFilteredLocations(results);
       if (results.length) {
         setMapCenter([results[0].latitude, results[0].longitude]);
         setMapZoom(14);
       }
       setSearchSuggestions([]);
       setIsLoading(false);
     }, 500);
   };
   const handleSuggestionClick = (s: string) => {
     setSearchQuery(s);
     setSearchSuggestions([]);
     const results = searchLocations(locations, s);
     setFilteredLocations(results);
     if (results.length) {
       setMapCenter([results[0].latitude, results[0].longitude]);
       setMapZoom(14);
     }
   };
 
   // 7️⃣ Area search (Haversine)
   const toRad = (d: number) => d * (Math.PI / 180);
   const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
     const R = 6371;
     const dLat = toRad(lat2 - lat1);
     const dLon = toRad(lon2 - lon1);
     const a =
       Math.sin(dLat/2)**2 +
       Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
   };
   const handleAreaSearch = (centerPt: [number, number], km: number) => {
     setFilteredLocations(
       locations.filter(l =>
         calculateDistance(centerPt[0], centerPt[1], l.latitude, l.longitude) <= km
       )
     );
   };
 
   // 8️⃣ Category filters
   const categories = Array.from(new Set(locations.map(l => l.category)));
   const handleCategoryChange = (cats: string[]) => {
     setSelectedCategories(cats);
     setFilteredLocations(
       cats.length
         ? locations.filter(l => cats.includes(l.category))
         : locations
     );
   };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-3">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </Link>
          <h1 className="text-xl font-bold">Explore Map</h1>
        </div>
        <div className="flex items-center gap-2">
          {userLocation && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setMapCenter(userLocation);
                setMapZoom(15);
              }}
            >
              <Compass className="w-4 h-4 text-[#4ECDC4]" />
            </Button>
          )}
          <Button size="icon" variant="outline" className="md:hidden" onClick={() => setIsSidebarOpen(o => !o)}>
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            "bg-white border-r transition-transform duration-300",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          ) + " w-full md:w-80 flex-shrink-0"}
        >
          <div className="p-4 border-b">
            <Tabs defaultValue="text" onValueChange={v => setSearchMode(v as "text" | "area")}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="area">Area</TabsTrigger>
              </TabsList>
            </Tabs>

            {searchMode === "text" ? (
              <form onSubmit={handleSearch} className="relative">
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search..."
                  className="pr-10"
                />
                <Button type="submit" size="icon" className="absolute right-0 top-0 h-full rounded-l-none bg-[#FF6B6B]">
                  <Search className="w-4 h-4 text-white" />
                </Button>
                {searchSuggestions.length > 0 && (
                  <ul className="absolute bg-white w-full mt-1 shadow-lg max-h-52 overflow-auto">
                    {searchSuggestions.map((s, i) => (
                      <li
                        key={i}
                        onClick={() => handleSuggestionClick(s)}
                        className="p-2 hover:bg-gray-100 flex items-center cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 mr-2 text-[#4ECDC4]" /> {s}
                      </li>
                    ))}
                  </ul>
                )}
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Radius</p>
                  <div className="flex items-center gap-2">
                    <Slider value={[radiusKm]} min={1} max={50} onValueChange={v => setRadiusKm(v[0])} className="flex-1" />
                    <span className="text-sm w-12 text-right">{radiusKm} km</span>
                  </div>
                </div>
                <Button onClick={() => handleAreaSearch(mapCenter!, radiusKm)} className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
                  <Circle className="w-4 h-4 mr-2" /> Apply
                </Button>
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <Badge
                      key={cat}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        handleCategoryChange(
                          active ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat]
                        )
                      }
                    >
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <LocationList
              locations={filteredLocations}
              onLocationSelect={handleMarkerClick}
              selectedLocation={selectedLocation}
              isLoading={isLoading}
            />
          </div>
        </aside>

        <main className="flex-1 relative">
          {mapCenter && (
           <InteractiveMap
           locations={filteredLocations}
           userLocation={userLocation}
           center={mapCenter}         
           zoom={mapZoom}
           onMapClickAction={handleMapClick}
           onMapMoveAction={handleMapMove}
           onMarkerClickAction={handleMarkerClick}
           searchRadiusKm={searchMode === "area" ? radiusKm : undefined}
           className="h-full w-full"
         />
          )}

          <div className="absolute top-4 left-4 hidden md:flex">
            <Button size="icon" variant="outline" onClick={() => setIsSidebarOpen(o => !o)}>
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {errorMessage && (
            <div className="absolute top-4 inset-x-0 mx-auto bg-white rounded-md shadow-md px-4 py-2 border-l-4 border-amber-500 flex items-center z-20">
              <span className="text-sm text-gray-700 flex-1">{errorMessage}</span>
              <Button variant="ghost" size="icon" onClick={() => setErrorMessage(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>

        {selectedLocation && isDetailOpen && (
          <aside
            className={cn(
              "bg-white border-l transition-transform duration-300",
              isDetailOpen ? "translate-x-0" : "translate-x-full"
            ) + " w-full md:w-80 flex-shrink-0"}
          >
            <LocationDetail
              location={selectedLocation}
              onClose={() => {
                setIsDetailOpen(false);
                setSelectedLocation(null);
              }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}