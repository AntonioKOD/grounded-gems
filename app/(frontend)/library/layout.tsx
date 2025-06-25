import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Library | Sacavia',
  description: 'Access all your purchased travel guides in one place. Read, review, and organize your guide collection.',
  keywords: ['travel guides', 'library', 'purchased guides', 'travel collection'],
}

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 