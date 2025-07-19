/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionConfig } from 'payload';
import { extractMentions, findUserIdsByUsernames } from '../payload-utils/notification-helpers';

const normalizeId = (val: string | { id?: string; _id?: string } | null | undefined): string => {
  if (typeof val === 'string') return val;
  if (val?.id) return val.id;
  if (val?._id) return val._id;
  throw new Error(`Unable to normalize ID from value: ${JSON.stringify(val)}`);
};

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
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
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // Auto-update engagement counts when arrays change
        if (operation === 'create' || operation === 'update') {
          // Update like count based on likes array
          if (Array.isArray(data.likes)) {
            data.likeCount = data.likes.length
          }
          
          // Update comment count based on comments array
          if (Array.isArray(data.comments)) {
            data.commentCount = data.comments.length
          }
          
          // Update save count based on savedBy array
          if (Array.isArray(data.savedBy)) {
            data.saveCount = data.savedBy.length
          }
        }
        
        return data
      }
    ],
    afterChange: [
      async ({ req, doc, previousDoc, operation }) => {
        if (!req.payload) return doc;

        // --- Handle new post creation (mentions and video thumbnails) ---
        if (operation === 'create') {
          // Handle mentions
          const mentions = extractMentions(doc.content);
          if (mentions.length) {
            const mentionedUserIds = await findUserIdsByUsernames(req.payload, mentions);
            const author = typeof doc.author === 'object'
              ? doc.author
              : await req.payload.findByID({ collection: 'users', id: normalizeId(doc.author) });

            for (const userId of mentionedUserIds) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: userId,
                  type: 'mention',
                  title: `${author.name} mentioned you in a post`,
                  message: doc.content.slice(0, 100) + (doc.content.length > 100 ? '...' : ''),
                  relatedTo: { relationTo: 'posts', value: doc.id },
                  read: false,
                },
              });
            }
          }

          // Handle video thumbnail generation
          if (doc.video && !doc.videoThumbnail) {
            try {
              console.log('🎬 Posts: Processing video for thumbnail generation:', doc.id)
              console.log('🎬 Posts: Video ID:', doc.video)
              
              // Get the video media document
              const videoDoc = await req.payload.findByID({
                collection: 'media',
                id: normalizeId(doc.video),
              })
              
              console.log('🎬 Posts: Video document found:', {
                id: videoDoc?.id,
                isVideo: videoDoc?.isVideo,
                hasThumbnail: !!videoDoc?.videoThumbnail,
                filename: videoDoc?.filename
              })
              
              if (videoDoc && videoDoc.isVideo) {
                // Check if video already has a thumbnail
                if (videoDoc.videoThumbnail) {
                  console.log('🎬 Posts: Video already has thumbnail, linking to post')
                  // Update the post with the video's thumbnail
                  await req.payload.update({
                    collection: 'posts',
                    id: doc.id,
                    data: {
                      videoThumbnail: videoDoc.videoThumbnail,
                    },
                  })
                  console.log('🎬 Posts: Post updated with video thumbnail')
                } else {
                  console.log('🎬 Posts: Video has no thumbnail, generating one')
                  // Generate thumbnail for the video
                  const { generateVideoThumbnailManually } = await import('@/lib/video-thumbnail-generator')
                  const thumbnailId = await generateVideoThumbnailManually(videoDoc, req.payload)
                  
                  if (thumbnailId) {
                    console.log('🎬 Posts: Thumbnail generated, linking to post')
                    // Update the post with the new thumbnail
                    await req.payload.update({
                      collection: 'posts',
                      id: doc.id,
                      data: {
                        videoThumbnail: thumbnailId,
                      },
                    })
                    console.log('🎬 Posts: Post updated with generated thumbnail')
                  } else {
                    console.log('🎬 Posts: Thumbnail generation failed')
                  }
                }
              } else {
                console.log('🎬 Posts: Video document not found or not marked as video')
              }
            } catch (error) {
              console.error('🎬 Posts: Error processing video thumbnail:', error)
            }
          } else {
            console.log('🎬 Posts: No video processing needed:', {
              hasVideo: !!doc.video,
              hasThumbnail: !!doc.videoThumbnail
            })
          }
          
          return doc;
        }

        // --- Handle post updates (likes and comments) ---
        if (operation === 'update' && previousDoc) {
          // Normalize author ID
          const authorId = normalizeId(doc.author);

          // Likes notifications
          const prevLikeIds = (previousDoc.likes || []).map(normalizeId);
          const newLikeIds  = (doc.likes         || []).map(normalizeId);
          const addedLikes = newLikeIds.filter((id: any) => !prevLikeIds.includes(id));

          for (const likerId of addedLikes) {
            if (likerId === authorId) continue;
            try {
              const liker = await req.payload.findByID({ collection: 'users', id: likerId });
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: authorId,
                  type: 'like',
                  title: `${liker.name} liked your post`,
                  message: doc.title || doc.content.slice(0, 100),
                  relatedTo: { relationTo: 'posts', value: doc.id },
                  read: false,
                },
              });
            } catch (err) {
              req.payload.logger.error('Error creating like notification:', err);
            }
          }

          // Comments notifications
          const prevComments = previousDoc.comments || [];
          const newComments  = doc.comments         || [];
          const addedComments = newComments.filter(
            (            newC: { id: any; }) => !prevComments.some((prevC: { id: any; }) => normalizeId(prevC.id || prevC) === normalizeId(newC.id || newC))
          );

          for (const comment of addedComments) {
            const commentAuthorId = normalizeId((comment as any).author);
            if (commentAuthorId === authorId) continue;
            try {
              const commenter = await req.payload.findByID({ collection: 'users', id: commentAuthorId });
              // Comment notification
              await req.payload.create({
                collection: 'notifications',
                data: {
                  recipient: authorId,
                  type: 'comment',
                  title: `${commenter.name} commented on your post`,
                  message: (comment as any).content.slice(0, 100) + (((comment as any).content || '').length > 100 ? '...' : ''),
                  relatedTo: { relationTo: 'posts', value: doc.id },
                  read: false,
                },
              });

              // Mentions in comment
              const mentions = extractMentions((comment as any).content);
              if (mentions.length) {
                const mentionedUserIds = await findUserIdsByUsernames(req.payload, mentions);
                for (const userId of mentionedUserIds) {
                  if (userId === authorId) continue;
                  await req.payload.create({
                    collection: 'notifications',
                    data: {
                      recipient: userId,
                      type: 'mention',
                      title: `${commenter.name} mentioned you in a comment`,
                      message: (comment as any).content.slice(0, 100) + (((comment as any).content || '').length > 100 ? '...' : ''),
                      relatedTo: { relationTo: 'posts', value: doc.id },
                      read: false,
                    },
                  });
                }
              }
            } catch (err) {
              req.payload.logger.error('Error creating comment notification:', err);
            }
          }
        }

        return doc;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text'},
    { name: 'content', type: 'textarea', required: true },
    { name: 'createdAt', type: 'date', defaultValue: () => new Date().toISOString() },
    { name: 'type', type: 'select', required: true, options: [
        { label: 'Post', value: 'post' },
        { label: 'Review', value: 'review' },
        { label: 'Recommendation', value: 'recommendation' },
    ]},
    { name: 'rating', type: 'number', min: 1, max: 5 },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'videoThumbnail', type: 'upload', relationTo: 'media' },
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
    { name: 'likes', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'likeCount', type: 'number', defaultValue: 0 },
    { name: 'commentCount', type: 'number', defaultValue: 0 },
    { name: 'shareCount', type: 'number', defaultValue: 0 },
    { name: 'savedBy', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'saveCount', type: 'number', defaultValue: 0 },
    
    // Related Content Relationships
    { 
      name: 'relatedGuide', 
      type: 'relationship', 
      relationTo: 'guides',
      admin: {
        description: 'Guide that this post is related to or reviewing'
      }
    },
    { 
      name: 'relatedEvent', 
      type: 'relationship', 
      relationTo: 'events',
      admin: {
        description: 'Event that this post is about or promoting'
      }
    },
    { 
      name: 'relatedReview', 
      type: 'relationship', 
      relationTo: 'reviews',
      admin: {
        description: 'Review that this post is connected to'
      }
    },
    { 
      name: 'relatedSpecial', 
      type: 'relationship', 
      relationTo: 'specials',
      admin: {
        description: 'Special offer that this post is promoting'
      }
    },
  ],
};
