"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Sparkles, Heart } from 'lucide-react'

export default function NoPeopleSuggestionsCard() {
  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-green-50 to-blue-50/50">
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          {/* Icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-lg">
              You're Following Everyone! 🎉
            </h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Great job building your community! You're already following all the suggested people. 
              New suggestions will appear as more users join.
            </p>
          </div>
          
          {/* Action hint */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <Heart className="h-3 w-3 text-red-400" />
            <span>Keep engaging with your network</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 