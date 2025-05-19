"use client"

import { Users, Calendar, MapPin, LayoutList } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function MobileNavigation() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/matchmaking",
      icon: Users,
      label: "Matchmaking",
      active: pathname === "/matchmaking" || pathname.startsWith("/matchmaking/"),
    },
    {
      href: "/events",
      icon: Calendar,
      label: "Events",
      active: pathname === "/events" || pathname.startsWith("/events/"),
    },
    {
      href: "/add-event",
      icon: Calendar,
      label: "Add Event",
      isCenter: true,
      active: pathname === "/add-event",
    },
    {
      href: "/locations",
      icon: MapPin,
      label: "Locations",
      active: pathname === "/locations" || pathname.startsWith("/locations/"),
    },
    {
      href: "/feed",
      icon: LayoutList,
      label: "Feed",
      active: pathname === "/feed",
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-50 md:hidden">
      <div className="flex justify-between items-center">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex flex-col items-center">
            {item.isCenter ? (
              <div className="w-12 h-12 rounded-full bg-[#FF6B6B] flex items-center justify-center -mt-5 shadow-md">
                <item.icon className="h-6 w-6 text-white" />
              </div>
            ) : (
              <item.icon className={cn("h-6 w-6", item.active ? "text-[#FF6B6B]" : "text-gray-500")} />
            )}
            <span className={cn("text-xs mt-1", item.active ? "font-medium text-[#FF6B6B]" : "text-gray-500")}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
