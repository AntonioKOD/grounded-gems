"use client"

import React from "react"
import { Bookmark, Sparkles } from "lucide-react"
import ProtectedRoute from '@/components/auth/protected-route'

export default function BucketListClient({ plans }: { plans: any[] }) {
  return (
    <ProtectedRoute>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="h-8 w-8 text-[#FFD93D]" />
          <h1 className="text-2xl font-bold">Gem List</h1>
        </div>
        <p className="mb-6 text-gray-600">Your saved Hangout Plans and bucket list plans will appear here.</p>
        {plans.length === 0 ? (
          <div className="text-gray-500">No saved Hangout Plans yet.</div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-[#FF6B6B]" />
                  <span className="font-semibold text-lg">{plan.title}</span>
                </div>
                <div className="text-gray-700 text-sm mb-1">{plan.summary}</div>
                <div className="text-xs text-gray-400">Saved on {plan.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
} 