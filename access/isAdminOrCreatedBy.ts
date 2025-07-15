import { Access } from 'payload'

export const isAdminOrCreatedBy: Access = async ({ req, req: { user }, data, id }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  
  // If we have data.creator or data.createdBy, we can check it directly
  if (data?.creator === user.id || data?.createdBy === user.id) return true
  
  // For guides, we need to check the creator field
  // For events, we need to check the createdBy field
  // Since we can't determine collection from req context, we'll try both
  if (id) {
    try {
      // Try guides first
      const guideDoc = await req.payload.findByID({
        collection: 'guides',
        id,
      })
      if (guideDoc && (guideDoc.creator?.id === user.id || guideDoc.creator === user.id)) {
        return true
      }
    } catch (error) {
      // Document not found in guides, try events
    }
    
    try {
      // Try events
      const eventDoc = await req.payload.findByID({
        collection: 'events',
        id,
      })
      if (eventDoc && eventDoc.createdBy === user.id) {
        return true
      }
    } catch (error) {
      // Document not found in events
    }
  }
  
  return false
}
