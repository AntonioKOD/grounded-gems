"use client"

import dynamic from 'next/dynamic'

const FloatingActionButtonMenu = dynamic(() => import('@/components/ui/FloatingActionButtonMenu'), {
  ssr: false,
})

export default function ClientFloatingActionButtonMenu() {
  return <FloatingActionButtonMenu />
} 