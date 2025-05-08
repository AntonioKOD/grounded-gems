'use server'
import { getPayload } from "payload";
import config from '@payload-config';




export async function getLocations() {
 // Next.js Server Action
  
    // Initialize (or reuse) your running Payload instance
    const payload = await getPayload({ config: config });
  
    // Query the 'locations' collection without HTTP
    const result = await payload.find({
      collection: 'locations',
      depth: 0,             // no nested relations by default  [oai_citation:5‡Payload](https://payloadcms.com/docs/local-api/overview)
      overrideAccess: true, // bypass access control on server  [oai_citation:6‡Payload](https://payloadcms.com/docs/local-api/overview)
    });
  
    return result.docs.map(doc => ({
      id: String(doc.id),
      name: String(doc.name),
      latitude: Number(doc.coordinates.latitude),
      longitude: Number(doc.coordinates.longitude),
    }));
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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
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

export async function getCategories(){
  const payload = await getPayload({ config: config });
  const result = await payload.find({
    collection: 'categories',
    depth: 0,
    overrideAccess: true,
  });
  return result
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

