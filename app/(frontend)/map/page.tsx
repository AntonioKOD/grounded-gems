import MapExplorer from "./map-explorer"

export const dynamic = 'force-dynamic' 

export const metadata = {
  title: "Explore Map | Grounded Gems",
  description: "Discover events and locations near you with our interactive map",
}

export default function MapPage() {
  return (
    <div className="min-h-screen h-screen bg-white overflow-hidden">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          
          /* Prevent pull-to-refresh on mobile */
          body {
            overscroll-behavior: none;
          }
          
          /* Fix iOS height issues */
          @supports (-webkit-touch-callout: none) {
            .h-screen {
              height: -webkit-fill-available;
            }
          }
        `}</style>
      <MapExplorer />
    </div>
  )
}
