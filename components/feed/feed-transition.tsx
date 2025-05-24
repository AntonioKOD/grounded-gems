"use client"

import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface FeedTransitionProps {
  children: ReactNode
  isLoading?: boolean
  loadingComponent?: ReactNode
  className?: string
}

export default function FeedTransition({
  children,
  isLoading = false,
  loadingComponent,
  className = "",
}: FeedTransitionProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {loadingComponent}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 