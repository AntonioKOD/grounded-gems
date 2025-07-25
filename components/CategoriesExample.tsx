'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  type: string
  description?: string
  icon?: string
  color?: string
  order?: number
  isActive: boolean
  showInFilter: boolean
  source?: string
  createdAt: string
  updatedAt: string
}

interface CategoriesResponse {
  success: boolean
  docs: Category[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
}

export default function CategoriesExample() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch categories using the Fetch API
  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🚀 Fetching categories from API...')
      
      // Make the fetch request to the categories endpoint
      const response = await fetch('/api/categories')
      
      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Parse the JSON response (dictionary/object format)
      const data: CategoriesResponse = await response.json()
      
      console.log('📊 Categories response:', {
        success: data.success,
        totalDocs: data.totalDocs,
        docsCount: data.docs?.length || 0
      })
      
      // Verify the response structure
      if (!data.success) {
        throw new Error('API returned success: false')
      }
      
      if (!Array.isArray(data.docs)) {
        throw new Error('Categories data is not an array')
      }
      
      // Set the categories in state
      setCategories(data.docs)
      console.log('✅ Categories loaded successfully:', data.docs.length)
      
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading categories</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchCategories}
              className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Categories Example</h2>
      <p className="text-gray-600 mb-6">
        Total categories loaded: {categories.length}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900">{category.name}</h3>
              {category.isActive ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">/{category.slug}</p>
            
            {category.description && (
              <p className="text-sm text-gray-500 mb-3">
                {category.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Type: {category.type}</span>
              {category.order && <span>Order: {category.order}</span>}
            </div>
            
            {category.color && (
              <div className="mt-2 flex items-center">
                <div
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-xs text-gray-500">{category.color}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 