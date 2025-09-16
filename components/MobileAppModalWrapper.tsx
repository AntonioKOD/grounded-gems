'use client'

import MobileAppDownloadModal, { useMobileAppModal } from './MobileAppDownloadModal'

export default function MobileAppModalWrapper() {
  const modalProps = useMobileAppModal()
  
  return <MobileAppDownloadModal {...modalProps} />
}


