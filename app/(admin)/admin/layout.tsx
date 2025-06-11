import Link from 'next/link'
import { Camera, Users, MapPin, Settings } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Sacavia Admin</h1>
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  href="/admin" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/photo-reviews" 
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Photo Reviews
                </Link>
                <Link 
                  href="/admin/users" 
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Users
                </Link>
                <Link 
                  href="/admin/locations" 
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Locations
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
} 