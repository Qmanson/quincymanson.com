import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import Link from 'next/link'
import NewClusterForm from './NewClusterForm'
import NewPostQuickForm from './NewPostQuickForm'
import { BLOG } from '@/lib/content'

export default async function BlogPage() {
  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: clusters } = await supabase
    .from('blog_clusters')
    .select('*')
    .order('sort_order')

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*, blog_clusters(slug)')
    .eq('published', true)
    .order('published_at', { ascending: false })

  const uncategorized = posts?.filter(p => !p.cluster_id) ?? []

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>{BLOG.windowTitle}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 style={{
            fontFamily: 'Times New Roman, serif',
            fontSize: 30,
            fontWeight: 'bold',
            color: 'var(--accent)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            {BLOG.pageHeading}
          </h1>
          {admin && <NewPostQuickForm clusters={clusters ?? []} />}
        </div>

        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '8px 0 20px' }} />

        {/* Cluster sections */}
        {clusters?.map(cluster => {
          const clusterPosts = posts?.filter(p => p.cluster_id === cluster.id) ?? []
          return (
            <section key={cluster.id} style={{ marginBottom: 28 }}>
              <Link
                href={`/blog/${cluster.slug}`}
                className="label"
                style={{ fontWeight: 'bold', fontSize: 14, color: 'var(--ink)' }}
              >
                ▸ {cluster.name.toUpperCase()} ({clusterPosts.length})
              </Link>
              {clusterPosts.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: '6px 0 0 16px', margin: 0 }}>
                  {clusterPosts.map(post => {
                    const clusterSlug = (post.blog_clusters as { slug: string } | null)?.slug ?? 'uncategorized'
                    return (
                      <li key={post.id} style={{ padding: '3px 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span>
                          <span style={{ color: 'var(--accent)', marginRight: 6 }}>▪</span>
                          <Link href={`/blog/${clusterSlug}/${post.slug}`}>{post.title}</Link>
                        </span>
                        <span style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#666', flexShrink: 0 }}>
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p style={{ paddingLeft: 16, fontStyle: 'italic', color: '#777', fontSize: 14 }}>{BLOG.emptyClusterShort}</p>
              )}
            </section>
          )
        })}

        {uncategorized.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <p className="label" style={{ fontWeight: 'bold', fontSize: 14 }}>
              ▸ {BLOG.uncategorizedLabel} ({uncategorized.length})
            </p>
            <ul style={{ listStyle: 'none', padding: '6px 0 0 16px', margin: 0 }}>
              {uncategorized.map(post => (
                <li key={post.id} style={{ padding: '3px 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>
                    <span style={{ color: 'var(--accent)', marginRight: 6 }}>▪</span>
                    <Link href={`/blog/uncategorized/${post.slug}`}>{post.title}</Link>
                  </span>
                  <span style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#666', flexShrink: 0 }}>
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(!clusters || clusters.length === 0) && uncategorized.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#777' }}>{BLOG.emptyAll}</p>
        )}

        {admin && (
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px dashed #888' }}>
            <NewClusterForm />
          </div>
        )}
      </div>
    </div>
  )
}
