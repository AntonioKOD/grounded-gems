"use client"

import React, { useState, useEffect } from 'react'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'

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
}

export function HierarchicalCategorySelector({
  categories,
  selectedCategories,
  onSelectionChange,
  maxSelections = 5,
  placeholder = "Select categories...",
  showSearch = true,
  showBadges = true,
  allowSubcategorySelection = true
}: HierarchicalCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [filteredCategories, setFilteredCategories] = useState<CategoryOption[]>(categories)

  // Filter categories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories)
      return
    }

    const filtered = categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const hasMatchingSubcategories = category.subcategories?.some(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )

      return matchesSearch || hasMatchingSubcategories
    }).map(category => ({
      ...category,
      subcategories: category.subcategories?.filter(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))

    setFilteredCategories(filtered)
  }, [searchTerm, categories])

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = [...selectedCategories]
    const isSelected = newSelected.includes(categoryId)

    if (isSelected) {
      // Remove category and all its subcategories
      const categoryToRemove = findCategoryById(categoryId, categories)
      const idsToRemove = [categoryId]
      if (categoryToRemove?.subcategories) {
        idsToRemove.push(...categoryToRemove.subcategories.map(sub => sub.id))
      }
      onSelectionChange(newSelected.filter(id => !idsToRemove.includes(id)))
    } else {
      // Add category if not at max limit
      if (newSelected.length < maxSelections) {
        newSelected.push(categoryId)
        onSelectionChange(newSelected)
      }
    }
  }

  const handleSubcategoryToggle = (subcategoryId: string, parentId: string) => {
    if (!allowSubcategorySelection) return

    const newSelected = [...selectedCategories]
    const isSelected = newSelected.includes(subcategoryId)

    if (isSelected) {
      onSelectionChange(newSelected.filter(id => id !== subcategoryId))
    } else {
      if (newSelected.length < maxSelections) {
        newSelected.push(subcategoryId)
        onSelectionChange(newSelected)
      }
    }
  }

  const removeCategory = (categoryId: string) => {
    onSelectionChange(selectedCategories.filter(id => id !== categoryId))
  }

  const findCategoryById = (id: string, categoriesList: CategoryOption[]): CategoryOption | null => {
    for (const category of categoriesList) {
      if (category.id === id) return category
      if (category.subcategories) {
        const found = findCategoryById(id, category.subcategories)
        if (found) return found
      }
    }
    return null
  }

  const getSelectedCategoryNames = () => {
    return selectedCategories.map(id => {
      const category = findCategoryById(id, categories)
      return category ? category.name : 'Unknown'
    })
  }

  const isSelectionLimitReached = selectedCategories.length >= maxSelections

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {showBadges && selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(categoryId => {
            const category = findCategoryById(categoryId, categories)
            return category ? (
              <Badge key={categoryId} variant="secondary" className="flex items-center gap-2">
                {category.foursquareIcon && (
                  <img
                    src={`${category.foursquareIcon.prefix}32${category.foursquareIcon.suffix}`}
                    alt=""
                    className="w-4 h-4"
                  />
                )}
                {category.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeCategory(categoryId)}
                />
              </Badge>
            ) : null
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            {placeholder}
            <span className="text-xs text-gray-500">
              {selectedCategories.length}/{maxSelections} selected
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredCategories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No categories found
                </p>
              ) : (
                filteredCategories.map(category => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      {category.subcategories && category.subcategories.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleCategoryExpansion(category.id)}
                        >
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex-1 justify-start h-auto p-2 ${
                          selectedCategories.includes(category.id) ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => handleCategoryToggle(category.id)}
                        disabled={!selectedCategories.includes(category.id) && isSelectionLimitReached}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          {category.foursquareIcon && (
                            <img
                              src={`${category.foursquareIcon.prefix}32${category.foursquareIcon.suffix}`}
                              alt=""
                              className="w-5 h-5"
                            />
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">{category.name}</div>
                            {category.description && (
                              <div className="text-xs text-gray-500">{category.description}</div>
                            )}
                          </div>
                          {selectedCategories.includes(category.id) && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </Button>
                    </div>

                    {/* Subcategories */}
                    {allowSubcategorySelection && category.subcategories && expandedCategories.has(category.id) && (
                      <Collapsible open={expandedCategories.has(category.id)}>
                        <CollapsibleContent>
                          <div className="ml-8 space-y-1">
                            {category.subcategories.map(subcategory => (
                              <Button
                                key={subcategory.id}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start h-auto p-2 ${
                                  selectedCategories.includes(subcategory.id) ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                                onClick={() => handleSubcategoryToggle(subcategory.id, category.id)}
                                disabled={!selectedCategories.includes(subcategory.id) && isSelectionLimitReached}
                              >
                                <div className="flex items-center space-x-2 w-full">
                                  {subcategory.foursquareIcon && (
                                    <img
                                      src={`${subcategory.foursquareIcon.prefix}32${subcategory.foursquareIcon.suffix}`}
                                      alt=""
                                      className="w-4 h-4"
                                    />
                                  )}
                                  <div className="flex-1 text-left">
                                    <div className="font-medium text-sm">{subcategory.name}</div>
                                    {subcategory.description && (
                                      <div className="text-xs text-gray-500">{subcategory.description}</div>
                                    )}
                                  </div>
                                  {selectedCategories.includes(subcategory.id) && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isSelectionLimitReached && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
          Maximum number of categories selected ({maxSelections}). Remove some to add others.
        </div>
      )}
    </div>
  )
} 