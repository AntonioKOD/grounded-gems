import { Home, Search, Calendar, MapPin, LayoutList } from "lucide-react"
import Link from "next/link"

export default function MobileNavigation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-50">
      <div className="flex justify-between items-center">
        <Link href="/" className="flex flex-col items-center">
          <Home className="h-6 w-6 text-[#FF6B6B]" />
          <span className="text-xs mt-1">Home</span>
        </Link>

        <Link href="/explore" className="flex flex-col items-center">
          <Search className="h-6 w-6 text-gray-500" />
          <span className="text-xs mt-1">Explore</span>
        </Link>

        <Link href="/add-event" className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#FF6B6B] flex items-center justify-center -mt-5">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs mt-1">Add Event</span>
        </Link>

        <Link href="/locations" className="flex flex-col items-center">
          <MapPin className="h-6 w-6 text-gray-500" />
          <span className="text-xs mt-1">Locations</span>
        </Link>

        <Link href="/feed" className="flex flex-col items-center">
          <LayoutList className="h-6 w-6 text-gray-500" />
          <span className="text-xs mt-1">Feed</span>
        </Link>
      </div>
    </div>
  )
}
