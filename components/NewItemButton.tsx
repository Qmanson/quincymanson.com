interface NewItemButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export default function NewItemButton({
  onClick,
  label = '+ new',
  className = '',
}: NewItemButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-xs text-stone-600 hover:text-stone-300 border border-dashed border-stone-700 hover:border-stone-500 px-3 py-1.5 rounded transition-colors ${className}`}
    >
      {label}
    </button>
  )
}
