"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Check, Search, X, Tag, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CategoryOption {
  id: string
  name: string
  slug: string
  description?: string
  source: 'manual' | 'foursquare' | 'imported'
  foursquareIcon?: {
    prefix: string
    suffix: string
  }
  subcategories?: CategoryOption[]
  parent?: string
}

interface HierarchicalCategorySelectorProps {
  categories: CategoryOption[]
  selectedCategories: string[]
  onSelectionChange: (selectedIds: string[]) => void
  maxSelections?: number
  placeholder?: string
  showSearch?: boolean
  showBadges?: boolean
  allowSubcategorySelection?: boolean
  expandedByDefault?: boolean
}

export function HierarchicalCategorySelector({
  categories,
  selectedCategories,
  onSelectionChange,
  maxSelections = 5,
  placeholder = "Select categories...",
  showSearch = true,
  showBadges = true,
  allowSubcategorySelection = true,
  expandedByDefault = false
}: HierarchicalCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Debug logging
  console.log('🔍 HierarchicalCategorySelector received:', categories.length, 'categories')
  console.log('🔍 First few categories:', categories.slice(0, 3))
  
  // Flatten all categories and subcategories into a single list
  const flatCategories = useMemo(() => {
    const flattened: CategoryOption[] = []
    
    const addCategories = (cats: CategoryOption[], parentName?: string) => {
      cats.forEach(category => {
        // Add the parent category
        flattened.push({
          ...category,
          name: parentName ? `${parentName} → ${category.name}` : category.name
        })
        
        // Add subcategories if they exist and subcategory selection is allowed
        if (allowSubcategorySelection && category.subcategories && category.subcategories.length > 0) {
          addCategories(category.subcategories, category.name)
        }
      })
    }
    
    addCategories(categories)
    return flattened
  }, [categories, allowSubcategorySelection])

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return flatCategories
    
    return flatCategories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [flatCategories, searchTerm])

  const isSelectionLimitReached = selectedCategories.length >= maxSelections

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId)
    
    if (isSelected) {
      // Remove category
      onSelectionChange(selectedCategories.filter(id => id !== categoryId))
    } else if (!isSelectionLimitReached) {
      // Add category
      onSelectionChange([...selectedCategories, categoryId])
    }
  }

  const removeCategory = (categoryId: string) => {
    onSelectionChange(selectedCategories.filter(id => id !== categoryId))
  }

  const findCategoryById = (id: string): CategoryOption | null => {
    return flatCategories.find(cat => cat.id === id) || null
  }

  const CategoryIcon = ({ category }: { category: CategoryOption }) => {
    if (category.foursquareIcon && category.foursquareIcon.prefix && category.foursquareIcon.suffix) {
      return (
        <img
          src={`${category.foursquareIcon.prefix}16${category.foursquareIcon.suffix}`}
          alt=""
          className="w-4 h-4"
        />
      )
    }
    return <Tag className="h-4 w-4 text-gray-500" />
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Selected Categories Badges */}
      {showBadges && selectedCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Selected Categories:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-6 text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(categoryId => {
              const category = findCategoryById(categoryId)
              return category ? (
                <Badge 
                  key={categoryId} 
                  variant="secondary" 
                  className="flex items-center gap-2 px-2 py-1"
                >
                  <CategoryIcon category={category} />
                  <span className="text-xs font-medium">{category.name}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => removeCategory(categoryId)}
                  />
                </Badge>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Categories List */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="h-4 w-4 text-blue-600" />
              <span>{placeholder}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className={cn(
                "text-xs",
                selectedCategories.length >= maxSelections ? "text-orange-600 font-medium" : "text-gray-500"
              )}>
                {selectedCategories.length}/{maxSelections} selected
              </span>
              {filteredCategories.length !== flatCategories.length && (
                <Badge variant="outline" className="text-xs">
                  {filteredCategories.length} shown
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-80 pr-4">
            <div className="space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {searchTerm ? 'No categories match your search' : 'No categories available'}
                  </p>
                  {searchTerm && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="text-xs"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                filteredCategories.map(category => {
                  const isSelected = selectedCategories.includes(category.id)
                  const isDisabled = !isSelected && isSelectionLimitReached

                  return (
                    <div
                      key={category.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer",
                        isSelected 
                          ? "bg-blue-50 border-blue-300 shadow-sm" 
                          : "hover:bg-gray-50 hover:border-gray-300",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !isDisabled && handleCategoryToggle(category.id)}
                    >
                      <CategoryIcon category={category} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={cn(
                                "font-medium text-sm truncate",
                                isSelected ? "text-blue-900" : "text-gray-900"
                              )}>
                                {category.name}
                              </span>
                              
                              <Badge 
                                variant={category.source === 'foursquare' ? 'default' : 'outline'}
                                className="text-xs px-1 py-0"
                              >
                                {category.source}
                              </Badge>
                            </div>
                            
                            {category.description && (
                              <div className="text-xs text-gray-500 truncate mt-0.5">
                                {category.description}
                              </div>
                            )}
                          </div>
                          
                          {isSelected && (
                            <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selection Limit Warning */}
      {isSelectionLimitReached && (
        <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="h-2 w-2 bg-amber-500 rounded-full flex-shrink-0"></div>
          <span>
            Maximum number of categories selected ({maxSelections}). Remove some to add others.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex justify-between">
          <span>Available categories: {flatCategories.length}</span>
          <span>Selected: {selectedCategories.length}</span>
        </div>
      </div>
    </div>
  )
} 