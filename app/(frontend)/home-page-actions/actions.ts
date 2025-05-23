/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use server"

import { getPayload } from "payload"
import config from "@/payload.config"
import { cookies } from "next/headers"
import { haversineDistance } from "@/lib/utils"
import { getImageUrl } from "@/lib/image-utils"
import { AppLocation } from "@/types/location"
import { AppEvent } from "@/types/event"

// … your existing interfaces …

// -----------------------------
// 1. Nearby or Popular Locations
// -----------------------------
export async function getNearbyOrPopularLocations(
  coordinates?: { latitude: number; longitude: number },
  limit = 6,
  radius = 25,
): Promise<AppLocation[]> {
  const payload = await getPayload({ config })
  const { docs: all } = await payload.find({
    collection: "locations",
    limit: 50,
    sort: "-createdAt",
    depth: 1,
  })

  // if coords, filter & sort by distance
  if (coordinates?.latitude && coordinates?.longitude) {
    const nearby = all
      .filter((loc: any) => loc.location?.coordinates)
      .map((loc: any) => ({
        ...loc,
        distance: haversineDistance(
          coordinates.latitude,
          coordinates.longitude,
          loc.location.coordinates.latitude,
          loc.location.coordinates.longitude,
        ),
      }))
      .filter((loc: any) => loc.distance! <= radius)
      .sort((a: any, b: any) => a.distance! - b.distance!)
      .slice(0, limit)

    return nearby.map(loc => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      location: loc.location,
      category: loc.category,
      rating: loc.rating,
      image: getImageUrl(loc.image?.url || "/abstract-location.png"),
      distance: loc.distance,
    }))
  }

  // otherwise return most “popular” (by rating desc)
  const popular = all
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)

  return popular.map(loc => ({
    id: loc.id as string ,
    name: loc.name,
    description: loc.description,
    location: loc.location,
    category: loc.category,
    rating: loc.rating,
    image: getImageUrl(loc.image?.url || "/abstract-location.png"),
  }))
}

// ---------------------------
// 2. Suggested or Popular Events
// ---------------------------
export async function getSuggestedOrPopularEvents(
  userId?: string,
  coordinates?: { latitude: number; longitude: number },
  limit = 6,
): Promise<AppEvent[]> {
  const payload = await getPayload({ config })

  // fetch user preferences if logged in
  let prefs: string[] = []
  if (userId) {
    try {
      const user = await payload.findByID({ collection: "users", id: userId })
      prefs = (user as any).interests?.map((i: any) => i.interest) || []
    } catch {
      prefs = []
    }
  }

  // base query: future events only
  const { docs: raw } = await payload.find({
    collection: "events",
    where: {
      status: { equals: "published" },
      date: { greater_than: new Date().toISOString() },
    },
    sort: "date",
    limit: 50,
    depth: 1,
  })

  // normalize
  let events = raw.map((e: any) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    date: e.date,
    location: e.location,
    category: e.category,
    image: getImageUrl(e.image?.url || "/community-event.png"),
    attendeesCount: (e.attendees || []).length,
  }))

  // if coords, add & sort by distance
  if (coordinates?.latitude && coordinates?.longitude) {
    events = events
      .filter(evt => evt.location?.coordinates)
      .map(evt => ({
        ...evt,
        distance: haversineDistance(
          coordinates.latitude,
          coordinates.longitude,
          evt.location.coordinates.latitude,
          evt.location.coordinates.longitude,
        ),
      }))
      .sort((a, b) => (a.distance! - b.distance!))
  }

  // if user has prefs, try to pick their categories first
  if (prefs.length) {
    const preferred = events.filter(evt => evt.category && prefs.includes(evt.category))
    if (preferred.length >= limit) {
      return preferred.slice(0, limit)
    }
    const others = events.filter(evt => !prefs.includes(evt.category))
    return [...preferred, ...others].slice(0, limit)
  }

  // if no coords & no prefs, return most “popular” by attendance
  if (!coordinates) {
    events = events.sort((a, b) => (b.attendeesCount || 0) - (a.attendeesCount || 0))
  }

  return events.slice(0, limit)
}