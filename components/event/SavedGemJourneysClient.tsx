"use client"

import React from "react"
import { Bookmark, Sparkles } from "lucide-react"
import Link from "next/link"

export default function SavedGemJourneysClient({ plans }: { plans: any[] }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-gray-50 shadow-sm">
        <span className="text-gray-500">No saved Gem Journeys yet.</span>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-100">
      {plans.map(plan => {
        let ownerId = plan.owner;
        if (ownerId && typeof ownerId === 'object') {
          ownerId = ownerId.id || ownerId._id;
        }
        ownerId = ownerId || plan.userId;
        return (
          <Link
            key={plan.id}
            href={`/profile/${ownerId}/journey/${plan.id}`}
            className="border rounded-lg p-4 bg-white shadow flex flex-col gap-1 hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-[#FF6B6B]" />
              <span className="font-semibold text-lg">{plan.title}</span>
              {plan.type && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {plan.type === 'date' ? 'Date' : plan.type === 'group' ? 'Group' : plan.type === 'friend_group' ? 'Friend Group' : plan.type}
                </span>
              )}
            </div>
            <div className="text-gray-700 text-sm mb-1">{plan.summary}</div>
            <div className="text-xs text-gray-400">Saved on {plan.date}</div>
          </Link>
        )
      })}
    </div>
  )
} 