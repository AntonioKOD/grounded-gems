"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  type: string
  source: string
  isActive?: boolean
}

interface CategorySearchProps {
  selectedCategories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  placeholder?: string
  maxSelections?: number
  className?: string
}

export default function CategorySearch({
  selectedCategories,
  onCategoriesChange,
  placeholder = "Search categories...",
  maxSelections = 3,
  className
}: CategorySearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch categories from API
  const fetchCategories = async (query: string = "") => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      
      const data = await response.json()
      let filteredCategories = data.docs || []
      
      // Filter by location type and search query
      filteredCategories = filteredCategories.filter((cat: Category) => 
        cat.type === 'location' && 
        cat.isActive !== false &&
        (query === "" || 
         cat.name.toLowerCase().includes(query.toLowerCase()) ||
         (cat.description && cat.description.toLowerCase().includes(query.toLowerCase())))
      )
      
      setCategories(filteredCategories)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories')
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchCategories()
  }, [])

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== "") {
        fetchCategories(searchQuery)
      } else {
        fetchCategories()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSelect = (category: Category) => {
    const isSelected = selectedCategories.some(cat => cat.id === category.id)
    
    if (isSelected) {
      // Remove category
      onCategoriesChange(selectedCategories.filter(cat => cat.id !== category.id))
    } else {
      // Add category (check max selections)
      if (selectedCategories.length < maxSelections) {
        onCategoriesChange([...selectedCategories, category])
      }
    }
    
    setSearchQuery("")
    setOpen(false)
  }

  const handleRemove = (categoryId: string) => {
    onCategoriesChange(selectedCategories.filter(cat => cat.id !== categoryId))
  }

  const isSelected = (categoryId: string) => {
    return selectedCategories.some(cat => cat.id === categoryId)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              {category.name}
              <button
                type="button"
                onClick={() => handleRemove(category.id)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12"
            disabled={selectedCategories.length >= maxSelections}
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {selectedCategories.length >= maxSelections 
                ? `Maximum ${maxSelections} categories selected`
                : placeholder
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              ref={inputRef}
              placeholder="Search categories..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading categories...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-sm text-red-500">
                  {error}
                </div>
              ) : categories.length === 0 ? (
                <CommandEmpty>No categories found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => handleSelect(category)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            isSelected(category.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-500">
                              {category.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected(category.id) && (
                        <Badge variant="outline" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Helper text */}
      <p className="text-sm text-gray-500">
        Select up to {maxSelections} categories that best describe this location
      </p>
    </div>
  )
}
