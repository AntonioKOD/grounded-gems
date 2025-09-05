'use client'

import ProfileGrid from '@/components/ProfileGrid'

export default function TestProfileViewerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Profile Feed Viewer Test
          </h1>
          <p className="text-gray-600">
            Click on any grid tile to open the full-screen Instagram-style viewer.
            Use arrow keys, swipe gestures, or the navigation buttons to browse posts.
            Press ESC to close the viewer.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">@antonio_kodheli</h2>
          <ProfileGrid username="antonio_kodheli" />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Features to Test:</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click any grid tile to open the viewer</li>
            <li>• Use arrow keys (← →) to navigate between posts</li>
            <li>• Press ESC to close the viewer</li>
            <li>• Swipe left/right on touch devices</li>
            <li>• Videos autoplay when in view, pause when off-screen</li>
            <li>• URL updates with shallow routing (no page reload)</li>
            <li>• Browser back/forward buttons work correctly</li>
            <li>• Direct links like /u/antonio_kodheli/p/[postId] work</li>
            <li>• Infinite scroll loads more posts as you navigate</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

