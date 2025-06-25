import { Access } from 'payload'

export const isAdminOrCreatedBy: Access = async ({ req, req: { user }, data, id }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  
  // If we have data.creator or data.createdBy, we can check it directly
  if (data?.creator === user.id || data?.createdBy === user.id) return true
  
  // For guides, we need to check the creator field
  // For events, we need to check the createdBy field
  // We can determine this from the collection context
  if (id) {
    // Try to get collection from request context
    const collection = req.collection?.config?.slug
    
    if (collection === 'guides') {
      const doc = await req.payload.findByID({
        collection: 'guides',
        id,
      })
      return doc.creator?.id === user.id || doc.creator === user.id
    } else if (collection === 'events') {
      const doc = await req.payload.findByID({
        collection: 'events',
        id,
      })
      return doc.createdBy === user.id
    }
  }
  
  return false
}
