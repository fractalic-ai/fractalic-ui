"use client"

import { useState } from 'react'
import GitDiffViewer from '@/components/GitDiffViewer'

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background">
      <GitDiffViewer />
    </main>
  )
}