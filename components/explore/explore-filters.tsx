"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon, FilterX, SlidersHorizontal } from "lucide-react"
import { format } from "date-fns"

// Define filter types for type safety
export interface ExploreFilters {
  category?: string
  date?: string
  price?: string
  distance?: string
  rating?: string
  openNow?: boolean
  fromDate?: string
  toDate?: string
}

interface ExploreFiltersProps {
  onFilterChange: (filters: ExploreFilters) => void
  totalResults: number
  showMobileFilters: boolean
  setShowMobileFilters: (show: boolean) => void
}

export default function ExploreFilters({
  onFilterChange,
  totalResults,
  showMobileFilters,
  setShowMobileFilters,
}: ExploreFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize filters from URL params
  const [filters, setFilters] = useState<ExploreFilters>({
    category: searchParams.get("category") || undefined,
    date: searchParams.get("date") || undefined,
    price: searchParams.get("price") || undefined,
    distance: searchParams.get("distance") || undefined,
    rating: searchParams.get("rating") || undefined,
    openNow: searchParams.get("openNow") === "true",
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
  })

  // Date picker state
  const [fromDate, setFromDate] = useState<Date | undefined>(filters.fromDate ? new Date(filters.fromDate) : undefined)
  const [toDate, setToDate] = useState<Date | undefined>(filters.toDate ? new Date(filters.toDate) : undefined)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    // Add or remove params based on filter values
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })

    // Update URL without reloading the page
    const newUrl = `${pathname}?${params.toString()}`
    router.push(newUrl, { scroll: false })

    // Notify parent component about filter changes
    onFilterChange(filters)
  }, [filters, pathname, router, onFilterChange, searchParams])

  // Handle date changes
  useEffect(() => {
    if (fromDate) {
      setFilters((prev) => ({
        ...prev,
        fromDate: format(fromDate, "yyyy-MM-dd"),
      }))
    }

    if (toDate) {
      setFilters((prev) => ({
        ...prev,
        toDate: format(toDate, "yyyy-MM-dd"),
      }))
    }
  }, [fromDate, toDate])

  const clearFilters = () => {
    setFilters({})
    setFromDate(undefined)
    setToDate(undefined)
  }

  const hasActiveFilters = Object.values(filters).some((val) => val !== undefined && val !== "")

  // Desktop filter sidebar
  const FilterSidebar = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-red-500">
            <FilterX className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["category", "price", "date", "filters"]}>
        <AccordionItem value="category" className="border-b">
          <AccordionTrigger className="text-sm font-medium">Category</AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.category}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restaurants" id="restaurants" />
                <Label htmlFor="restaurants" className="text-sm cursor-pointer">
                  Restaurants
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bars" id="bars" />
                <Label htmlFor="bars" className="text-sm cursor-pointer">
                  Bars & Nightlife
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cafes" id="cafes" />
                <Label htmlFor="cafes" className="text-sm cursor-pointer">
                  Cafes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attractions" id="attractions" />
                <Label htmlFor="attractions" className="text-sm cursor-pointer">
                  Attractions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hotels" id="hotels" />
                <Label htmlFor="hotels" className="text-sm cursor-pointer">
                  Hotels
                </Label>
              </div>
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price" className="border-b">
          <AccordionTrigger className="text-sm font-medium">Price Range</AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={filters.price}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, price: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$" id="price-1" />
                <Label htmlFor="price-1" className="text-sm cursor-pointer">
                  $ (Inexpensive)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$$" id="price-2" />
                <Label htmlFor="price-2" className="text-sm cursor-pointer">
                  $$ (Moderate)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$$$" id="price-3" />
                <Label htmlFor="price-3" className="text-sm cursor-pointer">
                  $$$ (Expensive)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$$$$" id="price-4" />
                <Label htmlFor="price-4" className="text-sm cursor-pointer">
                  $$$$ (Very Expensive)
                </Label>
              </div>
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="date" className="border-b">
          <AccordionTrigger className="text-sm font-medium">Date</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="from-date" className="text-xs">
                From
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="to-date" className="text-xs">
                To
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    disabled={(date) => (fromDate ? date < fromDate : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="filters" className="border-b">
          <AccordionTrigger className="text-sm font-medium">More Filters</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Distance</Label>
              <RadioGroup
                value={filters.distance}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, distance: value }))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1km" id="distance-1" />
                  <Label htmlFor="distance-1" className="text-sm cursor-pointer">
                    Within 1 km
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5km" id="distance-2" />
                  <Label htmlFor="distance-2" className="text-sm cursor-pointer">
                    Within 5 km
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10km" id="distance-3" />
                  <Label htmlFor="distance-3" className="text-sm cursor-pointer">
                    Within 10 km
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="20km" id="distance-4" />
                  <Label htmlFor="distance-4" className="text-sm cursor-pointer">
                    Within 20 km
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Rating</Label>
              <RadioGroup
                value={filters.rating}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, rating: value }))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="rating-1" />
                  <Label htmlFor="rating-1" className="text-sm cursor-pointer">
                    4+ stars
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="rating-2" />
                  <Label htmlFor="rating-2" className="text-sm cursor-pointer">
                    3+ stars
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="rating-3" />
                  <Label htmlFor="rating-3" className="text-sm cursor-pointer">
                    2+ stars
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="open-now"
                checked={filters.openNow}
                onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, openNow: checked }))}
              />
              <Label htmlFor="open-now" className="text-sm cursor-pointer">
                Open Now
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="pt-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{totalResults}</span> results
        </p>
      </div>
    </div>
  )

  // Mobile filters as a bottom sheet
  const MobileFilterSheet = () => (
    <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine your search with the filters below.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-24">
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="w-full">
              <FilterX className="h-4 w-4 mr-2" />
              Clear all filters
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="font-medium">Category</h3>
            <RadioGroup
              value={filters.category}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restaurants" id="m-restaurants" />
                <Label htmlFor="m-restaurants" className="text-sm cursor-pointer">
                  Restaurants
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bars" id="m-bars" />
                <Label htmlFor="m-bars" className="text-sm cursor-pointer">
                  Bars & Nightlife
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cafes" id="m-cafes" />
                <Label htmlFor="m-cafes" className="text-sm cursor-pointer">
                  Cafes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attractions" id="m-attractions" />
                <Label htmlFor="m-attractions" className="text-sm cursor-pointer">
                  Attractions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hotels" id="m-hotels" />
                <Label htmlFor="m-hotels" className="text-sm cursor-pointer">
                  Hotels
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Price Range</h3>
            <RadioGroup
              value={filters.price}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, price: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$" id="m-price-1" />
                <Label htmlFor="m-price-1" className="text-sm cursor-pointer">
                  $ (Inexpensive)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$$" id="m-price-2" />
                <Label htmlFor="m-price-2" className="text-sm cursor-pointer">
                  $$ (Moderate)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$$$" id="m-price-3" />
                <Label htmlFor="m-price-3" className="text-sm cursor-pointer">
                  $$$ (Expensive)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="$$$$" id="m-price-4" />
                <Label htmlFor="m-price-4" className="text-sm cursor-pointer">
                  $$$$ (Very Expensive)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Date</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m-from-date" className="text-xs">
                  From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="m-to-date" className="text-xs">
                  To
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                      disabled={(date) => (fromDate ? date < fromDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Distance</h3>
            <RadioGroup
              value={filters.distance}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, distance: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1km" id="m-distance-1" />
                <Label htmlFor="m-distance-1" className="text-sm cursor-pointer">
                  Within 1 km
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5km" id="m-distance-2" />
                <Label htmlFor="m-distance-2" className="text-sm cursor-pointer">
                  Within 5 km
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="10km" id="m-distance-3" />
                <Label htmlFor="m-distance-3" className="text-sm cursor-pointer">
                  Within 10 km
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="20km" id="m-distance-4" />
                <Label htmlFor="m-distance-4" className="text-sm cursor-pointer">
                  Within 20 km
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Rating</h3>
            <RadioGroup
              value={filters.rating}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, rating: value }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="m-rating-1" />
                <Label htmlFor="m-rating-1" className="text-sm cursor-pointer">
                  4+ stars
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="m-rating-2" />
                <Label htmlFor="m-rating-2" className="text-sm cursor-pointer">
                  3+ stars
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="m-rating-3" />
                <Label htmlFor="m-rating-3" className="text-sm cursor-pointer">
                  2+ stars
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="m-open-now"
              checked={filters.openNow}
              onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, openNow: checked }))}
            />
            <Label htmlFor="m-open-now" className="text-sm cursor-pointer">
              Open Now
            </Label>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <Button onClick={() => setShowMobileFilters(false)} className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
            Show {totalResults} results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {/* Desktop filters */}
      <div className="hidden md:block">
        <FilterSidebar />
      </div>

      {/* Mobile filters */}
      <div className="md:hidden">
        <MobileFilterSheet />
      </div>
    </>
  )
}
