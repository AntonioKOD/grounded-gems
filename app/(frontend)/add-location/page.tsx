import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import AddLocationForm from "./add-location-form"

export const dynamic = 'force-dynamic'

export default function AddLocationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span>Back to home</span>
        </Link>

        <div className="max-w-4xl mx-auto">
          <AddLocationForm />
        </div>
      </div>
    </div>
  )
}
