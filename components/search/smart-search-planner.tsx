"use client"

import React, { useState } from 'react'
import { Search, MapPin, Clock, Users, DollarSign, Filter, Calendar, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SmartSearchPlannerProps {
  className?: string
  placeholder?: string
  showPlannerMode?: boolean
}

export default function SmartSearchPlanner({ 
  className, 
  placeholder = "Search places or plan your trip...",
  showPlannerMode = false 
}: SmartSearchPlannerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isPlanning, setIsPlanning] = useState(showPlannerMode)
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    budget: '',
    groupSize: '',
    category: ''
  })

  // Quick filters following Zipf's Law (most used first)
  const quickFilters = [
    { id: 'coffee', label: '☕ Coffee', count: '127' },
    { id: 'food', label: '🍽️ Food', count: '89' },
    { id: 'nature', label: '🌲 Nature', count: '45' },
    { id: 'nightlife', label: '🌙 Nightlife', count: '23' },
    { id: 'art', label: '🎨 Arts', count: '18' },
    { id: 'shopping', label: '🛍️ Shopping', count: '12' }
  ]

  // Quick planning templates
  const planningTemplates = [
    { id: 'date-night', label: '💕 Date Night', duration: '2-3 hours' },
    { id: 'weekend-explore', label: '🗺️ Weekend Explorer', duration: '1-2 days' },
    { id: 'coffee-crawl', label: '☕ Coffee Crawl', duration: '3-4 hours' },
    { id: 'foodie-tour', label: '🍽️ Foodie Tour', duration: '4-5 hours' }
  ]

  return (
    <div className={cn('w-full max-w-4xl mx-auto p-4', className)}>
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isPlanning ? '📅 Plan Your Trip' : '🔍 Discover Places'}
        </h1>
        <Button
          variant="outline"
          onClick={() => setIsPlanning(!isPlanning)}
          className="flex items-center space-x-2"
        >
          {isPlanning ? <Search className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
          <span>{isPlanning ? 'Search Mode' : 'Plan Mode'}</span>
        </Button>
      </div>

      {/* Main search bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
        />
        {searchQuery && (
          <Button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4]"
            size="sm"
          >
            Search
          </Button>
        )}
      </div>

      {!isPlanning ? (
        // Search Mode
        <div className="space-y-6">
          {/* Quick filter chips */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Categories</h3>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  className="flex items-center space-x-1 px-3 py-2 rounded-full border border-gray-200 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-colors"
                >
                  <span className="text-sm">{filter.label}</span>
                  <span className="text-xs text-gray-500">({filter.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <Input
                placeholder="Near me"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Budget
              </label>
              <select className="w-full p-2 border border-gray-200 rounded-lg">
                <option>Any budget</option>
                <option>Free</option>
                <option>Budget ($)</option>
                <option>Moderate ($$)</option>
                <option>Premium ($$$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="inline h-4 w-4 mr-1" />
                Group Size
              </label>
              <select className="w-full p-2 border border-gray-200 rounded-lg">
                <option>Any size</option>
                <option>Solo</option>
                <option>Couple</option>
                <option>Small group</option>
                <option>Large group</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Open Now
              </label>
              <select className="w-full p-2 border border-gray-200 rounded-lg">
                <option>Any time</option>
                <option>Open now</option>
                <option>Open later</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        // Planning Mode
        <div className="space-y-6">
          {/* Planning templates */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Plan Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {planningTemplates.map((template) => (
                <button
                  key={template.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{template.label}</span>
                    <span className="text-xs text-gray-500">{template.duration}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Planning form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                When?
              </label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Duration
              </label>
              <select className="w-full p-2 border border-gray-200 rounded-lg">
                <option>2-3 hours</option>
                <option>Half day</option>
                <option>Full day</option>
                <option>Weekend</option>
              </select>
            </div>
          </div>

          {/* Plan action */}
          <Button className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90 py-3">
            <Calendar className="h-4 w-4 mr-2" />
            Create My Plan
          </Button>
        </div>
      )}

      {/* Recent searches/plans */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {isPlanning ? 'Recent Plans' : 'Recent Searches'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {['Coffee shops downtown', 'Date night ideas', 'Weekend brunch spots'].map((item) => (
            <button
              key={item}
              className="text-sm text-gray-600 hover:text-[#FF6B6B] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 