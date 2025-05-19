import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'

export async function POST(req: Request) {
  const { query } = await req.json()
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ success: true, locations: [] })
  }

  const payload = await getPayload({ config })
  const searchTerm = query.trim()

  // Build typed Where clauses
  const clauses: Where[] = [
    { name:               { like: searchTerm } },
    { 'address.street':   { like: searchTerm } },
    { 'address.city':     { like: searchTerm } },
    { 'address.state':    { like: searchTerm } },
    { 'address.zip':      { like: searchTerm } },
    { 'address.country':  { like: searchTerm } },
  ]
  const whereClause: Where = { or: clauses }

  const { docs } = await payload.find({
    collection: 'locations',
    where: whereClause,
    limit: 10,
    depth: 1,

  })

  const locations = docs.map(loc => {
    const addressParts = [
      loc.address?.street,
      loc.address?.city,
      loc.address?.state,
      loc.address?.zip,
      loc.address?.country,
    ].filter(Boolean)
    const formattedAddress = addressParts.join(', ')
    const { latitude = null, longitude = null } = loc.coordinates || {}

    return {
      id: loc.id,
      name: loc.name,
      address: formattedAddress,
      coordinates: { latitude, longitude },
    }
  })

  return NextResponse.json({ success: true, locations })
}
