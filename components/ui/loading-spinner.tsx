import { Loader2 } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
        <p className="text-sm text-white/60">Loading...</p>
      </div>
    </div>
  )
} 