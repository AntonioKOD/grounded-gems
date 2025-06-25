'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import StructuredInsiderTips, { type StructuredTip } from './structured-insider-tips'
import SubmitInsiderTipModal from './submit-insider-tip-modal'
import { toast } from 'sonner'

interface ClientInsiderTipsProps {
  tips: StructuredTip[] | string
  locationName: string
  locationId: string
  showAddTip?: boolean
  compact?: boolean
}

export default function ClientInsiderTips({
  tips,
  locationName,
  locationId,
  showAddTip = true,
  compact = false
}: ClientInsiderTipsProps) {
  const { user } = useAuth()
  const [isSubmitTipModalOpen, setIsSubmitTipModalOpen] = useState(false)
  const [refreshTips, setRefreshTips] = useState(0)

  const handleTipSubmissionSuccess = () => {
    // Refresh the tips by triggering a re-fetch
    setRefreshTips(prev => prev + 1)
    toast.success("Your tip has been submitted and will appear after review!")
  }

  return (
    <>
      <StructuredInsiderTips
        tips={tips}
        locationName={locationName}
        locationId={locationId}
        showAddTip={showAddTip}
        onAddTip={() => setIsSubmitTipModalOpen(true)}
        compact={compact}
        currentUser={user}
      />

      <SubmitInsiderTipModal
        isOpen={isSubmitTipModalOpen}
        onClose={() => setIsSubmitTipModalOpen(false)}
        locationId={locationId}
        locationName={locationName}
        onSuccess={handleTipSubmissionSuccess}
      />
    </>
  )
} 