'use client'

import { useState } from 'react'

interface DeleteButtonProps {
  onDelete: () => Promise<void>
  label?: string
  confirm?: string
}

export default function DeleteButton({
  onDelete,
  label = 'delete',
  confirm: confirmText = 'sure?',
}: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    setLoading(true)
    await onDelete()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`font-mono text-xs transition-colors disabled:opacity-50 ${
        confirming
          ? 'text-red-400 hover:text-red-300'
          : 'text-stone-600 hover:text-red-400'
      }`}
    >
      {loading ? 'deleting…' : confirming ? confirmText : label}
    </button>
  )
}
