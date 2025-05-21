import { Access } from 'payload'

export const isAdminOrCreatedBy: Access = async ({ req, req: { user }, data, id }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  
  // If we have data.createdBy, we can check it directly
  if (data?.createdBy === user.id) return true
  
  // Otherwise, we need to fetch the document to check
  if (id) {
    const doc = await req.payload.findByID({
      collection: 'events',
      id,
    })
    return doc.createdBy === user.id
  }
  
  return false
}
