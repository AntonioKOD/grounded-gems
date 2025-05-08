
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: ({ user }) => 
        `Welcome to Grounded Gems, please verify ${user.email}`,   // Custom subject  [oai_citation:14‡Payload](https://payloadcms.com/docs/authentication/email?utm_source=chatgpt.com)
      generateEmailHTML: ({ req, token, user }) => {
        const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;
        return `
          <html>
            <body>
              <h1>Hello, ${user.email}!</h1>
              <p>Click below to verify your account:</p>
              <a href="${url}">${url}</a>
            </body>
          </html>`;
      },   // Custom HTML  [oai_citation:15‡Payload](https://payloadcms.com/docs/authentication/email?utm_source=chatgpt.com)
    },
  },
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'state',
          type: 'text',
        },
        {
          name: 'country',
          type: 'text',
        },
      ],
    },
    {
      name: 'interests',
      type: 'array',
      fields: [
        {
          name: 'interest',
          type: 'text',
        },
      ],
    },
    {
      name: 'isCreator',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'creatorLevel',
      type: 'select',
      options: [
        { label: 'Local Explorer', value: 'explorer' },
        { label: 'Hidden Gem Hunter', value: 'hunter' },
        { label: 'Local Authority', value: 'authority' },
        { label: 'Destination Expert', value: 'expert' },
      ],
      admin: {
        condition: (data) => data.isCreator,
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'Instagram', value: 'instagram' },
            { label: 'Twitter', value: 'twitter' },
            { label: 'TikTok', value: 'tiktok' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Website', value: 'website' },
          ],
        },
        {
          name: 'url',
          type: 'text',
        },
      ],
    },
  ],
};
