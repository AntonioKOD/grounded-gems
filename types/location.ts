export interface LocationAddress {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  
  export interface LocationCoordinates {
    latitude: number
    longitude: number
  }
  
  export interface LocationFormData {
    name: string
    description?: string
    address: LocationAddress
    contactInfo?: {
      phone?: string
      email?: string
      website?: string
    }
    businessHours?: Array<{
      day: string
      open?: string
      close?: string
      closed?: boolean
    }>
    accessibility?: {
      wheelchairAccess?: boolean
      parking?: boolean
      other?: string
    }
  }
  
  export interface Location {
    id: string
    name: string
    description?: string
    address: LocationAddress | string
    coordinates?: LocationCoordinates
    contactInfo?: {
      phone?: string
      email?: string
      website?: string
    }
    businessHours?: Array<{
      day: string
      open?: string
      close?: string
      closed?: boolean
    }>
    accessibility?: {
      wheelchairAccess?: boolean
      parking?: boolean
      other?: string
    }
    createdAt: string
    updatedAt: string
  }
  