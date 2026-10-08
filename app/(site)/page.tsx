import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HOME } from '@/lib/content'

export default async function Home() {
  const supabase = await createClient()
  const year = new Date().getFullYear()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, slug, published_at, blog_clusters(slug)')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(5)

  return (
    <div>
      {/* WELCOME WINDOW */}
      <div className="window mb-6">
        <div className="window-titlebar">
          <span>{HOME.windowTitle}</span>
          <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
        </div>
        <div className="window-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <h1 style={{
            fontFamily: 'Times New Roman, serif',
            fontSize: 36,
            fontWeight: 'bold',
            margin: 0,
            color: 'var(--accent)',
            textShadow: '2px 2px 0 #fff, 3px 3px 0 var(--bevel-dark)',
            letterSpacing: 2,
          }}>
            {HOME.headline}
          </h1>
          <p className="label" style={{ fontSize: 12, marginTop: 8, color: 'var(--ink)' }}>
            {HOME.established.replace('{year}', String(year))}
          </p>
          <p style={{ marginTop: 14, fontSize: 15, fontStyle: 'italic' }}>
            {HOME.tagline}
          </p>
          {HOME.hazardBanner && (
            <p style={{ marginTop: 12 }}>
              <span className="under-construction">{HOME.hazardBanner}</span>
            </p>
          )}
        </div>
      </div>

      {/* NAV TABLE */}
      <div className="window mb-6">
        <div className="window-titlebar">
          <span>{HOME.navWindowTitle}</span>
        </div>
        <div className="window-body" style={{ padding: '12px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {HOME.navItems.map(({ href, label, desc, icon }) => (
                <tr key={href} style={{ borderBottom: '1px dotted #888' }}>
                  <td style={{ padding: '8px 4px', width: 32, textAlign: 'center', fontSize: 18 }}>{icon}</td>
                  <td style={{ padding: '8px 4px', width: 130 }}>
                    <Link href={href} className="label" style={{ fontWeight: 'bold', fontSize: 14 }}>
                      ► {label}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 4px', fontStyle: 'italic', color: '#444' }}>
                    {desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT POSTS */}
      {posts && posts.length > 0 && (
        <div className="window mb-6">
          <div className="window-titlebar">
            <span>{HOME.recentWindowTitle}</span>
          </div>
          <div className="window-body">
            <p className="label" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8 }}>
              {HOME.recentSectionLabel}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {posts.map(post => {
                const clusterSlug = (post.blog_clusters as { slug: string } | null)?.slug ?? 'uncategorized'
                return (
                  <li key={post.slug} style={{ padding: '4px 0', borderBottom: '1px dotted #aaa' }}>
                    <span style={{ color: 'var(--accent)', marginRight: 6 }}>•</span>
                    <Link href={`/blog/${clusterSlug}/${post.slug}`}>{post.title}</Link>
                    {post.published_at && (
                      <span style={{ float: 'right', fontFamily: 'Courier New, monospace', fontSize: 12, color: '#666' }}>
                        {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {HOME.visitorCounterLabel && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span style={{
            fontFamily: 'Courier New, monospace',
            background: '#000', color: '#0f0',
            padding: '4px 12px',
            border: '2px inset #888',
            fontSize: 13,
            letterSpacing: 2,
          }}>
            {HOME.visitorCounterLabel}: 000{Math.floor(Math.random() * 900) + 100}
          </span>
        </div>
      )}
    </div>
  )
}
