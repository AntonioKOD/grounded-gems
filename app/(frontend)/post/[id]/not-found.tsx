import Link from "next/link"
import { FileQuestion } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function PostNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <FileQuestion className="h-8 w-8 text-gray-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
      <p className="text-gray-600 mb-6">
        The post you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild>
          <Link href="/feed">Return to Feed</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
