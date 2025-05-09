'use server'
import { getPayload } from "payload";
import config from '@payload-config';

import {logout} from '@payloadcms/next/auth'





export async function getLocations() {
  try {
    const payload = await getPayload({ config: config })

    // Fetch locations with categories and other related fields
    const result = await payload.find({
      collection: "locations",
      depth: 2, // Increase depth to get related fields like categories
      limit: 100,
      overrideAccess: true,
    })

    console.log(`Fetched ${result.docs?.length || 0} locations from Payload CMS`)

    // Process the locations to ensure they have the required fields
    const processedLocations = result.docs.map((location) => {
      // Extract coordinates
      const latitude = location.coordinates?.latitude || null
      const longitude = location.coordinates?.longitude || null

      // Log coordinates for debugging
      if (latitude && longitude) {
        console.log(`Location "${location.name}" coordinates: [${latitude}, ${longitude}]`)
      } else {
        console.warn(`Location "${location.name}" is missing coordinates`)
      }

      // Format the address
      let formattedAddress = ""
      if (location.address) {
        const addressParts = [
          location.address.street,
          location.address.city,
          location.address.state,
          location.address.zip,
          location.address.country,
        ].filter(Boolean)
        formattedAddress = addressParts.join(", ")
      }

      // Get image URL
      let imageUrl = null
      if (location.featuredImage) {
        if (typeof location.featuredImage === "string") {
          imageUrl = location.featuredImage
        } else if (location.featuredImage.url) {
          imageUrl = location.featuredImage.url
        }
      }

      return {
        ...location,
        latitude,
        longitude,
        address: formattedAddress || location.address,
        imageUrl,
      }
    })

    // Filter out locations without valid coordinates
    const validLocations = processedLocations.filter(
      (loc) => loc.latitude !== null && loc.longitude !== null && !isNaN(loc.latitude) && !isNaN(loc.longitude),
    )

    console.log(`Returning ${validLocations.length} valid locations`)

    return validLocations
  } catch (error) {
    console.error("Error fetching locations:", error)
    return []
  }
}

// Your other server actions...

// Add the getCategories export to your actions file if it's not already there
export async function getCategories() {
  const payload = await getPayload({ config: config })
  const result = await payload.find({
    collection: "categories",
    depth: 1,
    where: {
      isActive: {
        equals: true,
      },
    },
    sort: "order",
    limit: 100,
    overrideAccess: true,
  })
  return result
}


  export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface LocationFormData {
  // Basic
  name: string;
  slug: string;
  description: string; // richText value from your editor
  shortDescription?: string;

  // Media
  featuredImage?: string; // media document ID
  gallery?: { image: string; caption?: string }[];

  // Taxonomy
  categories?: string[];              // category document IDs
  tags?: { tag: string }[];

  // Address
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  neighborhood?: string;

  // Contact & Business
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    };
  };

  businessHours?: Array<{
    day: DayOfWeek;
    open?: string;    // e.g. "09:00"
    close?: string;   // e.g. "17:00"
    closed?: boolean;
  }>;

  priceRange?: 'free' | 'budget' | 'moderate' | 'expensive' | 'luxury';

  // Visitor Info
  bestTimeToVisit?: { season: string }[];
  insiderTips?: string; // richText

  accessibility?: {
    wheelchairAccess?: boolean;
    parking?: boolean;
    other?: string;
  };

  // Creator & Status
  createdBy?: string; // user document ID
  status: 'draft' | 'review' | 'published' | 'archived';
  isFeatured?: boolean;
  isVerified?: boolean;

  // Monetization & Analytics
  visitVerificationCount?: number;
  hasBusinessPartnership?: boolean;
  partnershipDetails?: {
    partnerName?: string;
    partnerContact?: string;
    details?: string;
  };

  // SEO & Metadata
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
}

/**
 * Server Action: create a Location in Payload,
 * automatically geocoding the address via Mapbox.
 */
export async function createLocation(data: LocationFormData) {
  // 1. Build full address string
  const { street, city, state, zip, country } = data.address;
  const fullAddress = [street, city, state, zip, country]
    .filter(Boolean)
    .join(', ');

  // 2. Forward-geocode via Mapbox
  const geoRes = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(fullAddress)}.json` +
      `?access_token=${process.env.NEXT_SECRET_MAPBOX_ACCESS_TOKEN}`
  );
  if (!geoRes.ok) {
    throw new Error(`Mapbox geocoding failed: ${geoRes.status} ${geoRes.statusText}`);
  }
  const geoJson = await geoRes.json();
  const [longitude = 0, latitude = 0] =
    geoJson.features?.[0]?.geometry?.coordinates || [];

  // 3. Create the document in Payload
  const payload = await getPayload({config: config});
  const created = await payload.create({
    collection: 'locations',
    data: {
      ...data,
      coordinates: { latitude, longitude },
    },
  });

  return created;
}



interface SignupInput {
  email: string;
  password: string;
  name: string;
}



export async function signupUser(data: SignupInput){
  const payload = await getPayload({ config: config });
  try{
    const user = await payload.create({
      collection: 'users',
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    
    })
        return user
  } catch (error) { 
    console.error('Error creating user:', error);
    throw new Error('User creation failed');
  }
}


export async function logoutUser(){
  try{
    return await logout({config: config})

  }catch(err){
    console.error('Error logging out:', err);
    throw new Error('Logout failed');
  }
}