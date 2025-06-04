import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicBucketListView from './PublicBucketListView'

interface PageProps {
  params: {
    id: string
  }
}

async function getBucketList(id: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/bucket-lists/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.success ? data.bucketList : null
  } catch (error) {
    console.error('Error fetching bucket list:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const bucketList = await getBucketList(params.id)

  if (!bucketList) {
    return {
      title: 'Bucket List Not Found | Sacavia',
      description: 'The requested bucket list could not be found.',
    }
  }

  return {
    title: `${bucketList.name} | Sacavia`,
    description: bucketList.description || `Check out this amazing bucket list: ${bucketList.name}`,
    openGraph: {
      title: bucketList.name,
      description: bucketList.description || 'Discover amazing local experiences!',
      type: 'website',
      images: bucketList.coverImage?.url ? [bucketList.coverImage.url] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: bucketList.name,
      description: bucketList.description || 'Discover amazing local experiences!',
      images: bucketList.coverImage?.url ? [bucketList.coverImage.url] : [],
    },
  }
}

export default async function PublicBucketListPage({ params }: PageProps) {
  const bucketList = await getBucketList(params.id)

  if (!bucketList) {
    notFound()
  }

  // Only show public lists or lists with public items
  if (!bucketList.isPublic) {
    notFound()
  }

  return <PublicBucketListView bucketList={bucketList} />
} 