import { CollectionConfig } from 'payload';
import { extractMentions, findUserIdsByUsernames } from "../payload-utils/notification-helpers"

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Post',
    plural: 'Posts',
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'createdAt'],
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc

        // Handle new post creation - check for mentions
        if (operation === "create") {
          // Extract mentions from content
          const mentions = extractMentions(doc.content)
          if (mentions.length > 0) {
            // Find user IDs from mentioned usernames
            const mentionedUserIds = await findUserIdsByUsernames(req.payload, mentions)

            // Get author details
            const author =
              typeof doc.author === "object"
                ? doc.author
                : await req.payload.findByID({ collection: "users", id: doc.author })

            // Create notifications for mentioned users
            for (const userId of mentionedUserIds) {
              await req.payload.create({
                collection: "notifications",
                data: {
                  recipient: userId,
                  type: "mention",
                  title: `${author.name} mentioned you in a post`,
                  message: doc.content.substring(0, 100) + (doc.content.length > 100 ? "..." : ""),
                  relatedTo: {
                    relationTo: "posts",
                    value: doc.id,
                  },
                  read: false,
                  createdAt: new Date().toISOString(),
                },
              })
            }
          }
          return doc
        }

        // Handle post updates
        if (operation === "update") {
          // Check if likes have changed
          const prevLikes = previousDoc.likes || []
          const newLikes = doc.likes || []

          // Find new likes
          const newLikeIds = newLikes.filter((likeId: string) => !prevLikes.includes(likeId))

          if (newLikeIds.length > 0) {
            // Get post author
            const authorId = typeof doc.author === "object" ? doc.author.id : doc.author

            // Create notifications for new likes
            for (const likerId of newLikeIds) {
              try {
                // Don't notify if user likes their own post
                if (likerId === authorId) continue

                // Get liker details
                const liker = await req.payload.findByID({
                  collection: "users",
                  id: likerId,
                })

                // Create notification
                await req.payload.create({
                  collection: "notifications",
                  data: {
                    recipient: authorId,
                    type: "like",
                    title: `${liker.name} liked your post`,
                    message: doc.title || doc.content.substring(0, 100),
                    relatedTo: {
                      relationTo: "posts",
                      value: doc.id,
                    },
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                })
              } catch (error) {
                console.error("Error creating like notification:", error)
              }
            }
          }

          // Check if comments have changed
          const prevComments = previousDoc.comments || []
          const newComments = doc.comments || []

          // Find new comments
          const newCommentIds = newComments.filter(
            (comment: { id: string; createdAt: string }) =>
              !prevComments.some(
                (prevComment: { id: string; createdAt: string }) => prevComment.id === comment.id || prevComment.createdAt === comment.createdAt,
              ),
          )

          if (newCommentIds.length > 0) {
            // Get post author
            const authorId = typeof doc.author === "object" ? doc.author.id : doc.author

            // Create notifications for new comments
            for (const comment of newCommentIds) {
              try {
                // Don't notify if user comments on their own post
                const commentAuthorId = typeof comment.author === "object" ? comment.author.id : comment.author

                if (commentAuthorId === authorId) continue

                // Get commenter details
                const commenter = await req.payload.findByID({
                  collection: "users",
                  id: commentAuthorId,
                })

                // Create notification
                await req.payload.create({
                  collection: "notifications",
                  data: {
                    recipient: authorId,
                    type: "comment",
                    title: `${commenter.name} commented on your post`,
                    message: comment.content.substring(0, 100) + (comment.content.length > 100 ? "..." : ""),
                    relatedTo: {
                      relationTo: "posts",
                      value: doc.id,
                    },
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                })

                // Check for mentions in comments
                const mentions = extractMentions(comment.content)
                if (mentions.length > 0) {
                  const mentionedUserIds = await findUserIdsByUsernames(req.payload, mentions)

                  for (const userId of mentionedUserIds) {
                    // Don't notify the post author again if they're already mentioned
                    if (userId === authorId) continue

                    await req.payload.create({
                      collection: "notifications",
                      data: {
                        recipient: userId,
                        type: "mention",
                        title: `${commenter.name} mentioned you in a comment`,
                        message: comment.content.substring(0, 100) + (comment.content.length > 100 ? "..." : ""),
                        relatedTo: {
                          relationTo: "posts",
                          value: doc.id,
                        },
                        read: false,
                        createdAt: new Date().toISOString(),
                      },
                    })
                  }
                }
              } catch (error) {
                console.error("Error creating comment notification:", error)
              }
            }
          }
        }

        return doc
      },
    ],
  },
  fields: [
    // Basic Information
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'textarea', required: true },
    { name: 'createdAt', type: 'date', defaultValue: () => new Date().toISOString() },
    { name: 'type', type: 'select', required: true, options: [
      { label: 'Post', value: 'post' },
      { label: 'Review', value: 'review' },
      { label: 'Recommendation', value: 'recommendation' },
    ]},
    { name: 'rating', type: 'number', min: 1, max: 5 },
    { name: 'image', type: 'upload', relationTo: 'media' },
    // Multiple photos support
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'location', type: 'relationship', relationTo: 'locations' },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'comments', type: 'array', minRows: 0, maxRows: 100, fields: [
      { name: 'content', type: 'textarea', required: true },
      { name: 'createdAt', type: 'date', defaultValue: () => new Date().toISOString() },
      { name: 'likeCount', type: 'number', defaultValue: 0 },
      { name: 'isLiked', type: 'checkbox', defaultValue: false },
      { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    ]},
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'status', type: 'select', options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
      { label: 'Archived', value: 'archived' },
    ], defaultValue: 'draft' },
    { name: 'visibility', type: 'select', options: [
      { label: 'Public', value: 'public' },
      { label: 'Private', value: 'private' },
      { label: 'Friends Only', value: 'friends' },
    ], defaultValue: 'public' },
    { name: 'isFeatured', type: 'checkbox', defaultValue: false },
    { name: 'isPinned', type: 'checkbox', defaultValue: false },
    { name: 'isSponsored', type: 'checkbox', defaultValue: false },
    {name: 'likes', type: 'relationship', relationTo: 'users', hasMany: true},

  ],
};