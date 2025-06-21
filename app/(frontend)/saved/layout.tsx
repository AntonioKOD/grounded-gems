import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Saved Locations | Sacavia',
  description: 'Your collection of saved places and favorite locations to visit',
  openGraph: {
    title: 'Saved Locations | Sacavia',
    description: 'Your collection of saved places and favorite locations to visit',
  },
}

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="pt-16 lg:pt-20">
      {children}
    </div>
  )
} 