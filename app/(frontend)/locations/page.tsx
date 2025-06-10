import { Metadata } from 'next'
import LocationsExplore from './locations-explore'

export const metadata: Metadata = {
  title: 'Explore Locations - Sacavia',
  description: 'Discover amazing places and hidden gems in your area and beyond',
  keywords: 'locations, places, explore, discover, travel, local, businesses',
}

export default function LocationsPage() {
  return <LocationsExplore />
} 