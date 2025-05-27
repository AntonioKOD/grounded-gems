"use client"

import Link from "next/link"
import { MapPin, Search, Plus, Calendar } from "lucide-react"

interface QuickActionsProps {
  className?: string
}

export default function QuickActions({ className = "" }: QuickActionsProps) {
  // Following Zipf's Law: Most used actions get prime real estate
  const quickActions = [
    {
      href: "/map",
      icon: MapPin,
      label: "Explore",
      description: "Find places nearby",
      color: "bg-[#4ECDC4]",
      hoverColor: "hover:bg-[#3DBDB5]"
    },
    {
      href: "/search",
      icon: Search,
      label: "Search",
      description: "Find specific places",
      color: "bg-[#FF6B6B]",
      hoverColor: "hover:bg-[#FF5555]"
    },
    {
      href: "/add-location",
      icon: Plus,
      label: "Add Place",
      description: "Share a discovery",
      color: "bg-gray-600",
      hoverColor: "hover:bg-gray-700"
    },
    {
      href: "/events",
      icon: Calendar,
      label: "Events",
      description: "What's happening",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600"
    }
  ]

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <Link key={action.label} href={action.href}>
            <div className={`${action.color} ${action.hoverColor} text-white p-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg`}>
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs opacity-90 truncate">{action.description}</p>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
} 