import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test Private Location Feature | Sacavia',
  description: 'Test page for private location functionality',
}

export default function TestPrivateLocationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Private Location Feature Test</h1>
          <p className="text-gray-600 mt-1">Test the private location functionality</p>
        </div>
      </div>
      {children}
    </div>
  )
} 