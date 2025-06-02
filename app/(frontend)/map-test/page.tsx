"use client"

import { useEffect, useRef, useState } from "react"

export default function MapTestPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [status, setStatus] = useState("Initializing...")

  useEffect(() => {
    const initMap = async () => {
      try {
        setStatus("Checking Mapbox token...")
        
        // Check if token is available
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        if (!token) {
          setStatus("❌ NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN not found")
          return
        }
        
        setStatus(`✅ Token found: ${token.substring(0, 10)}...`)
        
        // Load Mapbox GL if not available
        if (!window.mapboxgl) {
          setStatus("Loading Mapbox GL script...")
          
          const script = document.createElement('script')
          script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
          
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
          
          // Load CSS
          const link = document.createElement('link')
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
          link.rel = 'stylesheet'
          document.head.appendChild(link)
          
          // Wait for global to be available
          await new Promise((resolve) => {
            setTimeout(() => {
              if (window.mapboxgl) {
                setStatus("✅ Mapbox GL loaded successfully")
                resolve(true)
              } else {
                setStatus("❌ Mapbox GL failed to load")
                resolve(false)
              }
            }, 500)
          })
        }
        
        if (!window.mapboxgl) {
          setStatus("❌ Mapbox GL not available")
          return
        }
        
        setStatus("Creating map...")
        
        // Set access token
        window.mapboxgl.accessToken = token
        
        // Create map
        const map = new window.mapboxgl.Map({
          container: containerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-71.0589, 42.3601], // Boston coordinates [lng, lat]
          zoom: 12,
        })
        
        mapRef.current = map
        console.log('🧪 Map created successfully')
        setStatus("Map created, waiting for load...")
        
        map.on('load', () => {
          console.log('🧪 Map loaded successfully!')
          setStatus("Map loaded! Adding test markers...")
          
          // Add test markers
          const testLocations = [
            { name: "Boston Common", lng: -71.0589, lat: 42.3601 },
            { name: "Fenway Park", lng: -71.0972, lat: 42.3467 },
            { name: "Harvard University", lng: -71.1167, lat: 42.3770 }
          ]
          
          testLocations.forEach(location => {
            const el = document.createElement('div')
            el.className = 'map-marker'
            el.style.cssText = `
              background-color: #FF6B6B;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 2px solid white;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `
            el.title = location.name
            
            new window.mapboxgl.Marker(el)
              .setLngLat([location.lng, location.lat])
              .addTo(map)
          })
          
          setStatus(`✅ Success! Map loaded with ${testLocations.length} test markers`)
        })
        
        map.on('error', (e: any) => {
          console.error('🧪 Map error:', e)
          setStatus(`❌ Map error: ${e.error?.message || 'Unknown error'}`)
        })
        
      } catch (error) {
        console.error('🧪 Initialization error:', error)
        setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    initMap()
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mapbox GL Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-semibold mb-2">Status:</h2>
        <p className="font-mono text-sm">{status}</p>
      </div>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <ul className="text-sm space-y-1">
          <li>Token: {process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? '✅ Available' : '❌ Missing'}</li>
          <li>Mapbox GL: {typeof window !== 'undefined' && window.mapboxgl ? '✅ Loaded' : '❌ Not loaded'}</li>
          <li>Container: {containerRef.current ? '✅ Ready' : '❌ Not ready'}</li>
        </ul>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full h-96 border rounded-lg bg-gray-200"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
} 