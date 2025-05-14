/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useRef, useEffect, useState, type ReactNode } from "react"
import { useInView } from "react-intersection-observer"

interface VirtualScrollProps {
  items: any[]
  renderItem: (item: any, index: number) => ReactNode
  itemHeight?: number
  loadMore?: () => Promise<void>
  hasMore?: boolean
  loadingIndicator?: ReactNode
  className?: string
  threshold?: number
  rootMargin?: string
}

export function VirtualScroll({
  items,
  renderItem,
  loadMore,
  hasMore = false,
  loadingIndicator,
  className = "",
  threshold = 0.5,
  rootMargin = "0px 0px 200px 0px",
}: VirtualScrollProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadingRef = useRef<HTMLDivElement>(null)
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
  })

  useEffect(() => {
    const handleLoadMore = async () => {
      if (inView && hasMore && loadMore && !isLoadingMore) {
        setIsLoadingMore(true)
        try {
          await loadMore()
        } finally {
          setIsLoadingMore(false)
        }
      }
    }

    handleLoadMore()
  }, [inView, hasMore, loadMore, isLoadingMore])

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={item.id || index} className="virtual-scroll-item">
          {renderItem(item, index)}
        </div>
      ))}

      {(hasMore || isLoadingMore) && (
        <div ref={ref} className="py-4 flex justify-center">
          {loadingIndicator || (
            <div className="h-6 w-6 border-2 border-t-transparent border-[#FF6B6B] rounded-full animate-spin"></div>
          )}
        </div>
      )}
    </div>
  )
}
