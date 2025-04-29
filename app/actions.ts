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