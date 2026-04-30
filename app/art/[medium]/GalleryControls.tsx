'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Props {
  currentSort: 'newest' | 'liked' | 'order'
  currentTag: string | null
  allTags: string[]
}

export default function GalleryControls({
  currentSort,
  currentTag,
  allTags,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null) next.delete(key)
    else next.set(key, value)
    const qs = next.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const sortLabel: Record<typeof currentSort, string> = {
    newest: 'NEWEST FIRST',
    liked: 'MOST LIKED',
    order: 'MANUAL ORDER',
  }

  return (
    <div style={{
      background: '#fff',
      border: '2px inset #888',
      padding: '6px 8px',
      marginBottom: 14,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      alignItems: 'center',
      fontFamily: 'Courier New, monospace',
      fontSize: 12,
    }}>
      {/* Sort */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span className="label" style={{ fontSize: 11, color: '#666', marginRight: 4 }}>SORT:</span>
        {(['newest', 'liked', 'order'] as const).map(s => (
          <button
            key={s}
            onClick={() => setParam('sort', s === 'newest' ? null : s)}
            style={{
              fontSize: 11,
              padding: '0 6px',
              fontWeight: currentSort === s ? 'bold' : 'normal',
              background: currentSort === s ? '#ffff99' : undefined,
            }}
          >
            {sortLabel[s]}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="label" style={{ fontSize: 11, color: '#666', marginRight: 4 }}>TAG:</span>
          <button
            onClick={() => setParam('tag', null)}
            style={{
              fontSize: 11,
              padding: '0 6px',
              fontWeight: !currentTag ? 'bold' : 'normal',
              background: !currentTag ? '#ffff99' : undefined,
            }}
          >
            ALL
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setParam('tag', tag === currentTag ? null : tag)}
              style={{
                fontSize: 11,
                padding: '0 6px',
                fontWeight: currentTag === tag ? 'bold' : 'normal',
                background: currentTag === tag ? '#ffff99' : undefined,
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
