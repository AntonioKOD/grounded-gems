import { Metadata } from 'next'
import LocationsExplore from './locations-explore'

export const metadata: Metadata = {
  title: 'Best Places to Visit - Sacavia',
  description: 'Find the best restaurants, attractions, shops and hidden gems near you. Browse top-rated places and local recommendations.',
  keywords: 'best restaurants, places to visit, local attractions, things to do, places to eat, shopping, entertainment venues',
}

export default function LocationsPage() {
  return <LocationsExplore />
} 